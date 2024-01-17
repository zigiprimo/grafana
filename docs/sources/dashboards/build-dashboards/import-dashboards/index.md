---
aliases:
  - ../reference/export_import/
  - export-import/
keywords:
  - grafana
  - dashboard
  - import
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Import dashboards
title: Import dashboards
description: Learn how to import dashboards and about Grafana's preconfigured dashboards
weight: 5
---

# Import dashboards

1. Click **Dashboards** in the left-side menu.
1. Click **New** and select **Import** in the dropdown menu.
1. Perform one of the following steps:

   - Upload a dashboard JSON file
   - Paste a [Grafana.com](https://grafana.com) dashboard URL
   - Paste dashboard JSON text directly into the text area

The import process enables you to change the name of the dashboard, pick the data source you want the dashboard to use, and specify any metric prefixes (if the dashboard uses any).

## Discover dashboards on grafana.com

Find dashboards for common server applications at [Grafana.com/dashboards](https://grafana.com/dashboards).

{{< figure src="/media/docs/grafana/dashboards/screenshot-gcom-dashboards.png" alt="Preconfigured dashboards on grafana.com">}}

{{% docs/reference %}}
[HTTP API]: "/docs/grafana/ -> /docs/grafana/<GRAFANA VERSION>/developers/http_api"
[HTTP API]: "/docs/grafana-cloud/ -> /docs/grafana-cloud/developer-resources/api-reference/http-api"
{{% /docs/reference %}}
