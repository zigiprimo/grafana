import axios from 'axios';

import { Label } from './situation';
// These need to be set up
const DS_UID = 'cd82b426-8a65-4e2d-aec8-ef37f5e4f568';
const API_TOKEN = 'abc123';
const URL = `http://localhost:3000/api/datasources/uid/${DS_UID}/resources`;

export async function getLabelNames(): Promise<string[]> {
  const { start, end } = getStartAndEndParams();
  const url = `${URL}/labels?start=${start}&end=${end}`;

  const response = await axios(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'x-datasource-uid': 'cd82b426-8a65-4e2d-aec8-ef37f5e4f568',
      'x-grafana-org-id': '1',
      'x-plugin-id': 'loki',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    method: 'GET',
  });
  const data = response.data.data;
  return data;
}

export async function getLabelNamesIfOtherLabels(labels: Label[]): Promise<string[]> {
  const allLabelTexts = labels.map((label) => `${label.name}${label.op}"${label.value}"`);
  const { start, end } = getStartAndEndParams();
  const query = `{${allLabelTexts}}`;
  const url = `${URL}/series?match[]=${query}&start=${start}&end=${end}`;

  const response = await axios(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'x-datasource-uid': 'cd82b426-8a65-4e2d-aec8-ef37f5e4f568',
      'x-grafana-org-id': '1',
      'x-plugin-id': 'loki',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    method: 'GET',
  });

  const data = response.data.data;
  const { values } = processLabels(data);

  const possibleLabelNames = Object.keys(values); // all names from datasource
  const usedLabelNames = new Set(labels.map((l) => l.name)); // names used in the query
  const names = possibleLabelNames.filter((label) => !usedLabelNames.has(label));
  return names;
}

export async function getLabelValues(labelName: string): Promise<string[]> {
  const { start, end } = getStartAndEndParams();
  const url = `${URL}/label/${labelName}/values?start=${start}&end=${end}`;

  const response = await axios(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'x-datasource-uid': 'cd82b426-8a65-4e2d-aec8-ef37f5e4f568',
      'x-grafana-org-id': '1',
      'x-plugin-id': 'loki',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    method: 'GET',
  });
  const data = response.data.data;
  return data;
}

export async function getStats(query: string): Promise<number> {
  const { start, end } = getStartAndEndParams();
  const url = `${URL}/index/stats?query=${query}&start=${start}&end=${end}`;

  const response = await axios(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'x-datasource-uid': 'cd82b426-8a65-4e2d-aec8-ef37f5e4f568',
      'x-grafana-org-id': '1',
      'x-plugin-id': 'loki',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    method: 'GET',
  });
  const data = response.data.bytes;
  return data;
}

const NS_IN_MS = 1000000;

export function getStartAndEndParams() {
  let start: number | Date = new Date();
  start = start.setHours(start.getHours() - 1).valueOf() * NS_IN_MS;
  const end = Date.now() * NS_IN_MS;
  return { start, end };
}

export function processLabels(labels: Array<{ [key: string]: string }>, withName = false) {
  // For processing we are going to use sets as they have significantly better performance than arrays
  // After we process labels, we will convert sets to arrays and return object with label values in arrays
  const valueSet: { [key: string]: Set<string> } = {};
  labels.forEach((label) => {
    const { __name__, ...rest } = label;
    if (withName) {
      valueSet['__name__'] = valueSet['__name__'] || new Set();
      if (!valueSet['__name__'].has(__name__)) {
        valueSet['__name__'].add(__name__);
      }
    }

    Object.keys(rest).forEach((key) => {
      if (!valueSet[key]) {
        valueSet[key] = new Set();
      }
      if (!valueSet[key].has(rest[key])) {
        valueSet[key].add(rest[key]);
      }
    });
  });

  // valueArray that we are going to return in the object
  const valueArray: { [key: string]: string[] } = {};
  limitSuggestions(Object.keys(valueSet)).forEach((key) => {
    valueArray[key] = limitSuggestions(Array.from(valueSet[key]));
  });

  return { values: valueArray, keys: Object.keys(valueArray) };
}

export function limitSuggestions(items: string[]) {
  return items.slice(0, 100);
}

export const getSamples = async (query: string) => {
  let start: number | Date = new Date();
  start = start.setHours(start.getHours() - 1).valueOf();
  const end = Date.now();
  const response = await axios.post(
    'http://localhost:3000/api/ds/query',
    {
      queries: [
        {
          refId: 'samples',
          datasource: {
            type: 'loki',
            uid: DS_UID,
          },
          expr: query,
          queryType: 'range',
          maxLines: 10,
          legendFormat: '',
        },
      ],
      from: start.toString(),
      to: end.toString(),
    },
    {
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-datasource-uid': DS_UID,
        'x-grafana-org-id': '1',
        'x-panel-id': 'Q-0e01a969-342b-4714-8617-b078bbb58b42-0',
        'x-plugin-id': 'loki',
        Authorization: `Bearer ${API_TOKEN}`,
      },
    }
  );
  return response.data.results.samples.frames;
};
