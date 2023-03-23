package modules

const (
	// Module targets
	All string = "all"

	// Invisible services
	BackgroundServices string = "background-services"
	Plugins            string = "plugins"
)

// dependencyMap defines Module Targets => Dependencies
var dependencyMap = map[string][]string{
	All: {BackgroundServices, Plugins},
}
