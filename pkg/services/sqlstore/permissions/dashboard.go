package permissions

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/davecgh/go-spew/spew"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/folder"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
	"github.com/grafana/grafana/pkg/services/sqlstore/searchstore"
	"github.com/grafana/grafana/pkg/services/user"
)

// maximum possible capacity for recursive queries array: one query for folder and one for dashboard actions
const maximumRecursiveQueries = 2

type DashboardPermissionFilter struct {
	OrgRole         org.RoleType
	Dialect         migrator.Dialect
	UserId          int64
	OrgId           int64
	PermissionLevel dashboards.PermissionType
}

func (d DashboardPermissionFilter) Where() (string, []interface{}) {
	if d.OrgRole == org.RoleAdmin {
		return "", nil
	}

	okRoles := []interface{}{d.OrgRole}
	if d.OrgRole == org.RoleEditor {
		okRoles = append(okRoles, org.RoleViewer)
	}

	falseStr := d.Dialect.BooleanStr(false)

	sql := `(
		dashboard.id IN (
			SELECT distinct DashboardId from (
				SELECT d.id AS DashboardId
					FROM dashboard AS d
					LEFT JOIN dashboard_acl AS da ON
						da.dashboard_id = d.id OR
						da.dashboard_id = d.folder_id
					WHERE
						d.org_id = ? AND
						da.permission >= ? AND
						(
							da.user_id = ? OR
							da.team_id IN (SELECT team_id from team_member AS tm WHERE tm.user_id = ?) OR
							da.role IN (?` + strings.Repeat(",?", len(okRoles)-1) + `)
						)
				UNION
				SELECT d.id AS DashboardId
					FROM dashboard AS d
					LEFT JOIN dashboard AS folder on folder.id = d.folder_id
					LEFT JOIN dashboard_acl AS da ON
						(
							-- include default permissions -->
							da.org_id = -1 AND (
							  (folder.id IS NOT NULL AND folder.has_acl = ` + falseStr + `) OR
							  (folder.id IS NULL AND d.has_acl = ` + falseStr + `)
							)
						)
					WHERE
						d.org_id = ? AND
						da.permission >= ? AND
						(
							da.user_id = ? OR
							da.role IN (?` + strings.Repeat(",?", len(okRoles)-1) + `)
						)
			) AS a
		)
	)
	`

	params := []interface{}{d.OrgId, d.PermissionLevel, d.UserId, d.UserId}
	params = append(params, okRoles...)
	params = append(params, d.OrgId, d.PermissionLevel, d.UserId)
	params = append(params, okRoles...)
	return sql, params
}

type clause struct {
	string
	params []interface{}
}

type accessControlDashboardPermissionFilter struct {
	user             *user.SignedInUser
	dashboardActions []string
	folderActions    []string
	features         featuremgmt.FeatureToggles

	on clause
	// any recursive CTE queries (if supported)
	recQueries                   []clause
	recursiveQueriesAreSupported bool

	dialect migrator.Dialect
}

// NewAccessControlDashboardPermissionFilter creates a new AccessControlDashboardPermissionFilter that is configured with specific actions calculated based on the dashboards.PermissionType and query type
func NewAccessControlDashboardPermissionFilter(user *user.SignedInUser, permissionLevel dashboards.PermissionType, queryType string, features featuremgmt.FeatureToggles, recursiveQueriesAreSupported bool, dialect migrator.Dialect) *accessControlDashboardPermissionFilter {
	needEdit := permissionLevel > dashboards.PERMISSION_VIEW

	var folderActions []string
	var dashboardActions []string
	if queryType == searchstore.TypeFolder {
		folderActions = append(folderActions, dashboards.ActionFoldersRead)
		if needEdit {
			folderActions = append(folderActions, dashboards.ActionDashboardsCreate)
		}
	} else if queryType == searchstore.TypeDashboard {
		dashboardActions = append(dashboardActions, dashboards.ActionDashboardsRead)
		if needEdit {
			dashboardActions = append(dashboardActions, dashboards.ActionDashboardsWrite)
		}
	} else if queryType == searchstore.TypeAlertFolder {
		folderActions = append(
			folderActions,
			dashboards.ActionFoldersRead,
			accesscontrol.ActionAlertingRuleRead,
		)
		if needEdit {
			folderActions = append(
				folderActions,
				accesscontrol.ActionAlertingRuleCreate,
			)
		}
	} else {
		folderActions = append(folderActions, dashboards.ActionFoldersRead)
		dashboardActions = append(dashboardActions, dashboards.ActionDashboardsRead)
		if needEdit {
			folderActions = append(folderActions, dashboards.ActionDashboardsCreate)
			dashboardActions = append(dashboardActions, dashboards.ActionDashboardsWrite)
		}
	}

	f := accessControlDashboardPermissionFilter{user: user, folderActions: folderActions, dashboardActions: dashboardActions, features: features,
		recursiveQueriesAreSupported: recursiveQueriesAreSupported,
		dialect:                      dialect,
	}

	f.buildClauses()

	return &f
}

