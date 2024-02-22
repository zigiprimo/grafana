package accesscontrol

import (
	"fmt"
	"strings"
	"time"

	"xorm.io/xorm"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

const RBACNGDataMigrationID = "migrating permissions into ac_relation table"

func AddRBACNGMigration(mg *migrator.Migrator) {
	acRelationV1 := migrator.Table{
		Name: "ac_relation",
		Columns: []*migrator.Column{
			{Name: "id", Type: migrator.DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "org_id", Type: migrator.DB_BigInt},
			{Name: "object_id", Type: migrator.DB_Varchar, Length: 190, Nullable: false},
			{Name: "object_type", Type: migrator.DB_Varchar, Length: 40, Nullable: false},
			{Name: "relation", Type: migrator.DB_Varchar, Length: 40, Nullable: false},
			{Name: "subject_id", Type: migrator.DB_Varchar, Length: 190, Nullable: false},
			{Name: "subject_type", Type: migrator.DB_Varchar, Length: 40, Nullable: false},
			{Name: "created", Type: migrator.DB_DateTime, Nullable: false},
			{Name: "updated", Type: migrator.DB_DateTime, Nullable: false},
		},
		Indices: []*migrator.Index{
			{
				Cols: []string{"org_id", "object_id", "object_type", "relation", "subject_id", "subject_type"},
				Name: "UQE_org_object_relation_subject",
				Type: migrator.UniqueIndex,
			},
		},
	}

	mg.AddMigration("create ac_relation table", migrator.NewAddTableMigration(acRelationV1))

	//-------  indexes ------------------
	mg.AddMigration("add unique index ac_relation.org_object_relation_subject", migrator.NewAddIndexMigration(acRelationV1, acRelationV1.Indices[0]))
}

func AddRBACNGDataMigration(mg *migrator.Migrator) {
	mg.AddMigration(RBACNGDataMigrationID, &rbacNGDataMigrator{})
}

var _ migrator.CodeMigration = new(rbacNGDataMigrator)

type rbacNGDataMigrator struct {
	migrator.MigrationBase
	logger log.Logger
}

func (p *rbacNGDataMigrator) SQL(dialect migrator.Dialect) string {
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

func (p *rbacNGDataMigrator) Exec(sess *xorm.Session, migrator *migrator.Migrator) error {
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

	//return errors.New("not implemented")
	return nil
}

func (p *rbacNGDataMigrator) migrateRoleAssignments(sess *xorm.Session) error {
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

func (p *rbacNGDataMigrator) migrateTeamRoleAssignments(sess *xorm.Session) error {
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

func (p *rbacNGDataMigrator) migrateUsersTeams(sess *xorm.Session) error {
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

func (p *rbacNGDataMigrator) migratePermissions(sess *xorm.Session) error {
	permissions := make([]*accesscontrol.Permission, 0)
	getRoleAssignmentsQuery := `SELECT ur.org_id, ur.user_id, r.name FROM user_role ur INNER JOIN role r ON r.id = ur.role_id`
	if err := sess.SQL(getRoleAssignmentsQuery).Find(&permissions); err != nil {
		return err
	}
	p.logger.Debug("assignments", "assignments", permissions)
	return nil
}
