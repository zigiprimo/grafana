package accesscontrol

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"google.golang.org/grpc/credentials/insecure"

	"github.com/authzed/grpcutil"

	"google.golang.org/grpc"

	pb "github.com/authzed/authzed-go/proto/authzed/api/v1"
	"github.com/authzed/authzed-go/v1"
	"xorm.io/xorm"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

const RBACSpiceDBSchemaMigrationID = "creating spicedb schema"
const RBACSpiceDBDataMigrationID = "migrating permissions into spicedb"

const schema = `
definition user {}

definition dashboard {
	relation parent: folder
	relation writer: user
	relation reader: user
	permission edit = writer + parent->edit
	permission view = reader + edit + parent->view
}

definition folder {
	relation parent: folder
	relation writer: user
	relation reader: user
	permission edit = writer + parent->edit
	permission view = reader + edit + parent->view
}`

const spicedbEndpoint = "localhost:50051"

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
	client, err := authzed.NewClient(
		spicedbEndpoint,
		grpcutil.WithInsecureBearerToken(mg.Cfg.RBACSpiceDBToken),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
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
	if err := p.migrateRoleAssignments(sess); err != nil {
		return err
	}
	if err := p.migrateTeamRoleAssignments(sess); err != nil {
		return err
	}
	if err := p.migrateUsersTeams(sess); err != nil {
		return err
	}
	if err := p.migrateUserManagedPermissions(sess); err != nil {
		return err
	}
	if err := p.migrateTeamManagedPermissions(sess); err != nil {
		return err
	}
	if err := p.migrateFolders(sess); err != nil {
		return err
	}
	if err := p.migrateDashboards(sess); err != nil {
		return err
	}

	//return errors.New("not implemented")
	return nil
}

func (p *rbacSpiceDBDataMigrator) migrateRoleAssignments(sess *xorm.Session) error {
	assignments := make([]userAssignment, 0)
	getRoleAssignmentsQuery := `SELECT ur.org_id, ur.user_id, r.name FROM user_role ur INNER JOIN role r ON r.id = ur.role_id`
	if err := sess.SQL(getRoleAssignmentsQuery).Find(&assignments); err != nil {
		return err
	}

	ts := time.Now()
	valueStrings := make([]string, len(assignments))
	args := make([]any, 0, len(assignments)*5)
	for i, a := range assignments {
		valueStrings[i] = "(?, 'role', ?, 'has', 'user', ?, ?, ?)"
		args = append(args, a.OrgId, a.Name, a.UserId, ts, ts)
	}
	valueString := strings.Join(valueStrings, ",")
	sql := fmt.Sprintf("INSERT INTO ac_relation (org_id, object_type, object_id, relation, subject_type, subject_id, created, updated) VALUES %s", valueString)
	sqlArgs := append([]any{sql}, args...)
	if _, errCreate := sess.Exec(sqlArgs...); errCreate != nil {
		return fmt.Errorf("failed to move user role assignments: %w", errCreate)
	}
	return nil
}

func (p *rbacSpiceDBDataMigrator) migrateTeamRoleAssignments(sess *xorm.Session) error {
	assignments := make([]teamAssignment, 0)
	getRoleAssignmentsQuery := `SELECT tr.org_id, tr.team_id, r.name FROM team_role tr INNER JOIN role r ON r.id = tr.role_id`
	if err := sess.SQL(getRoleAssignmentsQuery).Find(&assignments); err != nil {
		return err
	}

	ts := time.Now()
	valueStrings := make([]string, len(assignments))
	args := make([]any, 0, len(assignments)*5)
	for i, a := range assignments {
		valueStrings[i] = "(?, 'role', ?, 'has', 'team', ?, ?, ?)"
		args = append(args, a.OrgId, a.Name, a.TeamId, ts, ts)
	}
	valueString := strings.Join(valueStrings, ",")
	sql := fmt.Sprintf("INSERT INTO ac_relation (org_id, object_type, object_id, relation, subject_type, subject_id, created, updated) VALUES %s", valueString)
	sqlArgs := append([]any{sql}, args...)
	if _, errCreate := sess.Exec(sqlArgs...); errCreate != nil {
		return fmt.Errorf("failed to move team role assignments: %w", errCreate)
	}
	return nil
}

