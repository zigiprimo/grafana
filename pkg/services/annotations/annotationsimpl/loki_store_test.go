package annotationsimpl

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"os"
	"testing"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/tag/tagimpl"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/stretchr/testify/require"
)

func TestIntegrationLokiAnnotations(t *testing.T) {
	// t.Skip("skipping integration test")
	lokiHost, err := url.Parse("http://localhost:3100")
	require.NoError(t, err)
	lokiConfig := lokiConfig{
		ReadPathURL:    lokiHost,
		WritePathURL:   lokiHost,
		TenantID:       "?",
		ExternalLabels: make(map[string]string),
	}

	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	defer cli.Close()

	reader, err := cli.ImagePull(ctx, "docker.io/grafana/loki", types.ImagePullOptions{})
	if err != nil {
		panic(err)
	}

	defer reader.Close()
	io.Copy(os.Stdout, reader)

	resp, err := cli.ContainerCreate(ctx, &container.Config{
		Image: "grafana/loki",
		// Cmd:   []string{"echo", "hello world"},
		Tty: false,
	}, &container.HostConfig{
		PortBindings: nat.PortMap{
			nat.Port("3100/tcp"): []nat.PortBinding{
				{
					HostPort: "3100",
				},
			},
		},
	}, nil, "")
	if err != nil {
		panic(err)
	}

	if err := cli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		panic(err)
	}

	out, err := cli.ContainerLogs(ctx, resp.ID, types.ContainerLogsOptions{ShowStdout: true})
	if err != nil {
		panic(err)
	}

	stdcopy.StdCopy(os.Stdout, os.Stderr, out)

	testIntegrationAnnotations(t, func(db db.DB, cfg *setting.Cfg, maximumTagsLength int64) store {
		return &lokiRepositoryImpl{
			db:                db,
			cfg:               setting.NewCfg(),
			log:               log.New("annotation.loki.test"),
			tagService:        tagimpl.ProvideService(db, cfg),
			maximumTagsLength: maximumTagsLength,
			httpLokiClient:    newLokiClient(lokiConfig, &http.Client{}, log.New("annotation.loki.test"))}
	})

	defer cli.ContainerStop(ctx, resp.ID, nil)
}
