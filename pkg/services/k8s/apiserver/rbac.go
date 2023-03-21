package apiserver

import (
	"context"
	coreV1 "k8s.io/api/core/v1"
	rbacV1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

const (
	GrafanaSystemRBACResourcesName = "grafana-system"

	GrafanaSystemManagedByTagKey   = "managed-by"
	GrafanaSystemManagedByTagValue = "grafana-o11y-apiserver"
)

type BasicRBAC struct {
	clientset *kubernetes.Clientset
}

func NewBasicRBAC(clientset *kubernetes.Clientset) *BasicRBAC {
	return &BasicRBAC{clientset: clientset}
}

func (rbac *BasicRBAC) UpsertGrafanaSystemServiceAccount() error {
	sa := rbac.clientset.CoreV1().ServiceAccounts("default")

	_, err := sa.Get(context.Background(), GrafanaSystemRBACResourcesName, metav1.GetOptions{})
	if err != nil {
		newSA := coreV1.ServiceAccount{
			TypeMeta: metav1.TypeMeta{
				APIVersion: "v1",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name: GrafanaSystemRBACResourcesName,
				Labels: map[string]string{
					GrafanaSystemManagedByTagKey: GrafanaSystemManagedByTagValue,
				},
			},
		}

		_, err := sa.Create(context.Background(), &newSA, metav1.CreateOptions{
			FieldManager: GrafanaSystemManagedByTagValue,
		})
		return err
	}

	return nil
}

func (rbac *BasicRBAC) UpsertGrafanaSystemClusterRoleBinding() error {
	crb := rbac.clientset.RbacV1().ClusterRoleBindings()

	_, err := crb.Get(context.Background(), GrafanaSystemRBACResourcesName, metav1.GetOptions{})
	if err != nil {
		newCRB := rbacV1.ClusterRoleBinding{
			TypeMeta: metav1.TypeMeta{
				APIVersion: "v1",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name: GrafanaSystemRBACResourcesName,
				Labels: map[string]string{
					GrafanaSystemManagedByTagKey: GrafanaSystemManagedByTagValue,
				},
			},
			RoleRef: rbacV1.RoleRef{
				Name: "cluster-admin",
				Kind: "ClusterRole",
			},
			Subjects: []rbacV1.Subject{rbacV1.Subject{
				Name:      "grafana-system",
				Kind:      "ServiceAccount",
				Namespace: "default",
			}},
		}

		_, err := crb.Create(context.Background(), &newCRB, metav1.CreateOptions{
			FieldManager: GrafanaSystemManagedByTagValue,
		})
		return err
	}

	return nil
}

func (rbac *BasicRBAC) UpsertGrafanaSystemClusterRole() error {
	cr := rbac.clientset.RbacV1().ClusterRoles()

	_, err := cr.Get(context.Background(), GrafanaSystemRBACResourcesName, metav1.GetOptions{})
	if err != nil {
		newCR := rbacV1.ClusterRole{
			TypeMeta: metav1.TypeMeta{
				APIVersion: "v1",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name: GrafanaSystemRBACResourcesName,
				Labels: map[string]string{
					GrafanaSystemManagedByTagKey: GrafanaSystemManagedByTagValue,
				},
			},
		}

		_, err := cr.Create(context.Background(), &newCR, metav1.CreateOptions{})
		return err
	}

	return nil
}
