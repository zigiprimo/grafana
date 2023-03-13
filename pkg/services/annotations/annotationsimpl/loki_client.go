package annotationsimpl

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/datasources"
	"github.com/weaveworks/common/http/client"
)

const defaultClientTimeout = 30 * time.Second

type lokiConfig struct {
	ReadPathURL       *url.URL
	WritePathURL      *url.URL
	BasicAuthUser     string
	BasicAuthPassword string
	TenantID          string
	ExternalLabels    map[string]string
}

func newLokiConfig(ds *datasources.DataSource) (lokiConfig, error) {
	lokiURL, err := url.Parse(ds.URL)
	if err != nil {
		// TODO change error to errutil
		return lokiConfig{}, fmt.Errorf("failed to parse loki URL: %s", ds.URL)
	}

	return lokiConfig{
		ReadPathURL:       lokiURL,
		WritePathURL:      lokiURL,
		BasicAuthUser:     ds.BasicAuthUser,
		BasicAuthPassword: ds.BasicAuthPassword,
		TenantID:          "?",
		ExternalLabels:    make(map[string]string),
	}, nil
}

type httpLokiClient struct {
	client client.Requester
	cfg    lokiConfig
	log    log.Logger
}

// Kind of Operation (=, !=, =~, !~)
type Operator string

const (
	// Equal operator (=)
	eq Operator = "="
	// Not Equal operator (!=)
	neq Operator = "!="
	// Equal operator supporting RegEx (=~)
	eqRegEx Operator = "=~"
	// Not Equal operator supporting RegEx (!~)
	neqRegEx Operator = "!~"
)

type selector struct {
	// label to Select
	label string
	op    Operator
	// value that is expected
	value string
}

func newLokiClient(cfg lokiConfig, req client.Requester, logger log.Logger) *httpLokiClient {
	return &httpLokiClient{
		client: req,
		cfg:    cfg,
		log:    logger.New("protocol", "http"),
	}
}

func (c *httpLokiClient) ping(ctx context.Context) error {
	uri := c.cfg.ReadPathURL.JoinPath("/loki/api/v1/labels")
	req, err := http.NewRequest(http.MethodGet, uri.String(), nil)
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}
	c.setAuthAndTenantHeaders(req)

	req = req.WithContext(ctx)
	res, err := c.client.Do(req)
	if res != nil {
		defer func() {
			if err := res.Body.Close(); err != nil {
				c.log.Warn("Failed to close response body", "err", err)
			}
		}()
	}
	if err != nil {
		return fmt.Errorf("error sending request: %w", err)
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("ping request to loki endpoint returned a non-200 status code: %d", res.StatusCode)
	}
	c.log.Debug("Ping request to Loki endpoint succeeded", "status", res.StatusCode)
	return nil
}

type stream struct {
	Stream map[string]string `json:"stream"`
	Values []sample          `json:"values"`
}

type sample struct {
	T time.Time
	V string
}

func (r *sample) MarshalJSON() ([]byte, error) {
	return json.Marshal([2]string{
		fmt.Sprintf("%d", r.T.UnixNano()), r.V,
	})
}

func (r *sample) UnmarshalJSON(b []byte) error {
	// A Loki stream sample is formatted like a list with two elements, [At, Val]
	// At is a string wrapping a timestamp, in nanosecond unix epoch.
	// Val is a string containing the log line.
	var tuple [2]string
	if err := json.Unmarshal(b, &tuple); err != nil {
		return fmt.Errorf("failed to deserialize sample in Loki response: %w", err)
	}
	nano, err := strconv.ParseInt(tuple[0], 10, 64)
	if err != nil {
		return fmt.Errorf("timestamp in Loki sample not convertible to nanosecond epoch: %v", tuple[0])
	}
	r.T = time.Unix(0, nano)
	r.V = tuple[1]
	return nil
}

