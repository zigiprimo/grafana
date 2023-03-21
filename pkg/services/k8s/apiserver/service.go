package apiserver

import (
	"context"
	"fmt"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/util/keyutil"
	kubeoptions "k8s.io/kubernetes/pkg/kubeapiserver/options"
	"net"

	"github.com/grafana/dskit/services"
	"github.com/grafana/grafana/pkg/services/k8s/authentication"
	"github.com/grafana/grafana/pkg/services/k8s/authorization"
	"github.com/grafana/grafana/pkg/services/k8s/kine"
	k8sserver "k8s.io/apiserver/pkg/server"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	certutil "k8s.io/client-go/util/cert"
	"k8s.io/kubernetes/cmd/kube-apiserver/app"
	"k8s.io/kubernetes/cmd/kube-apiserver/app/options"
	authzmodes "k8s.io/kubernetes/pkg/kubeapiserver/authorizer/modes"
)

var _ Service = (*service)(nil)
var _ RestConfigProvider = (*service)(nil)

type Service interface {
	services.Service
}

type RestConfigProvider interface {
	GetRestConfig() *rest.Config
}

type service struct {
	*services.BasicService

	etcdProvider kine.EtcdProvider
	k8sAuthnAPI  authentication.K8sAuthnAPI
	k8sAuthzAPI  authorization.K8sAuthzAPI
	restConfig   *rest.Config

	stopCh    chan struct{}
	stoppedCh chan error
}

func ProvideService(etcdProvider kine.EtcdProvider, k8sAuthnAPI authentication.K8sAuthnAPI, k8sAuthzAPI authorization.K8sAuthzAPI) (*service, error) {

	s := &service{
		etcdProvider: etcdProvider,
		k8sAuthnAPI:  k8sAuthnAPI,
		k8sAuthzAPI:  k8sAuthzAPI,
		stopCh:       make(chan struct{}),
	}

	s.BasicService = services.NewBasicService(s.start, s.running, nil)

	return s, nil
}

func (s *service) GetRestConfig() *rest.Config {
	return s.restConfig
}

func (s *service) initializeBasicRBAC() error {
	fmt.Println("Potato: add basic rbac")
	clientset, err := s.getClientset()
	if err != nil {
		fmt.Println("Error initializing clientset", err)
		return err
	}
	basicRBAC := NewBasicRBAC(clientset)
	err = basicRBAC.UpsertGrafanaSystemServiceAccount()
	if err != nil {
		return err
	}

	err = basicRBAC.UpsertGrafanaSystemClusterRole()
	if err != nil {
		return err
	}

	err = basicRBAC.UpsertGrafanaSystemClusterRoleBinding()
	if err != nil {
		return err
	}
	return nil
}

// Modifies serverRunOptions in place
func (s *service) enableServiceAccountsAuthn(serverRunOptions *options.ServerRunOptions) error {
	tokenSigningCertFile := "data/k8s/token-signing.apiserver.crt"
	tokenSigningKeyFile := "data/k8s/token-signing.apiserver.key"
	tokenSigningCertExists, _ := certutil.CanReadCertAndKey(tokenSigningCertFile, tokenSigningKeyFile)
	if tokenSigningCertExists == false {
		cert, key, err := certutil.GenerateSelfSignedCertKey("https://127.0.0.1:6443", []net.IP{}, []string{})
		if err != nil {
			fmt.Println("Error generating token signing cert")
			return err
		} else {
			certutil.WriteCert(tokenSigningCertFile, cert)
			keyutil.WriteKey(tokenSigningKeyFile, key)
		}
	}

	serverRunOptions.ServiceAccountSigningKeyFile = tokenSigningKeyFile
	serverRunOptions.Authentication.ServiceAccounts.KeyFiles = []string{tokenSigningKeyFile}
	serverRunOptions.Authentication.ServiceAccounts.Issuers = []string{"https://127.0.0.1:6443"}
	serverRunOptions.Authentication.ServiceAccounts.JWKSURI = "https://127.0.0.1:6443/.well-known/openid-configuration"

	return nil
}

