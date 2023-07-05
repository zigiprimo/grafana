package user

import (
	"time"

	"github.com/grafana/grafana/pkg/models/roletype"
)

type UserContext interface {
	GetUserID() int64
	GetOrgID() int64
	GetOrgName() string
	GetOrgRole() roletype.RoleType
	GetLogin() string
	GetName() string
	GetEmail() string
	GetApiKeyID() int64
	GetIsServiceAccount() bool
	GetOrgCount() int
	GetIsGrafanaAdmin() bool
	GetIsAnonymous() bool
	GetIsDisabled() bool
	GetHelpFlags1() HelpFlags1
	GetLastSeenAt() time.Time
	GetTeams() []int64
	GetPermissions() map[int64]map[string][]string
}

type SignedInUser struct {
	UserID           int64 `xorm:"user_id"`
	OrgID            int64 `xorm:"org_id"`
	OrgName          string
	OrgRole          roletype.RoleType
	Login            string
	Name             string
	Email            string
	ApiKeyID         int64 `xorm:"api_key_id"`
	IsServiceAccount bool  `xorm:"is_service_account"`
	OrgCount         int
	IsGrafanaAdmin   bool
	IsAnonymous      bool
	IsDisabled       bool
	HelpFlags1       HelpFlags1
	LastSeenAt       time.Time
	Teams            []int64
	// Permissions grouped by orgID and actions
	Permissions map[int64]map[string][]string `json:"-"`
}

func (u *SignedInUser) GetUserID() int64 {
	return u.UserID
}

func (u *SignedInUser) GetOrgID() int64 {
	return u.OrgID
}

func (u *SignedInUser) GetOrgName() string {
	return u.OrgName
}

func (u *SignedInUser) GetOrgRole() roletype.RoleType {
	return u.OrgRole
}

func (u *SignedInUser) GetLogin() string {
	return u.Login
}

func (u *SignedInUser) GetName() string {
	return u.Name
}

func (u *SignedInUser) GetEmail() string {
	return u.Email
}

func (u *SignedInUser) GetApiKeyID() int64 {
	return u.ApiKeyID
}

func (u *SignedInUser) GetIsServiceAccount() bool {
	return u.IsServiceAccount
}

func (u *SignedInUser) GetOrgCount() int {
	return u.OrgCount
}

func (u *SignedInUser) GetIsGrafanaAdmin() bool {
	return u.IsGrafanaAdmin
}

func (u *SignedInUser) GetIsAnonymous() bool {
	return u.IsAnonymous
}

func (u *SignedInUser) GetIsDisabled() bool {
	return u.IsDisabled
}

func (u *SignedInUser) GetHelpFlags1() HelpFlags1 {
	return u.HelpFlags1
}

func (u *SignedInUser) GetLastSeenAt() time.Time {
	return u.LastSeenAt
}

func (u *SignedInUser) GetTeams() []int64 {
	return u.Teams
}

func (u *SignedInUser) GetPermissions() map[int64]map[string][]string {
	return u.Permissions
}
