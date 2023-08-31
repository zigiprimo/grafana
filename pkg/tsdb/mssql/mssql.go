package mssql

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	mssql "github.com/microsoft/go-mssqldb"
	_ "github.com/microsoft/go-mssqldb/integratedauth/krb5"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/tsdb/sqleng"
	"github.com/grafana/grafana/pkg/util"
)

var logger = log.New("tsdb.mssql")

type KerberosLookup struct {
	User                    string `json:"user"`
	DBName                  string `json:"database"`
	Address                 string `json:"address"`
	CredentialCacheFilename string `json:"credentialCache"`
}

type Service struct {
	im instancemgmt.InstanceManager
}

func ProvideService(cfg *setting.Cfg) *Service {
	return &Service{
		im: datasource.NewInstanceManager(newInstanceSettings(cfg)),
	}
}

func (s *Service) getDataSourceHandler(pluginCtx backend.PluginContext) (*sqleng.DataSourceHandler, error) {
	i, err := s.im.Get(pluginCtx)
	if err != nil {
		return nil, err
	}
	instance := i.(*sqleng.DataSourceHandler)
	return instance, nil
}

func (s *Service) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	dsHandler, err := s.getDataSourceHandler(req.PluginContext)
	if err != nil {
		return nil, err
	}
	return dsHandler.QueryData(ctx, req)
}

func newInstanceSettings(cfg *setting.Cfg) datasource.InstanceFactoryFunc {
	return func(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
		jsonData := sqleng.JsonData{
			MaxOpenConns:      cfg.SqlDatasourceMaxOpenConnsDefault,
			MaxIdleConns:      cfg.SqlDatasourceMaxIdleConnsDefault,
			ConnMaxLifetime:   cfg.SqlDatasourceMaxConnLifetimeDefault,
			Encrypt:           "false",
			ConnectionTimeout: 0,
			SecureDSProxy:     false,
		}

		err := json.Unmarshal(settings.JSONData, &jsonData)
		if err != nil {
			return nil, fmt.Errorf("error reading settings: %w", err)
		}

		database := jsonData.Database
		if database == "" {
			database = settings.Database
		}

		dsInfo := sqleng.DataSourceInfo{
			JsonData:                jsonData,
			URL:                     settings.URL,
			User:                    settings.User,
			Database:                database,
			ID:                      settings.ID,
			Updated:                 settings.Updated,
			UID:                     settings.UID,
			DecryptedSecureJSONData: settings.DecryptedSecureJSONData,
		}
		cnnstr, err := generateConnectionString(dsInfo)
		if err != nil {
			return nil, err
		}

		if cfg.Env == setting.Dev {
			logger.Debug("GetEngine", "connection", cnnstr)
		}

		driverName := "mssql"
		// register a new proxy driver if the secure socks proxy is enabled
		if cfg.IsFeatureToggleEnabled(featuremgmt.FlagSecureSocksDatasourceProxy) && cfg.SecureSocksDSProxy.Enabled && jsonData.SecureDSProxy {
			driverName, err = createMSSQLProxyDriver(&cfg.SecureSocksDSProxy, cnnstr)
			if err != nil {
				return nil, err
			}
		}

		config := sqleng.DataPluginConfiguration{
			DriverName:        driverName,
			ConnectionString:  cnnstr,
			DSInfo:            dsInfo,
			MetricColumnTypes: []string{"VARCHAR", "CHAR", "NVARCHAR", "NCHAR"},
			RowLimit:          cfg.DataProxyRowLimit,
		}

		queryResultTransformer := mssqlQueryResultTransformer{}

		return sqleng.NewQueryDataHandler(config, &queryResultTransformer, newMssqlMacroEngine(), logger)
	}
}

// ParseURL tries to parse an MSSQL URL string into a URL object.
func ParseURL(u string) (*url.URL, error) {
	logger.Debug("Parsing MSSQL URL", "url", u)

	// Recognize ODBC connection strings like host\instance:1234
	reODBC := regexp.MustCompile(`^[^\\:]+(?:\\[^:]+)?(?::\d+)?(?:;.+)?$`)
	var host string
	switch {
	case reODBC.MatchString(u):
		logger.Debug("Recognized as ODBC URL format", "url", u)
		host = u
	default:
		logger.Debug("Couldn't recognize as valid MSSQL URL", "url", u)
		return nil, fmt.Errorf("unrecognized MSSQL URL format: %q", u)
	}
	return &url.URL{
		Scheme: "sqlserver",
		Host:   host,
	}, nil
}