func (c *httpLokiClient) push(ctx context.Context, s []stream) error {
	body := struct {
		Streams []stream `json:"streams"`
	}{Streams: s}
	enc, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to serialize Loki payload: %w", err)
	}

	uri := c.cfg.WritePathURL.JoinPath("/loki/api/v1/push")
	req, err := http.NewRequest(http.MethodPost, uri.String(), bytes.NewBuffer(enc))
	if err != nil {
		return fmt.Errorf("failed to create Loki request: %w", err)
	}

	c.setAuthAndTenantHeaders(req)
	req.Header.Add("content-type", "application/json")

	req = req.WithContext(ctx)
	resp, err := c.client.Do(req)
	if resp != nil {
		defer func() {
			if err := resp.Body.Close(); err != nil {
				c.log.Warn("Failed to close response body", "err", err)
			}
		}()
	}
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		byt, _ := io.ReadAll(resp.Body)
		if len(byt) > 0 {
			c.log.Error("Error response from Loki", "response", string(byt), "status", resp.StatusCode)
		} else {
			c.log.Error("Error response from Loki with an empty body", "status", resp.StatusCode)
		}
		return fmt.Errorf("received a non-200 response from loki, status: %d", resp.StatusCode)
	}
	return nil
}

func (c *httpLokiClient) setAuthAndTenantHeaders(req *http.Request) {
	if c.cfg.BasicAuthUser != "" || c.cfg.BasicAuthPassword != "" {
		req.SetBasicAuth(c.cfg.BasicAuthUser, c.cfg.BasicAuthPassword)
	}

	if c.cfg.TenantID != "" {
		req.Header.Add("X-Scope-OrgID", c.cfg.TenantID)
	}
}
func (c *httpLokiClient) rangeQuery(ctx context.Context, selectors []selector, start, end int64) (queryRes, error) {
	// Run the pre-flight checks for the query.
	if len(selectors) == 0 {
		return queryRes{}, fmt.Errorf("at least one selector required to query")
	}
	if start > end {
		return queryRes{}, fmt.Errorf("start time cannot be after end time")
	}

	queryURL := c.cfg.ReadPathURL.JoinPath("/loki/api/v1/query_range")

	values := url.Values{}
	values.Set("query", selectorString(selectors))
	values.Set("start", fmt.Sprintf("%d", start))
	values.Set("end", fmt.Sprintf("%d", end))

	queryURL.RawQuery = values.Encode()

	req, err := http.NewRequest(http.MethodGet,
		queryURL.String(), nil)
	if err != nil {
		return queryRes{}, fmt.Errorf("error creating request: %w", err)
	}

	req = req.WithContext(ctx)
	c.setAuthAndTenantHeaders(req)

	res, err := c.client.Do(req)
	if err != nil {
		return queryRes{}, fmt.Errorf("error executing request: %w", err)
	}

	defer func() {
		_ = res.Body.Close()
	}()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return queryRes{}, fmt.Errorf("error reading request response: %w", err)
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		if len(data) > 0 {
			c.log.Error("Error response from Loki", "response", string(data), "status", res.StatusCode)
		} else {
			c.log.Error("Error response from Loki with an empty body", "status", res.StatusCode)
		}
		return queryRes{}, fmt.Errorf("received a non-200 response from loki, status: %d", res.StatusCode)
	}

	result := queryRes{}
	err = json.Unmarshal(data, &result)
	if err != nil {
		fmt.Println(string(data))
		return queryRes{}, fmt.Errorf("error parsing request response: %w", err)
	}

	return result, nil
}

func selectorString(selectors []selector) string {
	if len(selectors) == 0 {
		return "{}"
	}
	// Build the query selector.
	query := ""
	for _, s := range selectors {
		query += fmt.Sprintf("%s%s%q,", s.label, s.op, s.value)
	}
	// Remove the last comma, as we append one to every selector.
	query = query[:len(query)-1]
	return "{" + query + "}"
}

func newSelector(label, op, value string) (selector, error) {
	if !isValidOperator(op) {
		return selector{}, fmt.Errorf("'%s' is not a valid query operator", op)
	}
	return selector{label: label, op: Operator(op), value: value}, nil
}

func isValidOperator(op string) bool {
	switch op {
	case "=", "!=", "=~", "!~":
		return true
	}
	return false
}

type queryRes struct {
	Data queryData `json:"data"`
}

type queryData struct {
	Result []stream `json:"result"`
}
