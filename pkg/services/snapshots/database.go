package snapshots

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/util"
)

func (s *SnapshotDataService) getSnapshotDataByID(ctx context.Context, cmd GetSnapshotDataCommand) (SnapshotData, error) {
	snapshots := make([]SnapshotData, 0)

	//refactor this to find one
	err := s.SQLStore.WithDbSession(ctx, func(session *db.Session) error {
		return session.Select("snapshot_data.*").Where("snapshot_data.uid = ?", cmd.UID).Find(&snapshots)
	})
	if err != nil {
		return SnapshotData{}, err
	}

	//todo
	return snapshots[0], nil
}

func (s *SnapshotDataService) createSnapshotData(ctx context.Context, cmd CreateSnapshotDataCommand) error {
	return s.SQLStore.WithTransactionalDbSession(ctx, func(sess *db.Session) error {
		var rawSQL = "INSERT INTO snapshot_data (uid, data) VALUES (?, ?)"
		_, err := sess.Exec(rawSQL, util.GenerateShortUID(), cmd.Data)
		return err
	})
}

func (s *SnapshotDataService) deleteSnapshotDataById(ctx context.Context, cmd DeleteSnapshotDataByIdCommand) error {
	return s.SQLStore.WithTransactionalDbSession(ctx, func(sess *db.Session) error {
		var rawSQL = "DELETE FROM snapshot_data WHERE uid = ?"
		_, err := sess.Exec(rawSQL, cmd.UID)
		return err
	})
}
