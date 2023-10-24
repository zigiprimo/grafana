package authimpl

import (
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/auth"
	"github.com/grafana/grafana/pkg/setting"
)

var fieldsToEncrypt = []string{"client_secret"}

type AuthSettings struct {
	// sqlStore db.DB
	cfg *setting.Cfg
	log log.Logger

	reloadableProviders map[string]auth.Reloadable
	store               map[string]map[string]interface{}
}

func ProvideAuthSettings(cfg *setting.Cfg) auth.AuthSettingsService {
	return &AuthSettings{
		cfg:   cfg,
		log:   log.New("auth.settings"),
		store: make(map[string]map[string]interface{}),
	}
}

func (s *AuthSettings) GetAuthSettingsForProvider(provider string, strategy auth.FallbackStrategy) (map[string]interface{}, error) {
	// Check the DB if there is any settings for the provider which is not deleted
	// If there is, then Unmarshall the settings to map[string]interface{} and return it
	if _, ok := s.store[provider]; ok {
		return s.store[provider], nil
	}
	// return map[string]interface{}{
	// 	"enabled":     true,
	// 	"allowSignUp": true,
	// }, nil

	// systemSettings := s.cfg.SectionWithEnvOverrides("auth." + provider)

	// typ := reflect.TypeOf(social.OAuthInfo{})
	// settings := make(map[string]interface{}, typ.NumField())
	// for i := 0; i < typ.NumField(); i++ {
	// 	field := typ.Field(i)
	// 	fieldName := field.Tag.Get("toml")
	// 	if fieldName != "" {
	// 		settings[fieldName] = systemSettings.Key(fieldName).Value()
	// 	}
	// }

	return strategy.ParseConfigFromSystem()
}

// GetAuthSettingsForProviderWithDefaults(provider string) interface{}
func (s *AuthSettings) Reload(providerName string) {
	provider, ok := s.reloadableProviders[providerName]
	if !ok {
		s.log.Warn("Cannot reload unregistered provider", "provider", providerName)
	}

	err := provider.Reload()
	if err != nil {
		s.log.Error("Failed to reload provider", "provider", providerName, "error", err)
	}
}

func (s *AuthSettings) Update(provider string, data map[string]interface{}) error {
	s.store[provider] = data
	s.Reload(provider)
	return nil
}

func (s *AuthSettings) RegisterReloadable(provider string, reloadable auth.Reloadable) {
	if s.reloadableProviders == nil {
		s.reloadableProviders = make(map[string]auth.Reloadable)
	}

	s.reloadableProviders[provider] = reloadable
}
