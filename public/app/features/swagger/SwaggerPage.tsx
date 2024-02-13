import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { useAsync } from 'react-use';

export function SwaggerPage() {
  const urls = useAsync(async () => {
    return Promise.resolve([
      { name: 'Grafana API (OpenAPI v2)', url: 'public/api-merged.json' },
      { name: 'Grafana API (OpenAPI v3)', url: 'public/openapi3.json' },
    ]);
  }, []);

  // const urlParams = new URLSearchParams(window.location.search);
  //       const v2 = { name: 'Grafana API (OpenAPI v2)', url: 'public/api-merged.json' };
  //       const v3 = { name: 'Grafana API (OpenAPI v3)', url: 'public/openapi3.json' };
  //       const urls = urlParams.get('show') == 'v3' ? [v3, v2] : [v2, v3];
  //       try {
  //         const rsp = await fetch('openapi/v3');
  //         const apis = await rsp.json();
  //         for (const [key, value] of Object.entries(apis.paths)) {
  //           const parts = key.split('/');
  //           if (parts.length == 3) {
  //             urls.push({
  //               name: `${parts[1]}/${parts[2]}`,
  //               url: value.serverRelativeURL.substring(1), // remove initial slash
  //             });
  //           }
  //         }
  //         urls.push({ name: 'Grafana apps (OpenAPI v2)', url: 'openapi/v2' });
  //       } catch (err) {
  //         // console.warn('Error loading k8s apis', err);
  //       }

  if (urls.loading) {
    return <div>...</div>;
  }

  return (
    <SwaggerUI
      url={'http://localhost:3000/openapi/v3/apis/example.grafana.app/v0alpha1'}
      //urls={urls.value!}
      // dom_id: '#swagger-ui',
      // deepLinking: true,
      // presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      // plugins: [SwaggerUIBundle.plugins.DownloadUrl],
      // layout: 'StandaloneLayout',
      // filter: true,
      // tagsSorter: 'alpha',
      // tryItOutEnabled: true,
      // queryConfigEnabled: true
    />
  );
}

export default SwaggerPage;