func (s *service) start(ctx context.Context) error {
	serverRunOptions := options.NewServerRunOptions()

	serverRunOptions.Admission.GenericAdmission.EnablePlugins = []string{
		"MutatingAdmissionWebhook",
		"ValidatingAdmissionWebhook",
	}
	serverRunOptions.SecureServing.BindAddress = net.ParseIP("127.0.0.1")
	serverRunOptions.SecureServing.ServerCert.CertDirectory = "data/k8s"

	serverRunOptions.Authentication = kubeoptions.NewBuiltInAuthenticationOptions().WithAll()
	err := s.enableServiceAccountsAuthn(serverRunOptions)
	if err != nil {
		fmt.Errorf("Error enabling service account auth, proceeding anyway: %s", err.Error())
	}

	serverRunOptions.Authentication.WebHook.ConfigFile = "data/k8s/authn-kubeconfig"

	// TODO: determine if including ModeRBAC is a great idea. It ends up including a lot of cluster roles
	// that wont be of use to us. It may be a necessary evil.
	// e.g. I needed system:service-account-issuer-discovery in order to to access the OIDC endpoint of the apiserver's issuer
	serverRunOptions.Authorization.Modes = []string{authzmodes.ModeRBAC, authzmodes.ModeWebhook}
	serverRunOptions.Authorization.WebhookConfigFile = "data/k8s/authz-kubeconfig"
	serverRunOptions.Authorization.WebhookVersion = "v1"

	etcdConfig := s.etcdProvider.GetConfig()
	serverRunOptions.Etcd.StorageConfig.Transport.ServerList = etcdConfig.Endpoints
	serverRunOptions.Etcd.StorageConfig.Transport.CertFile = etcdConfig.TLSConfig.CertFile
	serverRunOptions.Etcd.StorageConfig.Transport.KeyFile = etcdConfig.TLSConfig.KeyFile
	serverRunOptions.Etcd.StorageConfig.Transport.TrustedCAFile = etcdConfig.TLSConfig.CAFile
	completedOptions, err := app.Complete(serverRunOptions)

	if err != nil {
		return err
	}

	server, err := app.CreateServerChain(completedOptions)
	if err != nil {
		return err
	}

	// Only applicable for KSA authn use-case
	server.GenericAPIServer.AddPostStartHookOrDie("basic-rbac-init", func(hookCtx k8sserver.PostStartHookContext) error {
		s.initializeBasicRBAC()
		<-hookCtx.StopCh
		return nil
	})

	s.restConfig = server.GenericAPIServer.LoopbackClientConfig
	s.writeKubeConfiguration(s.restConfig)

	prepared, err := server.PrepareRun()
	if err != nil {
		return err
	}

	go func() {
		s.stoppedCh <- prepared.Run(s.stopCh)
	}()

	return nil
}

func (s *service) running(ctx context.Context) error {
	select {
	case err := <-s.stoppedCh:
		if err != nil {
			return err
		}
	case <-ctx.Done():
		close(s.stopCh)
	}
	return nil
}

func (s *service) writeKubeConfiguration(restConfig *rest.Config) error {
	clusters := make(map[string]*clientcmdapi.Cluster)
	clusters["default-cluster"] = &clientcmdapi.Cluster{
		Server:                   restConfig.Host,
		CertificateAuthorityData: restConfig.CAData,
	}

	contexts := make(map[string]*clientcmdapi.Context)
	contexts["default-context"] = &clientcmdapi.Context{
		Cluster:   "default-cluster",
		Namespace: "default",
		AuthInfo:  "default",
	}

	authinfos := make(map[string]*clientcmdapi.AuthInfo)
	authinfos["default"] = &clientcmdapi.AuthInfo{
		Token:    restConfig.BearerToken,
		Username: restConfig.Username,
		Password: restConfig.Password,
	}

	clientConfig := clientcmdapi.Config{
		Kind:           "Config",
		APIVersion:     "v1",
		Clusters:       clusters,
		Contexts:       contexts,
		CurrentContext: "default-context",
		AuthInfos:      authinfos,
	}
	return clientcmd.WriteToFile(clientConfig, "data/k8s/grafana.kubeconfig")
}

// Only used for initial seeding of the grafana-system KSA. Once seeded, any future use of loopback config is avoided.
func (s *service) getClientset() (*kubernetes.Clientset, error) {
	clientset, err := kubernetes.NewForConfig(s.restConfig)
	if err != nil {
		return nil, err
	}

	return clientset, nil
}
