package provisioning

import (
	"context"

	ac "github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/auth/identity"
	"github.com/grafana/grafana/pkg/services/ngalert/accesscontrol"
	"github.com/grafana/grafana/pkg/services/ngalert/models"
	"github.com/grafana/grafana/pkg/services/ngalert/store"
)

type ruleService interface {
	HasAccess(ctx context.Context, user identity.Requester, evaluator ac.Evaluator) (bool, error)
	AuthorizeAccessToRuleGroup(ctx context.Context, user identity.Requester, rules models.RulesGroup) error
	AuthorizeRuleChanges(ctx context.Context, user identity.Requester, change *store.GroupDelta) error
}

func NewRuleAccessControlService(ac *accesscontrol.RuleService) RuleAccessControlService {
	return &provisioningAccessControl{
		ruleService: ac,
	}
}

type provisioningAccessControl struct {
	ruleService
}

func (p *provisioningAccessControl) AuthorizeAccessToRuleGroup(ctx context.Context, user identity.Requester, rules models.RulesGroup) error {
	if can, err := p.CanReadAllRules(ctx, user); can || err != nil {
		return err
	}
	return p.ruleService.AuthorizeAccessToRuleGroup(ctx, user, rules)
}

func (p *provisioningAccessControl) AuthorizeRuleChanges(ctx context.Context, user identity.Requester, change *store.GroupDelta) error {
	if can, err := p.CanWriteAllRules(ctx, user); can || err != nil {
		return err
	}
	return p.ruleService.AuthorizeRuleChanges(ctx, user, change)
}

func (p *provisioningAccessControl) CanReadAllRules(ctx context.Context, user identity.Requester) (bool, error) {
	return p.HasAccess(ctx, user, ac.EvalAny(
		ac.EvalPermission(ac.ActionAlertingProvisioningRead),
		ac.EvalPermission(ac.ActionAlertingProvisioningReadSecrets),
	))
}

func (p *provisioningAccessControl) CanWriteAllRules(ctx context.Context, user identity.Requester) (bool, error) {
	return p.HasAccess(ctx, user, ac.EvalPermission(ac.ActionAlertingProvisioningWrite))
}
