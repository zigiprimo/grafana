package accesscontrol

const (
	RelationReader  = "reader"
	RelationWriter  = "writer"
	RelationAdmin   = "admin"
	RelationDelete  = "delete"
	RelationHas     = "has"
	RelationParent  = "parent"
	RelationMember  = "member"
	RelationGranted = "granted"
)

const (
	KindUser       = "user"
	KindRole       = "role"
	KindTeam       = "team"
	KindPermission = "permission"
	KindDashboard  = "dashboard"
	KindFolder     = "folder"
)

var actionToRelationMap = map[string]string{
	"dashboards:read":  RelationReader,
	"folders:read":     RelationReader,
	"dashboards:write": RelationWriter,
	"folders:write":    RelationWriter,
}

func ActionToRelation(action string) string {
	rel := actionToRelationMap[action]
	return rel
}
