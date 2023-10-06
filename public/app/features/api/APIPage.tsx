import React from 'react';
import SwaggerUI from 'swagger-ui-react';

import { PageLayoutType } from '@grafana/data';
import { Page } from 'app/core/components/Page/Page';

import 'swagger-ui-react/swagger-ui.css';

export const APIPage = () => {
  return (
    <Page navId="api" layout={PageLayoutType.Canvas}>
      <Page.Contents isLoading={false}>
        <SwaggerUI url="/public/api-merged.json" tryItOutEnabled={false} withCredentials={false} />
      </Page.Contents>
    </Page>
  );
};
