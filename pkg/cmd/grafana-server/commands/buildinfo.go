package commands

import (
	"github.com/grafana/grafana/pkg/extensions"
	"github.com/grafana/grafana/pkg/setting"
)

func setBuildInfo(opts ServerOptions) {
	setting.BuildVersion = opts.Version
	setting.BuildCommit = opts.Commit
	setting.EnterpriseBuildCommit = opts.EnterpriseCommit
	setting.BuildBranch = opts.BuildBranch
	setting.IsEnterprise = extensions.IsEnterprise
	setting.Packaging = validPackaging(Packaging)
}
