package accesscontrol

import (
	"xorm.io/xorm"

	"github.com/grafana/grafana/pkg/infra/log"
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
	mg.AddMigration(RBACNGDataMigrationID, &alertingScopeRemovalMigrator{})
}

var _ migrator.CodeMigration = new(rbacNGDataMigrator)

type rbacNGDataMigrator struct {
	migrator.MigrationBase
}

func (p *rbacNGDataMigrator) SQL(dialect migrator.Dialect) string {
	return CodeMigrationSQL
}

func (p *rbacNGDataMigrator) Exec(sess *xorm.Session, migrator *migrator.Migrator) error {
	logger := log.New("RBAC NG data migrator")
	logger.Debug("rbac ng data migration")

	return nil
}
