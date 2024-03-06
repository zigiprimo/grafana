package accesscontrol

import (
	"context"
	"fmt"
	"strings"

	"google.golang.org/grpc/credentials/insecure"

	"github.com/authzed/grpcutil"

	"google.golang.org/grpc"

	pb "github.com/authzed/authzed-go/proto/authzed/api/v1"
	"github.com/authzed/authzed-go/v1"
	"xorm.io/xorm"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
	"github.com/grafana/grafana/pkg/setting"
)

const RBACSpiceDBSchemaMigrationID = "creating spicedb schema"
const RBACSpiceDBDataMigrationID = "migrating permissions into spicedb"

const schema = `
definition user {}

definition team {
	relation member: user
	permission view = member
}

definition role {
	relation granted: user | team#member
	permission view = granted
}

definition dashboard {
	relation parent: folder
	relation writer: user | team#member | role#granted
	relation reader: user | team#member | role#granted
	permission edit = writer + parent->edit + writer->member
	permission view = reader + edit + parent->view + reader->granted
}

definition folder {
	relation parent: folder
	relation writer: user | team#member | role#granted
	relation reader: user | team#member | role#granted
	permission edit = writer + parent->edit + writer->member
	permission view = reader + edit + parent->view + reader->granted
}`

func NewSpiceDBClient(cfg *setting.Cfg) (*authzed.Client, error) {
	client, err := authzed.NewClient(
		cfg.RBACSpiceDBAddr,
		grpcutil.WithInsecureBearerToken(cfg.RBACSpiceDBToken),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, err
	}
	return client, nil
}

func AddRBACSpiceDBSchemaMigration(mg *migrator.Migrator) {
	mg.AddMigration(RBACSpiceDBSchemaMigrationID, &rbacSpiceDBSchemaMigrator{})
}

var _ migrator.CodeMigration = new(rbacSpiceDBSchemaMigrator)

type rbacSpiceDBSchemaMigrator struct {
	migrator.MigrationBase
	logger log.Logger
}

func (p *rbacSpiceDBSchemaMigrator) SQL(dialect migrator.Dialect) string {
	return CodeMigrationSQL
}

func (p *rbacSpiceDBSchemaMigrator) Exec(sess *xorm.Session, mg *migrator.Migrator) error {
	client, err := NewSpiceDBClient(mg.Cfg)
	if err != nil {
		mg.Logger.Error("unable to initialize client: %s", err)
		return err
	}

	req := &pb.ReadSchemaRequest{}
	res, err := client.ReadSchema(context.Background(), req)
	if err != nil {
		mg.Logger.Error("failed to read schema: %s", err)
	} else {
		mg.Logger.Debug("schema", "s", res)
	}

	request := &pb.WriteSchemaRequest{Schema: schema}
	_, err = client.WriteSchema(context.Background(), request)
	if err != nil {
		mg.Logger.Error("failed to write schema: %s", err)
		return err
	}
	return nil
}

func AddRBACSpiceDBDataMigration(mg *migrator.Migrator) {
	mg.AddMigration(RBACSpiceDBDataMigrationID, &rbacSpiceDBDataMigrator{})
}

var _ migrator.CodeMigration = new(rbacSpiceDBDataMigrator)

type rbacSpiceDBDataMigrator struct {
	migrator.MigrationBase
	logger log.Logger
}

func (p *rbacSpiceDBDataMigrator) SQL(dialect migrator.Dialect) string {
	return CodeMigrationSQL
}

type userAssignment struct {
	OrgId  int64
	UserId int64
	Name   string
}

type teamAssignment struct {
	OrgId  int64
	TeamId int64
	Name   string
}

type teamMember struct {
	OrgId  int64
	TeamId int64
	UserId int64
}

type relation struct {
	OrgId       int64
	ObjectType  string
	ObjectId    string
	Relation    string
	SubjectType string
	SubjectId   string
}

