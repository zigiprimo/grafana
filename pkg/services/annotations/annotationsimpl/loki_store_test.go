package annotationsimpl

import (
	"context"
	"io"
	"os"
	"testing"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

func TestIntegrationLokiAnnotations(t *testing.T) {
	// t.Skip("skipping integration test")

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
	}, nil, nil, "")
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

	time.Sleep(8 * time.Second)

	cli.ContainerStop(ctx, resp.ID, nil)

	// testIntegrationAnnotations(t, func(db db.DB, cfg *setting.Cfg, maximumTagsLength int64) store {
	// 	return &lokiRepositoryImpl{
	// 		db:                db,
	// 		cfg:               setting.NewCfg(),
	// 		log:               log.New("annotation.loki.test"),
	// 		tagService:        tagimpl.ProvideService(db, cfg),
	// 		maximumTagsLength: maximumTagsLength}
	// })
}
