package pluginuid

type UID string

func (u UID) String() string {
	return string(u)
}

type FromPluginIDAndVersionFunc func(pluginID, version string) UID

var SimpleFromPluginIDAndVersionFunc = func(pluginID, _ string) UID {
	return UID(pluginID)
}