func (p *rbacSpiceDBDataMigrator) Exec(sess *xorm.Session, migrator *migrator.Migrator) error {
	logger := log.New("RBAC NG data migrator")
	p.logger = logger
	p.logger.Debug("rbac ng data migration")

	client, err := NewSpiceDBClient(migrator.Cfg)
	if err != nil {
		p.logger.Error("unable to initialize client: %s", err)
		return err
	}
	if err := p.migrateUserRoleAssignments(sess, migrator, client); err != nil {
		return err
	}
	if err := p.migrateTeamRoleAssignments(sess, migrator, client); err != nil {
		return err
	}
	if err := p.migrateUsersTeams(sess, migrator, client); err != nil {
		return err
	}
	if err := p.migrateUserManagedPermissions(sess, migrator, client); err != nil {
		return err
	}
	if err := p.migrateTeamManagedPermissions(sess, migrator, client); err != nil {
		return err
	}
	if err := p.migrateFolders(sess, migrator, client); err != nil {
		return err
	}
	if err := p.migrateDashboards(sess, migrator, client); err != nil {
		return err
	}

	//return errors.New("not implemented")
	return nil
}

func (p *rbacSpiceDBDataMigrator) migrateUserRoleAssignments(sess *xorm.Session, mg *migrator.Migrator, client *authzed.Client) error {
	assignments := make([]userAssignment, 0)
	getRoleAssignmentsQuery := `SELECT ur.org_id, ur.user_id, r.name FROM user_role ur INNER JOIN role r ON r.id = ur.role_id`
	if err := sess.SQL(getRoleAssignmentsQuery).Find(&assignments); err != nil {
		return err
	}

	relUpdates := make([]*pb.RelationshipUpdate, 0)
	for _, a := range assignments {
		update := &pb.RelationshipUpdate{
			Operation: pb.RelationshipUpdate_OPERATION_CREATE,
			Relationship: &pb.Relationship{
				Resource: &pb.ObjectReference{
					ObjectType: accesscontrol.KindRole,
					ObjectId:   formatObjectID(a.Name),
				},
				Relation: accesscontrol.RelationGranted,
				Subject: &pb.SubjectReference{
					Object: &pb.ObjectReference{
						ObjectType: accesscontrol.KindUser,
						ObjectId:   fmt.Sprintf("%d", a.UserId),
					},
				},
			},
		}
		relUpdates = append(relUpdates, update)
	}

	err := bulkWriteUpdates(client, relUpdates)
	if err != nil {
		mg.Logger.Error("failed to write relationships: %s", err)
		return err
	}

	return nil
}

func (p *rbacSpiceDBDataMigrator) migrateTeamRoleAssignments(sess *xorm.Session, mg *migrator.Migrator, client *authzed.Client) error {
	assignments := make([]teamAssignment, 0)
	getRoleAssignmentsQuery := `SELECT tr.org_id, tr.team_id, r.name FROM team_role tr INNER JOIN role r ON r.id = tr.role_id`
	if err := sess.SQL(getRoleAssignmentsQuery).Find(&assignments); err != nil {
		return err
	}

	relUpdates := make([]*pb.RelationshipUpdate, 0)
	for _, a := range assignments {
		update := &pb.RelationshipUpdate{
			Operation: pb.RelationshipUpdate_OPERATION_CREATE,
			Relationship: &pb.Relationship{
				Resource: &pb.ObjectReference{
					ObjectType: accesscontrol.KindRole,
					ObjectId:   formatObjectID(a.Name),
				},
				Relation: accesscontrol.RelationGranted,
				Subject: &pb.SubjectReference{
					Object: &pb.ObjectReference{
						ObjectType: accesscontrol.KindTeam,
						ObjectId:   fmt.Sprintf("%d", a.TeamId),
					},
					OptionalRelation: accesscontrol.RelationMember,
				},
			},
		}
		relUpdates = append(relUpdates, update)
	}

	err := bulkWriteUpdates(client, relUpdates)
	if err != nil {
		mg.Logger.Error("failed to write relationships: %s", err)
		return err
	}

	return nil
}

func (p *rbacSpiceDBDataMigrator) migrateUsersTeams(sess *xorm.Session, mg *migrator.Migrator, client *authzed.Client) error {
	assignments := make([]teamMember, 0)
	getRoleAssignmentsQuery := `SELECT org_id, team_id, user_id FROM team_member`
	if err := sess.SQL(getRoleAssignmentsQuery).Find(&assignments); err != nil {
		return err
	}

	relUpdates := make([]*pb.RelationshipUpdate, 0)
	for _, a := range assignments {
		update := &pb.RelationshipUpdate{
			Operation: pb.RelationshipUpdate_OPERATION_CREATE,
			Relationship: &pb.Relationship{
				Resource: &pb.ObjectReference{
					ObjectType: accesscontrol.KindTeam,
					ObjectId:   fmt.Sprintf("%d", a.TeamId),
				},
				Relation: accesscontrol.RelationMember,
				Subject: &pb.SubjectReference{
					Object: &pb.ObjectReference{
						ObjectType: accesscontrol.KindUser,
						ObjectId:   fmt.Sprintf("%d", a.UserId),
					},
				},
			},
		}
		relUpdates = append(relUpdates, update)
	}

	err := bulkWriteUpdates(client, relUpdates)
	if err != nil {
		mg.Logger.Error("failed to write relationships: %s", err)
		return err
	}

	return nil
}

