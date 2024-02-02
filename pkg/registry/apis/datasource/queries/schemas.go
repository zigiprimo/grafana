package queries

import (
	"fmt"
	"net/http"

	"k8s.io/kube-openapi/pkg/spec3"
	"k8s.io/kube-openapi/pkg/validation/spec"

	query "github.com/grafana/grafana/pkg/apis/query/v0alpha1"
	"github.com/grafana/grafana/pkg/services/apiserver/builder"
)

type QueryInfoHandler struct {
	Versions []QuerySchema
}

func NewQueryInfoHandler() *QueryInfoHandler {
	h := &QueryInfoHandler{
		Versions: []QuerySchema{
			{
				QueryType: "Hello",
				Properties: map[string]spec.Schema{
					"aaa": *spec.BoolProperty(),
					"bbb": *spec.StringProperty(),
				},
				Changelog: []string{
					"thing one",
					"thing two",
					"thing three",
				},
			},
			{
				QueryType: "Hello/2",
				Properties: map[string]spec.Schema{
					"aaa": *spec.BoolProperty(),
					"bbb": *spec.StringProperty(),
				},
				Changelog: []string{
					"thing one",
					"thing two",
					"thing three",
				},
			},
		},
	}
	return h
}

type QuerySchema struct {
	// When set, this will link
	// To bump schema version, append version number to the query type
	// must be unique in the
	// example GetXYZ/v0alpha1
	QueryType string

	// The OpenAPI definition for non-common field fields
	Properties map[string]spec.Schema

	// Examples
	Examples []ExampleQueryWrapper

	// What changed from the previous version
	Changelog []string
}

type ExampleQueryWrapper struct {
	UID         string
	Name        string
	Description string
	Query       query.GenericDataQuery
}

func (s *QuerySchema) handleDiscovery(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		_, _ = w.Write([]byte("TODO, get...."))
		return

	case http.MethodPost:
		_, _ = w.Write([]byte("TODO, test validation"))
		return
	}

	_, _ = w.Write([]byte("error?  unsupported"))
}

func (s *QuerySchema) handleExamples(w http.ResponseWriter, r *http.Request) {
	_, _ = w.Write([]byte("Root level handler (aaa)"))
}

// Register additional routes with the server
func (b *QueryInfoHandler) GetQueryRoutes() []builder.APIRouteHandler {
	routes := []builder.APIRouteHandler{}
	for _, version := range b.Versions {
		routes = append(routes, builder.APIRouteHandler{
			Path: fmt.Sprintf("query/type/%s", version.QueryType),
			Spec: &spec3.PathProps{
				Get: &spec3.Operation{
					OperationProps: spec3.OperationProps{
						Parameters: []*spec3.Parameter{
							// {ParameterProps: spec3.ParameterProps{
							// 	Name: "a",
							// }},
						},
						Responses: &spec3.Responses{
							ResponsesProps: spec3.ResponsesProps{
								StatusCodeResponses: map[int]*spec3.Response{
									200: {
										ResponseProps: spec3.ResponseProps{
											Description: "OK",
											Content: map[string]*spec3.MediaType{
												"text/plain": {
													MediaTypeProps: spec3.MediaTypeProps{
														Schema: &spec.Schema{
															SchemaProps: spec.SchemaProps{
																Type: []string{"string"},
															},
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
			Handler: version.handleDiscovery,
		})
	}
	return routes
}
