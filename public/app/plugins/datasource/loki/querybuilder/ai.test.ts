import { identifyQuery } from './ai';

test('Identifies valid queries', () => {
  const query = 'count_over_time({job="mysql"}[5m])';

  expect(identifyQuery(query, query)).toBe(query);
});

test('Removes gibberish from AI responses', () => {
  const query = 'count_over_time({job="mysql"}[5m])';
  const response = `Query: ${query} blah blah another string`;

  expect(identifyQuery(response, response)).toBe(query);
});