// Where returns:
// - a where clause for filtering dashboards with expected permissions
// - an array with the query parameters
func (f *accessControlDashboardPermissionFilter) Where() (string, []interface{}) {
	return " ur.id IS NOT NULL OR tr.id IS NOT NULL OR br.id IS NOT NULL ", nil
}

func (f *accessControlDashboardPermissionFilter) Join() (string, []interface{}) {
	if f.user == nil || f.user.Permissions == nil || f.user.Permissions[f.user.OrgID] == nil {
		return "", nil
	}

	actionFilterCondition, params := f.buildClauses()

	userRolesFilterCondition, params := accesscontrol.UserRolesFilterCondition(f.user.OrgID, f.user.UserID)
	teamRolesFilterCondition, teamParams := accesscontrol.TeamRolesFilderCondition(f.user.OrgID, f.user.Teams)
	params = append(params, teamParams...)
	builtinRolesFilterCondition, builtinParams := accesscontrol.BuiltinRolesFilterCondition(f.user.OrgID, accesscontrol.GetOrgRoles(f.user))
	params = append(params, builtinParams...)

	sql := fmt.Sprintf(`
		INNER JOIN permission AS p1 ON dashboard.org_id = ? AND %s
		LEFT JOIN user_role AS ur ON ur.role_id = p1.role_id AND %s
		LEFT JOIN team_role AS tr ON tr.role_id = p1.role_id AND %s
		LEFT JOIN builtin_role AS br ON br.role_id = p1.role_id AND %s`,
		actionFilterCondition,
		userRolesFilterCondition,
		teamRolesFilterCondition,
		builtinRolesFilterCondition)
	return sql, append([]interface{}{f.user.OrgID}, params...)
}

