package image

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/golang/mock/gomock"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/components/imguploader"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/ngalert/models"
	"github.com/grafana/grafana/pkg/services/ngalert/store"
	"github.com/grafana/grafana/pkg/services/screenshot"
	"github.com/grafana/grafana/pkg/util"
)

func TestScreenshotImageService(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	var (
		cache       = NewMockCacheService(ctrl)
		images      = store.NewFakeImageStore(t)
		limiter     = screenshot.NoOpRateLimiter{}
		screenshots = screenshot.NewMockScreenshotService(ctrl)
		uploads     = imguploader.NewMockImageUploader(ctrl)
	)

	s := NewScreenshotImageService(cache, &limiter, log.NewNopLogger(), screenshots, 5*time.Second, images,
		NewUploadingService(uploads, prometheus.NewRegistry()))

	ctx := context.Background()

	t.Run("image is taken, uploaded, saved to database and cached", func(t *testing.T) {
		// assert that the cache is checked for an existing image
		cache.EXPECT().Get(gomock.Any(), "VoFGxP1vIOg=").Return(models.Image{}, false)

		// assert that a screenshot is taken
		screenshots.EXPECT().Take(gomock.Any(), screenshot.ScreenshotOptions{
			OrgID:        1,
			DashboardUID: "foo",
			PanelID:      1,
			From:         "now-300s",
			To:           "now",
			Timeout:      5 * time.Second,
		}).Return(&screenshot.Screenshot{
			Path: "foo.png",
		}, nil)

		// assert that the screenshot is made into an image and uploaded
		uploads.EXPECT().Upload(gomock.Any(), "foo.png").
			Return("https://example.com/foo.png", nil)

		// assert that the image is saved into the database
		expected := models.Image{
			ID:    1,
			Token: "foo",
			Path:  "foo.png",
			URL:   "https://example.com/foo.png",
		}

		// assert that the image is saved into the cache
		cache.EXPECT().Set(gomock.Any(), "VoFGxP1vIOg=", expected).Return(nil)

		image, err := s.NewImage(ctx, &models.AlertRule{
			OrgID:        1,
			UID:          "foo",
			DashboardUID: util.Pointer("foo"),
			PanelID:      util.Pointer(int64(1))})
		require.NoError(t, err)
		assert.Equal(t, expected, *image)
	})

	t.Run("image is taken, upload return error, saved to database without URL and cached", func(t *testing.T) {
		// assert that the cache is checked for an existing image
		cache.EXPECT().Get(gomock.Any(), "+8gFMQvPRqM=").Return(models.Image{}, false)

		// assert that a screenshot is taken
		screenshots.EXPECT().Take(gomock.Any(), screenshot.ScreenshotOptions{
			OrgID:        1,
			DashboardUID: "bar",
			PanelID:      1,
			From:         "now-300s",
			To:           "now",
			Timeout:      5 * time.Second,
		}).Return(&screenshot.Screenshot{
			Path: "bar.png",
		}, nil)

		// the screenshot is made into an image and uploaded, but the upload returns an error
		uploads.EXPECT().Upload(gomock.Any(), "bar.png").
			Return("", errors.New("failed to upload bar.png"))

		// and then saved into the database, but without a URL
		expected := models.Image{
			ID:    2,
			Token: "bar",
			Path:  "bar.png",
		}

		// assert that the image is saved into the cache, but without a URL
		cache.EXPECT().Set(gomock.Any(), "+8gFMQvPRqM=", expected).Return(nil)

		image, err := s.NewImage(ctx, &models.AlertRule{
			OrgID:        1,
			UID:          "bar",
			DashboardUID: util.Pointer("bar"),
			PanelID:      util.Pointer(int64(1))})
		require.NoError(t, err)
		assert.Equal(t, expected, *image)
	})

	t.Run("image is returned from cache", func(t *testing.T) {
		expected := models.Image{Path: "baz.png", URL: "https://example.com/baz.png"}

		// assert that the cache is checked for an existing image and it is returned
		cache.EXPECT().Get(gomock.Any(), "gQLfM6DR8+s=").Return(expected, true)

		image, err := s.NewImage(ctx, &models.AlertRule{
			OrgID:        1,
			UID:          "baz",
			DashboardUID: util.Pointer("baz"),
			PanelID:      util.Pointer(int64(1))})
		require.NoError(t, err)
		assert.Equal(t, expected, *image)
	})

	t.Run("error is returned when timeout is exceeded", func(t *testing.T) {
		// assert that the cache is checked for an existing image
		cache.EXPECT().Get(gomock.Any(), "wMP1m1jB6T4=").Return(models.Image{}, false)

		// assert that when the timeout is exceeded an error is returned
		screenshots.EXPECT().Take(gomock.Any(), screenshot.ScreenshotOptions{
			OrgID:        1,
			DashboardUID: "qux",
			PanelID:      1,
			From:         "now-300s",
			To:           "now",
			Timeout:      5 * time.Second,
		}).Return(nil, context.DeadlineExceeded)

		image, err := s.NewImage(ctx, &models.AlertRule{
			OrgID:        1,
			UID:          "qux",
			DashboardUID: util.Pointer("qux"),
			PanelID:      util.Pointer(int64(1))})
		assert.EqualError(t, err, "context deadline exceeded")
		assert.Nil(t, image)
	})
}

func TestCalcFromDuration(t *testing.T) {
	tests := []struct {
		name     string
		d        time.Duration
		expected time.Duration
	}{{
		name:     "1 second returns min",
		d:        time.Second,
		expected: screenshotMinDuration,
	}, {
		name:     "less than min returns min",
		d:        screenshotMinDuration - 1,
		expected: screenshotMinDuration,
	}, {
		name:     "more than than max returns max",
		d:        screenshotMaxDuration + 1,
		expected: screenshotMaxDuration,
	}, {
		name:     "less than 1 hour returns twice d",
		d:        15 * time.Minute,
		expected: 30 * time.Minute,
	}, {
		name:     "1 hour or more returns d",
		d:        time.Hour,
		expected: time.Hour,
	}, {
		// If this test fails then screenshotMaxDuration has been increased above 24h.
		// You need to make sure that durations larger than 24h are supported in /d-solo/
		// with seconds units.
		name:     "if max is increased",
		d:        25 * time.Hour,
		expected: 24 * time.Hour,
	}}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assert.Equal(t, test.expected, calcFromDuration(test.d))
		})
	}

}
