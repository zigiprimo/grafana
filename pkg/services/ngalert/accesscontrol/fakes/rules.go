package fakes

import (
	"context"

	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/auth/identity"
	"github.com/grafana/grafana/pkg/services/ngalert/models"
	"github.com/grafana/grafana/pkg/services/ngalert/store"
)

type FakeRuleServiceCall struct {
	MethodName string
	User       identity.Requester
	Evaluator  accesscontrol.Evaluator
	Action     func() string
	Rule       *models.AlertRule
	Rules      models.RulesGroup
	Change     *store.GroupDelta
}

type FakeRuleService struct {
	HasAccessFunc                        func(ctx context.Context, user identity.Requester, evaluator accesscontrol.Evaluator) (bool, error)
	HasAccessOrErrorFunc                 func(ctx context.Context, user identity.Requester, evaluator accesscontrol.Evaluator, action func() string) error
	AuthorizeDatasourceAccessForRuleFunc func(ctx context.Context, user identity.Requester, rule *models.AlertRule) error
	HasAccessToRuleGroupFunc             func(ctx context.Context, user identity.Requester, rules models.RulesGroup) (bool, error)
	AuthorizeAccessToRuleGroupFunc       func(ctx context.Context, user identity.Requester, rules models.RulesGroup) error
	AuthorizeRuleChangesFunc             func(ctx context.Context, user identity.Requester, change *store.GroupDelta) error
	Calls                                []FakeRuleServiceCall
}

func (f *FakeRuleService) HasAccess(ctx context.Context, user identity.Requester, evaluator accesscontrol.Evaluator) (bool, error) {
	f.Calls = append(f.Calls, FakeRuleServiceCall{MethodName: "HasAccess", User: user, Evaluator: evaluator})
	return f.HasAccessFunc(ctx, user, evaluator)
}

func (f *FakeRuleService) HasAccessOrError(ctx context.Context, user identity.Requester, evaluator accesscontrol.Evaluator, action func() string) error {
	f.Calls = append(f.Calls, FakeRuleServiceCall{MethodName: "HasAccessOrError", User: user, Evaluator: evaluator, Action: action})
	return f.HasAccessOrErrorFunc(ctx, user, evaluator, action)
}

func (f *FakeRuleService) AuthorizeDatasourceAccessForRule(ctx context.Context, user identity.Requester, rule *models.AlertRule) error {
	f.Calls = append(f.Calls, FakeRuleServiceCall{MethodName: "AuthorizeDatasourceAccessForRule", User: user, Rule: rule})
	return f.AuthorizeDatasourceAccessForRuleFunc(ctx, user, rule)
}

func (f *FakeRuleService) HasAccessToRuleGroup(ctx context.Context, user identity.Requester, rules models.RulesGroup) (bool, error) {
	f.Calls = append(f.Calls, FakeRuleServiceCall{MethodName: "HasAccessToRuleGroup", User: user, Rules: rules})
	return f.HasAccessToRuleGroupFunc(ctx, user, rules)
}

func (f *FakeRuleService) AuthorizeAccessToRuleGroup(ctx context.Context, user identity.Requester, rules models.RulesGroup) error {
	f.Calls = append(f.Calls, FakeRuleServiceCall{MethodName: "AuthorizeAccessToRuleGroup", User: user, Rules: rules})
	return f.AuthorizeAccessToRuleGroupFunc(ctx, user, rules)
}

func (f *FakeRuleService) AuthorizeRuleChanges(ctx context.Context, user identity.Requester, change *store.GroupDelta) error {
	f.Calls = append(f.Calls, FakeRuleServiceCall{MethodName: "AuthorizeRuleChanges", User: user, Change: change})
	return f.AuthorizeRuleChangesFunc(ctx, user, change)
}
