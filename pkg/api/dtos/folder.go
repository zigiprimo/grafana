package dtos

import (
	"time"

	kfolder "github.com/grafana/grafana/pkg/kinds/folder"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
)

type Folder struct {
	kfolder.Folder
	Id            int64                  `json:"id"`
	Url           string                 `json:"url"`
	HasACL        bool                   `json:"hasAcl" xorm:"has_acl"`
	CanSave       bool                   `json:"canSave"`
	CanEdit       bool                   `json:"canEdit"`
	CanAdmin      bool                   `json:"canAdmin"`
	CanDelete     bool                   `json:"canDelete"`
	CreatedBy     string                 `json:"createdBy"`
	Created       time.Time              `json:"created"`
	UpdatedBy     string                 `json:"updatedBy"`
	Updated       time.Time              `json:"updated"`
	Version       int                    `json:"version,omitempty"`
	AccessControl accesscontrol.Metadata `json:"accessControl,omitempty"`
}

type FolderSearchHit struct {
	Id            int64                  `json:"id"`
	Uid           string                 `json:"uid"`
	Title         string                 `json:"title"`
	AccessControl accesscontrol.Metadata `json:"accessControl,omitempty"`
	ParentUID     string                 `json:"parentUid,omitempty"`
}