func (f *accessControlDashboardPermissionFilter) buildClauses() (string, []interface{}) {
	if f.user == nil || f.user.Permissions == nil || f.user.Permissions[f.user.OrgID] == nil {
		return "(1 = 0)", nil
	}
	dashWildcards := accesscontrol.WildcardsFromPrefix(dashboards.ScopeDashboardsPrefix)
	folderWildcards := accesscontrol.WildcardsFromPrefix(dashboards.ScopeFoldersPrefix)

	var args []interface{}
	builder := strings.Builder{}
	builder.WriteRune('(')

	permSelector := strings.Builder{}
	var permSelectorArgs []interface{}

	buildScope := func(prefix, col string) string {
		return f.dialect.Concat(fmt.Sprintf("'%s'", prefix), col)
	}

	buildFolderScope := func(col string) string {
		return buildScope(dashboards.ScopeFoldersPrefix, col)
	}

	buildDashboardScope := func(col string) string {
		return buildScope(dashboards.ScopeDashboardsPrefix, col)
	}

	if len(f.dashboardActions) > 0 {
		toCheck := actionsToCheck(f.dashboardActions, f.user.Permissions[f.user.OrgID], dashWildcards, folderWildcards)

		if len(toCheck) > 0 {
			builder.WriteString(fmt.Sprintf("(%s IN (SELECT scope FROM permission WHERE ", buildDashboardScope("dashboard.uid")))

			if len(toCheck) == 1 {
				builder.WriteString(" action = ?")
				args = append(args, toCheck[0])
			} else {
				builder.WriteString(" action IN (?" + strings.Repeat(", ?", len(toCheck)-1) + ") GROUP BY role_id, scope HAVING COUNT(action) = ?")
				args = append(args, toCheck...)
				args = append(args, len(toCheck))
			}
			builder.WriteString(") AND NOT dashboard.is_folder)")

			builder.WriteString(" OR ")
			permSelector.WriteString("(SELECT scope FROM permission WHERE ")

			if len(toCheck) == 1 {
				permSelector.WriteString(" action = ?")
				permSelectorArgs = append(permSelectorArgs, toCheck[0])
			} else {
				permSelector.WriteString(" action IN (?" + strings.Repeat(", ?", len(toCheck)-1) + ") GROUP BY role_id, scope HAVING COUNT(action) = ?")
				permSelectorArgs = append(permSelectorArgs, toCheck...)
				permSelectorArgs = append(permSelectorArgs, len(toCheck))
			}
			permSelector.WriteRune(')')

			switch f.features.IsEnabled(featuremgmt.FlagNestedFolders) {
			case true:
				switch f.recursiveQueriesAreSupported {
				case true:
					recQueryName := fmt.Sprintf("RecQry%d", len(f.recQueries))
					f.addRecQry(recQueryName, permSelector.String(), permSelectorArgs)
					builder.WriteString(fmt.Sprintf("(%s IN (SELECT uid FROM %s", recQueryName, buildFolderScope("folder.uid")))
				default:
					nestedFoldersSelectors, nestedFoldersArgs := nestedFoldersSelectors(permSelector.String(), permSelectorArgs, buildFolderScope("folder.uid"))
					builder.WriteRune('(')
					builder.WriteString(nestedFoldersSelectors)
					args = append(args, nestedFoldersArgs...)
				}
				builder.WriteString(") AND NOT dashboard.is_folder)")
			default:
				builder.WriteString(fmt.Sprintf("(%s IN ", f.dialect.Concat("'folders:uid:%'", "folder.uid")))
				builder.WriteString(permSelector.String())
				args = append(args, permSelectorArgs...)
				builder.WriteString(" AND NOT dashboard.is_folder)")
			}
		} else {
			builder.WriteString("NOT dashboard.is_folder")
		}
	}

	// recycle and reuse
	permSelector.Reset()
	permSelectorArgs = permSelectorArgs[:0]

	if len(f.folderActions) > 0 {
		if len(f.dashboardActions) > 0 {
			builder.WriteString(" OR ")
		}

		toCheck := actionsToCheck(f.folderActions, f.user.Permissions[f.user.OrgID], folderWildcards)
		if len(toCheck) > 0 {
			permSelector.WriteString("(SELECT scope FROM permission WHERE ")
			if len(toCheck) == 1 {
				permSelector.WriteString(" action = ?")
				permSelectorArgs = append(permSelectorArgs, toCheck[0])
			} else {
				permSelector.WriteString(" action IN (?" + strings.Repeat(", ?", len(toCheck)-1) + ") GROUP BY role_id, scope HAVING COUNT(action) = ?")
				permSelectorArgs = append(permSelectorArgs, toCheck...)
				permSelectorArgs = append(permSelectorArgs, len(toCheck))
			}
			permSelector.WriteRune(')')

			switch f.features.IsEnabled(featuremgmt.FlagNestedFolders) {
			case true:
				switch f.recursiveQueriesAreSupported {
				case true:
					recQueryName := fmt.Sprintf("RecQry%d", len(f.recQueries))
					f.addRecQry(recQueryName, permSelector.String(), permSelectorArgs)
					builder.WriteString(fmt.Sprintf("(%s IN ", buildFolderScope("dashboard.uid")))
					builder.WriteString(fmt.Sprintf("(SELECT uid FROM %s)", recQueryName))
				default:
					nestedFoldersSelectors, nestedFoldersArgs := nestedFoldersSelectors(permSelector.String(), permSelectorArgs, buildFolderScope("dashboard.uid"))
					builder.WriteRune('(')
					builder.WriteString(nestedFoldersSelectors)
					builder.WriteRune(')')
					args = append(args, nestedFoldersArgs...)
				}
			default:
				spew.Dump(">>>> 1111 ", buildFolderScope("dashboard.uid"))
				builder.WriteString(fmt.Sprintf("(%s IN ", buildFolderScope("dashboard.uid")))
				builder.WriteString(permSelector.String())
				args = append(args, permSelectorArgs...)
			}
			builder.WriteString(" AND dashboard.is_folder)")
		} else {
			builder.WriteString("dashboard.is_folder")
		}
	}
	builder.WriteRune(')')

	return builder.String(), args
}