func generateConnectionString(dsInfo sqleng.DataSourceInfo) (string, error) {
	const dfltPort = "0"
	var addr util.NetworkAddress
	if dsInfo.URL != "" {
		u, err := ParseURL(dsInfo.URL)
		if err != nil {
			return "", err
		}
		addr, err = util.SplitHostPortDefault(u.Host, "localhost", dfltPort)
		if err != nil {
			return "", err
		}
	} else {
		addr = util.NetworkAddress{
			Host: "localhost",
			Port: dfltPort,
		}
	}

	args := []interface{}{
		"url", dsInfo.URL, "host", addr.Host,
	}
	if addr.Port != "0" {
		args = append(args, "port", addr.Port)
	}
	logger.Debug("Generating connection string", args...)

	encrypt := dsInfo.JsonData.Encrypt
	tlsSkipVerify := dsInfo.JsonData.TlsSkipVerify
	hostNameInCertificate := dsInfo.JsonData.Servername
	certificate := dsInfo.JsonData.RootCertFile
	connStr := fmt.Sprintf("server=%s;database=%s;user id=%s;password=%s;",
		addr.Host,
		dsInfo.Database,
		dsInfo.User,
		dsInfo.DecryptedSecureJSONData["password"],
	)

	isKrb5Enabled, krb5DriverParams := Krb5ParseAuthCredentials(addr.Host, addr.Port, dsInfo.Database, dsInfo.User, dsInfo.DecryptedSecureJSONData["password"])

	if isKrb5Enabled {
		connStr = krb5DriverParams
	}

	// Port number 0 means to determine the port automatically, so we can let the driver choose
	if addr.Port != "0" {
		connStr += fmt.Sprintf("port=%s;", addr.Port)
	}
	if encrypt == "true" {
		connStr += fmt.Sprintf("encrypt=%s;TrustServerCertificate=%t;", encrypt, tlsSkipVerify)
		if hostNameInCertificate != "" {
			connStr += fmt.Sprintf("hostNameInCertificate=%s;", hostNameInCertificate)
		}

		if certificate != "" {
			connStr += fmt.Sprintf("certificate=%s;", certificate)
		}
	} else if encrypt == "disable" {
		connStr += fmt.Sprintf("encrypt=%s;", dsInfo.JsonData.Encrypt)
	}

	if dsInfo.JsonData.ConnectionTimeout != 0 {
		connStr += fmt.Sprintf("connection timeout=%d;", dsInfo.JsonData.ConnectionTimeout)
	}

	return connStr, nil
}

type mssqlQueryResultTransformer struct{}

func (t *mssqlQueryResultTransformer) TransformQueryError(logger log.Logger, err error) error {
	// go-mssql overrides source error, so we currently match on string
	// ref https://github.com/denisenkom/go-mssqldb/blob/045585d74f9069afe2e115b6235eb043c8047043/tds.go#L904
	if strings.HasPrefix(strings.ToLower(err.Error()), "unable to open tcp connection with host") {
		logger.Error("Query error", "error", err)
		return sqleng.ErrConnectionFailed
	}

	return err
}

// CheckHealth pings the connected SQL database
func (s *Service) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	dsHandler, err := s.getDataSourceHandler(req.PluginContext)
	if err != nil {
		return nil, err
	}

	err = dsHandler.Ping()

	if err != nil {
		return &backend.CheckHealthResult{Status: backend.HealthStatusError, Message: dsHandler.TransformQueryError(logger, err).Error()}, nil
	}

	return &backend.CheckHealthResult{Status: backend.HealthStatusOk, Message: "Database Connection OK"}, nil
}

func (t *mssqlQueryResultTransformer) GetConverterList() []sqlutil.StringConverter {
	return []sqlutil.StringConverter{
		{
			Name:           "handle MONEY",
			InputScanKind:  reflect.Slice,
			InputTypeName:  "MONEY",
			ConversionFunc: func(in *string) (*string, error) { return in, nil },
			Replacer: &sqlutil.StringFieldReplacer{
				OutputFieldType: data.FieldTypeNullableFloat64,
				ReplaceFunc: func(in *string) (interface{}, error) {
					if in == nil {
						return nil, nil
					}
					v, err := strconv.ParseFloat(*in, 64)
					if err != nil {
						return nil, err
					}
					return &v, nil
				},
			},
		},
		{
			Name:           "handle SMALLMONEY",
			InputScanKind:  reflect.Slice,
			InputTypeName:  "SMALLMONEY",
			ConversionFunc: func(in *string) (*string, error) { return in, nil },
			Replacer: &sqlutil.StringFieldReplacer{
				OutputFieldType: data.FieldTypeNullableFloat64,
				ReplaceFunc: func(in *string) (interface{}, error) {
					if in == nil {
						return nil, nil
					}
					v, err := strconv.ParseFloat(*in, 64)
					if err != nil {
						return nil, err
					}
					return &v, nil
				},
			},
		},
		{
			Name:           "handle DECIMAL",
			InputScanKind:  reflect.Slice,
			InputTypeName:  "DECIMAL",
			ConversionFunc: func(in *string) (*string, error) { return in, nil },
			Replacer: &sqlutil.StringFieldReplacer{
				OutputFieldType: data.FieldTypeNullableFloat64,
				ReplaceFunc: func(in *string) (interface{}, error) {
					if in == nil {
						return nil, nil
					}
					v, err := strconv.ParseFloat(*in, 64)
					if err != nil {
						return nil, err
					}
					return &v, nil
				},
			},
		},
		{
			Name:           "handle UNIQUEIDENTIFIER",
			InputScanKind:  reflect.Slice,
			InputTypeName:  "UNIQUEIDENTIFIER",
			ConversionFunc: func(in *string) (*string, error) { return in, nil },
			Replacer: &sqlutil.StringFieldReplacer{
				OutputFieldType: data.FieldTypeNullableString,
				ReplaceFunc: func(in *string) (interface{}, error) {
					if in == nil {
						return nil, nil
					}
					uuid := &mssql.UniqueIdentifier{}
					if err := uuid.Scan([]byte(*in)); err != nil {
						return nil, err
					}
					v := uuid.String()
					return &v, nil
				},
			},
		},
	}
}

