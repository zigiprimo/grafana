package snapshots

// Correlation is the model for correlations definitions
// swagger:model
type SnapshotData struct {
	// Unique identifier of the correlation
	// example: 50xhMlg9k
	UID string `json:"uid" xorm:"pk 'uid'"`
	// UID of the data source the correlation originates from
	// example:d0oxYRg4z
	Data string `json:"data" xorm:"data"`
}

type GetSnapshotDataCommand struct {
	// UID of the data source for which correlation is created.
	UID string `json:"uid"`
}

type CreateSnapshotDataCommand struct {
	Data string `json:"data"`
}

type UpdateSnapshotDataByIdCommand struct {
	UID  string `json:"uid"`
	Data string `json:"data"`
}

type DeleteSnapshotDataByIdCommand struct {
	UID string `json:"uid"`
}

type CreateSnapshotResponse struct {
	Message string `json:"message"`
}
