import axios from 'axios';
// These need to be set up
const DS_UID = 'cd82b426-8a65-4e2d-aec8-ef37f5e4f568';
const COOKIE = '_ga=...';
export async function getLabelNames(): Promise<string[]> {
  const url = `http://localhost:3000/api/datasources/uid/${DS_UID}/resources/labels?a`;

  const response = await axios(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'x-datasource-uid': 'cd82b426-8a65-4e2d-aec8-ef37f5e4f568',
      'x-grafana-org-id': '1',
      'x-plugin-id': 'loki',
      cookie: COOKIE,
    },
    method: 'GET',
  });
  const data = response.data.data;
  return data;
}

export async function getLabelValues(labelName: string): Promise<string[]> {
  const url = `http://localhost:3000/api/datasources/uid/${DS_UID}/resources/label/${labelName}/values?s`;

  const response = await axios(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'x-datasource-uid': 'cd82b426-8a65-4e2d-aec8-ef37f5e4f568',
      'x-grafana-org-id': '1',
      'x-plugin-id': 'loki',
      cookie: COOKIE,
    },
    method: 'GET',
  });
  const data = response.data.data;
  return data;
}
