package annotationsimpl

import (
	"testing"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/tag/tagimpl"
	"github.com/grafana/grafana/pkg/setting"
)

func TestIntegrationXormAnnotations(t *testing.T) {
	testIntegrationAnnotations(t, func(db db.DB, cfg *setting.Cfg, maximumTagsLength int64) store {
		return &xormRepositoryImpl{
			db:                db,
			cfg:               setting.NewCfg(),
			log:               log.New("annotation.xorm.test"),
			tagService:        tagimpl.ProvideService(db, cfg),
			maximumTagsLength: maximumTagsLength}
	})
}