type managedPermission struct {
	OrgId      int64
	UserId     int64
	TeamId     int64
	Name       string
	Action     string
	Attribute  string
	Kind       string
	Identifier string
}

func (p *rbacSpiceDBDataMigrator) migrateUserManagedPermissions(sess *xorm.Session, mg *migrator.Migrator, client *authzed.Client) error {
	assignments := make([]managedPermission, 0)
	getPermissionsQuery := `SELECT ur.org_id, ur.user_id, r.name, p.action, p.attribute, p.kind, p.identifier
		FROM user_role ur
		INNER JOIN role r ON r.id = ur.role_id
		INNER JOIN permission p ON r.id = p.role_id
		WHERE r.name LIKE 'managed:%'`
	if err := sess.SQL(getPermissionsQuery).Find(&assignments); err != nil {
		return err
	}

	relUpdates := make([]*pb.RelationshipUpdate, 0)
	for _, a := range assignments {
		rel := accesscontrol.ActionToRelation(a.Action)
		if rel == "" {
			continue
		}
		if a.Kind == "folders" && strings.Contains(a.Action, "dashboard") {
			continue
		}
		objType := kindToObjectType(a.Kind)
		update := &pb.RelationshipUpdate{
			Operation: pb.RelationshipUpdate_OPERATION_CREATE,
			Relationship: &pb.Relationship{
				Resource: &pb.ObjectReference{
					ObjectType: objType,
					ObjectId:   a.Identifier,
				},
				Relation: rel,
				Subject: &pb.SubjectReference{
					Object: &pb.ObjectReference{
						ObjectType: accesscontrol.KindUser,
						ObjectId:   fmt.Sprintf("%d", a.UserId),
					},
				},
			},
		}
		relUpdates = append(relUpdates, update)
	}

	err := bulkWriteUpdates(client, relUpdates)
	if err != nil {
		mg.Logger.Error("failed to write relationships: %s", err)
		return err
	}

	return nil
}

func (p *rbacSpiceDBDataMigrator) migrateTeamManagedPermissions(sess *xorm.Session, mg *migrator.Migrator, client *authzed.Client) error {
	assignments := make([]managedPermission, 0)
	getPermissionsQuery := `SELECT tr.org_id, tr.team_id, r.name, p.action, p.attribute, p.kind, p.identifier
		FROM team_role tr
		INNER JOIN role r ON r.id = tr.role_id
		INNER JOIN permission p ON r.id = p.role_id
		WHERE r.name LIKE 'managed:%'`
	if err := sess.SQL(getPermissionsQuery).Find(&assignments); err != nil {
		return err
	}

	relUpdates := make([]*pb.RelationshipUpdate, 0)
	for _, a := range assignments {
		rel := accesscontrol.ActionToRelation(a.Action)
		if rel == "" {
			continue
		}
		if a.Kind == "folders" && strings.Contains(a.Action, "dashboard") {
			continue
		}
		objType := kindToObjectType(a.Kind)
		update := &pb.RelationshipUpdate{
			Operation: pb.RelationshipUpdate_OPERATION_CREATE,
			Relationship: &pb.Relationship{
				Resource: &pb.ObjectReference{
					ObjectType: objType,
					ObjectId:   a.Identifier,
				},
				Relation: rel,
				Subject: &pb.SubjectReference{
					Object: &pb.ObjectReference{
						ObjectType: accesscontrol.KindTeam,
						ObjectId:   fmt.Sprintf("%d", a.TeamId),
					},
					OptionalRelation: accesscontrol.RelationMember,
				},
			},
		}
		relUpdates = append(relUpdates, update)
	}

	err := bulkWriteUpdates(client, relUpdates)
	if err != nil {
		mg.Logger.Error("failed to write relationships: %s", err)
		return err
	}

	return nil
}

