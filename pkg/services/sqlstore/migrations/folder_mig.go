package migrations

import (
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana/pkg/services/folder"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
	"xorm.io/xorm"
)

func addFolderMigrations(mg *migrator.Migrator) {
	mg.AddMigration("create folder table", migrator.NewAddTableMigration(folderv1()))

	mg.AddMigration("Add index for parent_uid", migrator.NewAddIndexMigration(folderv1(), &migrator.Index{
		Cols: []string{"parent_uid", "org_id"},
	}))

	mg.AddMigration("Add unique index for folder.uid and folder.org_id", migrator.NewAddIndexMigration(folderv1(), &migrator.Index{
		Type: migrator.UniqueIndex,
		Cols: []string{"uid", "org_id"},
	}))

	mg.AddMigration("Update folder title length", migrator.NewTableCharsetMigration("folder", []*migrator.Column{
		// it should be lower than 191 (the maximum length of indexable VARCHAR fields in MySQL 5.6 <= with utf8mb4 encoding)
		// but the title column length of the dashboard table whose values are copied into this column is 189
		{Name: "title", Type: migrator.DB_NVarchar, Length: 189, Nullable: false},
	}))

	mg.AddMigration("Add unique index for folder.title and folder.parent_uid", migrator.NewAddIndexMigration(folderv1(), &migrator.Index{
		Type: migrator.UniqueIndex,
		Cols: []string{"title", "parent_uid"},
	}))
	mg.AddMigration("Remove unique index for folder.title and folder.parent_uid", migrator.NewDropIndexMigration(folderv1(), &migrator.Index{
		Type: migrator.UniqueIndex,
		Cols: []string{"title", "parent_uid"},
	}))

	mg.AddMigration("Add unique index for title, parent_uid, and org_id", migrator.NewAddIndexMigration(folderv1(), &migrator.Index{
		Type: migrator.UniqueIndex,
		Cols: []string{"title", "parent_uid", "org_id"},
	}))

	// add column to store folder path
	mg.AddMigration("Add column path in folder", migrator.NewAddColumnMigration(folderv1(), &migrator.Column{
		Name: "path", Type: migrator.DB_NVarchar, Nullable: true, Length: 360,
	}))

	// Adds folder path
	mg.AddMigration("Add folder path", &AddFolderPathMigration{})
}

type AddFolderPathMigration struct {
	migrator.MigrationBase
}

func (m *AddFolderPathMigration) SQL(dialect migrator.Dialect) string {
	return "code migration"
}

func (m *AddFolderPathMigration) Exec(sess *xorm.Session, mg *migrator.Migrator) error {
	var folders []*folder.Folder
	err := sess.SQL("SELECT * FROM folder WHERE parent_uid IS NULL").Find(&folders)
	if err != nil {
		return err
	}

	for _, f := range folders {
		folderPath := fmt.Sprintf("/%s", f.UID)
		res, err := sess.Exec("UPDATE folder SET path = ? WHERE uid = ?", folderPath, f.UID)
		if affected, err := res.RowsAffected(); affected == 0 || err != nil {
			log.DefaultLogger.Error("Nothing to update", "err", err)
		}
		f.Path = folderPath
		err = updateChildrenFoldersPathRecursively(f, sess)
		if err != nil {
			return err
		}
	}

	return nil
}

func updateChildrenFoldersPathRecursively(parent *folder.Folder, sess *xorm.Session) error {
	var children []*folder.Folder

	err := sess.SQL("SELECT * FROM folder WHERE parent_uid=?", parent.UID).Find(&children)
	if err != nil {
		return err
	}

	for _, child := range children {
		folderPath := fmt.Sprintf("%s/%s", parent.Path, child.UID)
		res, err := sess.Exec("UPDATE folder SET path = ? WHERE uid = ?", folderPath, child.UID)
		if affected, err := res.RowsAffected(); affected == 0 || err != nil {
			log.DefaultLogger.Error("Nothing to update", "err", err)
		}
		child.Path = folderPath
		err = updateChildrenFoldersPathRecursively(child, sess)
		if err != nil {
			return err
		}
	}

	return nil
}

func folderv1() migrator.Table {
	// Do not make any changes to this schema; introduce new migrations for further changes
	return migrator.Table{
		Name: "folder",
		Columns: []*migrator.Column{
			{Name: "id", Type: migrator.DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "uid", Type: migrator.DB_NVarchar, Length: 40},
			{Name: "org_id", Type: migrator.DB_BigInt, Nullable: false},
			{Name: "title", Type: migrator.DB_NVarchar, Length: 255, Nullable: false},
			{Name: "description", Type: migrator.DB_NVarchar, Length: 255, Nullable: true},
			{Name: "parent_uid", Type: migrator.DB_NVarchar, Length: 40, Nullable: true},
			{Name: "created", Type: migrator.DB_DateTime, Nullable: false},
			{Name: "updated", Type: migrator.DB_DateTime, Nullable: false},
		},
	}
}
