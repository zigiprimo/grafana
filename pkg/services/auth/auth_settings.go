package auth

type AuthSettingsService interface {
	GetAuthSettingsForProvider(provider string, strategy FallbackStrategy) (map[string]interface{}, error)
	Update(provider string, data map[string]interface{}) error
	Reload(provider string)
	RegisterReloadable(provider string, reloadable Reloadable)
}

type Reloadable interface {
	Reload() error
}

type Validateable[T any] interface {
	Validate(input T) error
}

type FallbackStrategy interface {
	ParseConfigFromSystem() (map[string]interface{}, error)
}
