package provisioning

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/auth/identity"
	"github.com/grafana/grafana/pkg/services/ngalert/accesscontrol/fakes"
	"github.com/grafana/grafana/pkg/services/ngalert/models"
	"github.com/grafana/grafana/pkg/services/user"
)

func TestAuthorizeAccessToRuleGroup(t *testing.T) {
	testUser := &user.SignedInUser{}
	rules := models.GenerateAlertRules(1, models.AlertRuleGen())

	t.Run("AuthorizeAccessToRuleGroup should return nil when CanReadAllRules returns true", func(t *testing.T) {
		rs := &fakes.FakeRuleService{}
		provisioner := provisioningAccessControl{
			ruleService: rs,
		}

		rs.HasAccessFunc = func(ctx context.Context, user identity.Requester, evaluator accesscontrol.Evaluator) (bool, error) {
			return true, nil
		}

		err := provisioner.AuthorizeAccessToRuleGroup(context.Background(), testUser, rules)
		require.NoError(t, err)

		require.Len(t, rs.Calls, 1)
		assert.Equal(t, "HasAccess", rs.Calls[0].MethodName)
		assert.Equal(t, "", rs.Calls[0].Evaluator.GoString())

	})

	//
	// t.Run("AuthorizeAccessToRuleGroup should return error when CanReadAllRules returns false", func(t *testing.T) {
	// 	provisioner := yourpack.NewProvisioningAccessControl()
	// 	ctx := context.TODO()
	//
	// 	err := provisioner.AuthorizeAccessToRuleGroup(ctx, testUser, testRules)
	// 	assert.Error(t, err)
	// })

	// Add more test cases as required for your use case.
}
