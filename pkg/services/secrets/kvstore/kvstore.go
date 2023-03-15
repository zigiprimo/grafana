package kvstore

import (
	"context"
)

const (
	// Wildcard to query all organizations
	AllOrganizations = -1
)

// SecretsKVStore is an interface for k/v store.
type SecretsKVStore interface {
	Get(ctx context.Context, orgId int64, namespace string, typ string) (string, bool, error)
	Set(ctx context.Context, orgId int64, namespace string, typ string, value string) error
	Del(ctx context.Context, orgId int64, namespace string, typ string) error
	Keys(ctx context.Context, orgId int64, namespace string, typ string) ([]Key, error)
	Rename(ctx context.Context, orgId int64, namespace string, typ string, newNamespace string) error
	GetAll(ctx context.Context) ([]Item, error)
}
