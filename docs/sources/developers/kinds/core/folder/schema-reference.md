---
keywords:
  - grafana
  - schema
title: Folder kind
---
> Both documentation generation and kinds schemas are in active development and subject to change without prior notice.

## Folder

#### Maturity: [merged](../../../maturity/#merged)
#### Version: 0.0

folder element

| Property      | Type   | Required | Description                                                                                                                                                               |
|---------------|--------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `title`       | string | **Yes**  | Folder title (must be unique within the parent folder)<br/>Constraint: `length >=1`.                                                                                      |
| `uid`         | string | **Yes**  | Folder UID                                                                                                                                                                |
| `description` | string | No       | Folder description                                                                                                                                                        |
| `parentUid`   | string | No       | Parend folder UID<br/>TODO: ideally this should be identified the same way as dashboards+library panels<br/>NOTE: only used when the nestedFolder feature flag is enabled |