func Krb5ParseAuthCredentials(host string, port string, db string, user string, pass string) (bool, string) {
	//Custom envs that may be used as params for driver conn str
	//More details: https://github.com/microsoft/go-mssqldb#kerberos-active-directory-authentication-outside-windows
	enableKrb5 := os.Getenv("KRB5_MSSQL_ENABLE")

	if enableKrb5 == "" {
		return false, ""
	}

	krb5Realm := os.Getenv("KRB5_REALM")
	krb5UdpPreferenceLimit := os.Getenv("KRB5_UDP_PREFERENCE_LIMIT")
	krb5CCLookupFile := os.Getenv("KRB5_CC_LOOKUP_FILE")
	krb5DNSLookupKDC := os.Getenv("KRB5_DNS_LOOKUP_KDC")

	//These are actual kerberos env vars
	krb5Config := os.Getenv("KRB5_CONFIG")
	krb5ClientKeytabFile := os.Getenv("KRB5_CLIENT_KTNAME")

	// get the credential cache in the environment
	krb5CacheCredsFile := os.Getenv("KRB5CCNAME")

	// if there is a lookup file specified, use it to find the correct credential cache file and overwrite var
	// getCredentialCacheFromLookup implementation taken from mysql kerberos solution - https://github.com/grafana/mysql/commit/b5e73c8d536150c054d310123643683d3b18f0da
	if krb5CCLookupFile != "" {
		krb5CacheCredsFile = getCredentialCacheFromLookup(krb5CCLookupFile, host, port, db, user)
	}

	if krb5Config == "" {
		//if env var empty, use default
		krb5Config = "/etc/krb5.conf"
	}

	krb5DriverParams := fmt.Sprintf("authenticator=krb5;krb5-configfile=%s;", krb5Config)

	// There are 3 main connection types:
	// - credentials cache
	// - user, realm, keytab
	// - realm, user, pass
	if krb5CacheCredsFile != "" {
		krb5DriverParams += fmt.Sprintf("server=%s;database=%s;krb5-credcachefile=%s;", host, db, krb5CacheCredsFile)
	} else if krb5Realm != "" && krb5ClientKeytabFile != "" {
		krb5DriverParams += fmt.Sprintf("server=%s;database=%s;user id=%s;krb5-realm=%s;krb5-keytabfile=%s;", host, db, user, krb5Realm, krb5ClientKeytabFile)
	} else if krb5Realm != "" && krb5ClientKeytabFile == "" {
		krb5DriverParams += fmt.Sprintf("server=%s;database=%s;user id=%s;password=%s;krb5-realm=%s;", host, db, user, pass, krb5Realm)
	} else {
		logger.Error("invalid kerberos configuration")
		return false, ""
	}

	if krb5UdpPreferenceLimit != "" {
		krb5DriverParams += "krb5-udppreferencelimit=" + krb5UdpPreferenceLimit + ";"
	}

	if krb5DNSLookupKDC != "" {
		krb5DriverParams += "krb5-dnslookupkdc=" + krb5DNSLookupKDC + ";"
	}

	logger.Info(fmt.Sprintf("final krb connstr: %s", krb5DriverParams))

	return true, krb5DriverParams
}

func getCredentialCacheFromLookup(lookupFile string, host string, port string, dbName string, user string) string {
	logger.Info(fmt.Sprintf("reading credential cache lookup: %s", lookupFile))
	content, err := os.ReadFile(lookupFile)
	if err != nil {
		logger.Error(fmt.Sprintf("error reading: %s, %v", lookupFile, err))
		return ""
	}
	var lookups []KerberosLookup
	err = json.Unmarshal(content, &lookups)
	if err != nil {
		logger.Error(fmt.Sprintf("error parsing: %s, %v", lookupFile, err))
		return ""
	}
	// find cache file
	for _, item := range lookups {
		if item.Address == host+":"+port && item.DBName == dbName && item.User == user {
			logger.Info(fmt.Sprintf("matched: %+v", item))
			return item.CredentialCacheFilename
		}
	}
	logger.Error(fmt.Sprintf("no match found for %s", host+":"+port))
	return os.Getenv("KRB5CCNAME")
}