type folder struct {
	OrgId     int64  `xorm:"org_id"`
	UID       string `xorm:"uid"`
	ParentUid string `xorm:"parent_uid"`
}

func (p *rbacSpiceDBDataMigrator) migrateFolders(sess *xorm.Session, mg *migrator.Migrator, client *authzed.Client) error {
	folders := make([]folder, 0)
	getFoldersQuery := `SELECT org_id, uid, parent_uid FROM folder`
	if err := sess.SQL(getFoldersQuery).Find(&folders); err != nil {
		return err
	}

	relUpdates := make([]*pb.RelationshipUpdate, 0)
	for _, f := range folders {
		if f.ParentUid == "" {
			continue
		}
		update := &pb.RelationshipUpdate{
			Operation: pb.RelationshipUpdate_OPERATION_CREATE,
			Relationship: &pb.Relationship{
				Resource: &pb.ObjectReference{
					ObjectType: accesscontrol.KindFolder,
					ObjectId:   f.UID,
				},
				Relation: accesscontrol.RelationParent,
				Subject: &pb.SubjectReference{
					Object: &pb.ObjectReference{
						ObjectType: accesscontrol.KindFolder,
						ObjectId:   f.ParentUid,
					},
				},
			},
		}
		relUpdates = append(relUpdates, update)
	}

	err := bulkWriteUpdates(client, relUpdates)
	if err != nil {
		mg.Logger.Error("failed to write relationships: %s", err)
		return err
	}

	return nil
}

type dash struct {
	OrgId     int64  `xorm:"org_id"`
	UID       string `xorm:"uid"`
	FolderUid string `xorm:"folder_uid"`
}

func (p *rbacSpiceDBDataMigrator) migrateDashboards(sess *xorm.Session, mg *migrator.Migrator, client *authzed.Client) error {
	dashboards := make([]dash, 0)
	getDashboardsQuery := `SELECT org_id, uid, folder_uid FROM dashboard WHERE is_folder = 0`
	if err := sess.SQL(getDashboardsQuery).Find(&dashboards); err != nil {
		return err
	}

	relUpdates := make([]*pb.RelationshipUpdate, 0)
	for _, d := range dashboards {
		update := &pb.RelationshipUpdate{
			Operation: pb.RelationshipUpdate_OPERATION_CREATE,
			Relationship: &pb.Relationship{
				Resource: &pb.ObjectReference{
					ObjectType: accesscontrol.KindDashboard,
					ObjectId:   d.UID,
				},
				Relation: accesscontrol.RelationParent,
				Subject: &pb.SubjectReference{
					Object: &pb.ObjectReference{
						ObjectType: accesscontrol.KindFolder,
						ObjectId:   d.FolderUid,
					},
				},
			},
		}
		relUpdates = append(relUpdates, update)
	}

	err := bulkWriteUpdates(client, relUpdates)
	if err != nil {
		mg.Logger.Error("failed to write relationships: %s", err)
		return err
	}

	return nil
}

func (p *rbacSpiceDBDataMigrator) migratePermissions(sess *xorm.Session) error {
	permissions := make([]*accesscontrol.Permission, 0)
	getRoleAssignmentsQuery := `SELECT ur.org_id, ur.user_id, r.name FROM user_role ur INNER JOIN role r ON r.id = ur.role_id`
	if err := sess.SQL(getRoleAssignmentsQuery).Find(&permissions); err != nil {
		return err
	}
	p.logger.Debug("assignments", "assignments", permissions)
	return nil
}

var objectKinds = map[string]string{
	"teams":      accesscontrol.KindTeam,
	"folders":    accesscontrol.KindFolder,
	"dashboards": accesscontrol.KindDashboard,
}

func kindToObjectType(kind string) string {
	return objectKinds[kind]
}

// replace managed:users:1:permissions with managed/users/1/permissions to match SpiceDB pattern
func formatObjectID(id string) string {
	return strings.ReplaceAll(id, ":", "/")
}

func bulkWriteUpdates(client *authzed.Client, updates []*pb.RelationshipUpdate) error {
	limit := 1000
	for i := 0; i < len(updates); i += limit {
		last := i + limit
		if last > len(updates) {
			last = len(updates)
		}
		bulk := updates[i:last]
		request := &pb.WriteRelationshipsRequest{Updates: bulk}
		_, err := client.WriteRelationships(context.Background(), request)
		if err != nil {
			return err
		}
	}
	return nil

}
