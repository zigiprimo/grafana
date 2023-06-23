package entity

import (
	"github.com/grafana/dskit/services"
)

type EntityStoreService interface {
	services.NamedService
	EntityStoreServer
}

type EntityStoreAdminService interface {
	services.NamedService
	EntityStoreAdminServer
}
