package plugins

type UID string

func (u UID) String() string {
	return string(u)
}

type UIDFunc func(pluginID, version string) UID

var DefaultUIDFunc = func(pluginID, _ string) UID {
	return UID(pluginID)
}