// With returns:
// - a with clause for fetching folders with inherited permissions if nested folders are enabled or an empty string
func (f *accessControlDashboardPermissionFilter) With() (string, []interface{}) {
	var sb bytes.Buffer
	var params []interface{}
	if len(f.recQueries) > 0 {
		sb.WriteString("WITH RECURSIVE ")
		sb.WriteString(f.recQueries[0].string)
		params = append(params, f.recQueries[0].params...)
		for _, r := range f.recQueries[1:] {
			sb.WriteRune(',')
			sb.WriteString(r.string)
			params = append(params, r.params...)
		}
	}
	return sb.String(), params
}

func (f *accessControlDashboardPermissionFilter) addRecQry(queryName string, whereUIDSelect string, whereParams []interface{}) {
	if f.recQueries == nil {
		f.recQueries = make([]clause, 0, maximumRecursiveQueries)
	}
	c := make([]interface{}, len(whereParams))
	copy(c, whereParams)
	f.recQueries = append(f.recQueries, clause{
		string: fmt.Sprintf(`%s AS (
			SELECT uid, parent_uid, org_id FROM folder WHERE uid IN %s
			UNION ALL SELECT f.uid, f.parent_uid, f.org_id FROM folder f INNER JOIN %s r ON f.parent_uid = r.uid and f.org_id = r.org_id
		)`, queryName, whereUIDSelect, queryName),
		params: c,
	})
}

func actionsToCheck(actions []string, permissions map[string][]string, wildcards ...accesscontrol.Wildcards) []interface{} {
	toCheck := make([]interface{}, 0, len(actions))

	for _, a := range actions {
		var hasWildcard bool

	outer:
		for _, scope := range permissions[a] {
			for _, w := range wildcards {
				if w.Contains(scope) {
					hasWildcard = true
					break outer
				}
			}
		}

		if !hasWildcard {
			toCheck = append(toCheck, a)
		}
	}
	return toCheck
}

func nestedFoldersSelectors(permSelector string, permSelectorArgs []interface{}, leftTableCol string) (string, []interface{}) {
	wheres := make([]string, 0, folder.MaxNestedFolderDepth+1)
	args := make([]interface{}, 0, len(permSelectorArgs)*(folder.MaxNestedFolderDepth+1))

	joins := make([]string, 0, folder.MaxNestedFolderDepth+2)

	tmpl := "INNER JOIN folder %s ON %s.parent_uid = %s.uid AND %s.org_id = %s.org_id "

	wheres = append(wheres, fmt.Sprintf("(%s IN (SELECT f1.uid FROM folder f1 WHERE f1.uid IN %s)", leftTableCol, permSelector))
	args = append(args, permSelectorArgs...)

	prev := "f1"
	for i := 2; i <= folder.MaxNestedFolderDepth+2; i++ {
		t := fmt.Sprintf("f%d", i)
		s := fmt.Sprintf(tmpl, t, prev, t, prev, t)
		joins = append(joins, s)

		wheres = append(wheres, fmt.Sprintf("(%s IN (SELECT f1.uid FROM folder f1 %s WHERE %s.uid IN %s)", leftTableCol, strings.Join(joins, " "), t, permSelector))
		args = append(args, permSelectorArgs...)

		prev = t
	}

	return strings.Join(wheres, ") OR "), args
}