func (p *rbacSpiceDBDataMigrator) migrateUsersTeams(sess *xorm.Session) error {
	assignments := make([]teamMember, 0)
	getRoleAssignmentsQuery := `SELECT org_id, team_id, user_id FROM team_member`
	if err := sess.SQL(getRoleAssignmentsQuery).Find(&assignments); err != nil {
		return err
	}

	ts := time.Now()
	valueStrings := make([]string, len(assignments))
	args := make([]any, 0, len(assignments)*5)
	for i, a := range assignments {
		valueStrings[i] = "(?, 'team', ?, 'member', 'user', ?, ?, ?)"
		args = append(args, a.OrgId, a.TeamId, a.UserId, ts, ts)
	}
	valueString := strings.Join(valueStrings, ",")
	sql := fmt.Sprintf("INSERT INTO ac_relation (org_id, object_type, object_id, relation, subject_type, subject_id, created, updated) VALUES %s", valueString)
	sqlArgs := append([]any{sql}, args...)
	if _, errCreate := sess.Exec(sqlArgs...); errCreate != nil {
		return fmt.Errorf("failed to move team members: %w", errCreate)
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

func (p *rbacSpiceDBDataMigrator) migrateUserManagedPermissions(sess *xorm.Session) error {
	assignments := make([]managedPermission, 0)
	getPermissionsQuery := `SELECT ur.org_id, ur.user_id, r.name, p.action, p.attribute, p.kind, p.identifier
		FROM user_role ur
		INNER JOIN role r ON r.id = ur.role_id
		INNER JOIN permission p ON r.id = p.role_id
		WHERE r.name LIKE 'managed:%'`
	if err := sess.SQL(getPermissionsQuery).Find(&assignments); err != nil {
		return err
	}

	relations := make([]relation, 0)
	for _, a := range assignments {
		objType := kindToObjectType(a.Kind)
		r := relation{
			OrgId:       a.OrgId,
			ObjectType:  objType,
			ObjectId:    a.Identifier,
			SubjectType: accesscontrol.KindUser,
			SubjectId:   strconv.FormatInt(a.UserId, 10),
			Relation:    a.Action,
		}
		relations = append(relations, r)
	}

	return p.insertRelations(sess, relations)
}

func (p *rbacSpiceDBDataMigrator) migrateTeamManagedPermissions(sess *xorm.Session) error {
	assignments := make([]managedPermission, 0)
	getPermissionsQuery := `SELECT tr.org_id, tr.team_id, r.name, p.action, p.attribute, p.kind, p.identifier
		FROM team_role tr
		INNER JOIN role r ON r.id = tr.role_id
		INNER JOIN permission p ON r.id = p.role_id
		WHERE r.name LIKE 'managed:%'`
	if err := sess.SQL(getPermissionsQuery).Find(&assignments); err != nil {
		return err
	}

	relations := make([]relation, 0)
	for _, a := range assignments {
		objType := kindToObjectType(a.Kind)
		r := relation{
			OrgId:       a.OrgId,
			ObjectType:  objType,
			ObjectId:    a.Identifier,
			SubjectType: accesscontrol.KindTeam,
			SubjectId:   strconv.FormatInt(a.TeamId, 10),
			Relation:    a.Action,
		}
		relations = append(relations, r)
	}

	return p.insertRelations(sess, relations)
}

type folder struct {
	OrgId     int64  `xorm:"org_id"`
	UID       string `xorm:"uid"`
	ParentUid string `xorm:"parent_uid"`
}

func (p *rbacSpiceDBDataMigrator) migrateFolders(sess *xorm.Session) error {
	folders := make([]folder, 0)
	getFoldersQuery := `SELECT org_id, uid, parent_uid FROM folder`
	if err := sess.SQL(getFoldersQuery).Find(&folders); err != nil {
		return err
	}

	relations := make([]relation, 0)
	for _, f := range folders {
		r := relation{
			OrgId:       f.OrgId,
			ObjectType:  accesscontrol.KindFolder,
			ObjectId:    f.UID,
			SubjectType: accesscontrol.KindFolder,
			SubjectId:   f.ParentUid,
			Relation:    accesscontrol.RelationParent,
		}
		relations = append(relations, r)
	}

	return p.insertRelations(sess, relations)
}

type dash struct {
	OrgId     int64  `xorm:"org_id"`
	UID       string `xorm:"uid"`
	FolderUid string `xorm:"folder_uid"`
}

func (p *rbacSpiceDBDataMigrator) migrateDashboards(sess *xorm.Session) error {
	dashboards := make([]dash, 0)
	getDashboardsQuery := `SELECT org_id, uid, folder_uid FROM dashboard WHERE is_folder = 0`
	if err := sess.SQL(getDashboardsQuery).Find(&dashboards); err != nil {
		return err
	}

	relations := make([]relation, 0)
	for _, d := range dashboards {
		r := relation{
			OrgId:       d.OrgId,
			ObjectType:  accesscontrol.KindDashboard,
			ObjectId:    d.UID,
			SubjectType: accesscontrol.KindFolder,
			SubjectId:   d.FolderUid,
			Relation:    accesscontrol.RelationParent,
		}
		relations = append(relations, r)
	}

	return p.insertRelations(sess, relations)
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

func (p *rbacSpiceDBDataMigrator) insertRelations(sess *xorm.Session, relations []relation) error {
	ts := time.Now()
	valueStrings := make([]string, len(relations))
	args := make([]any, 0, len(relations)*8)
	for i, r := range relations {
		valueStrings[i] = "(?, ?, ?, ?, ?, ?, ?, ?)"
		args = append(args, r.OrgId, r.ObjectType, r.ObjectId, r.Relation, r.SubjectType, r.SubjectId, ts, ts)
	}
	valueString := strings.Join(valueStrings, ",")
	sql := fmt.Sprintf("INSERT INTO ac_relation (org_id, object_type, object_id, relation, subject_type, subject_id, created, updated) VALUES %s", valueString)
	sqlArgs := append([]any{sql}, args...)
	if _, errCreate := sess.Exec(sqlArgs...); errCreate != nil {
		return fmt.Errorf("failed to migrate managed permissions: %w", errCreate)
	}

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
