import { Configuration, OpenAIApi } from 'openai';

import { explainOperator, getOperationDefinitions } from './operations';

const configuration = new Configuration({});
const openai = new OpenAIApi(configuration);

const prependedText = `// Sample LogQL loki queries:
// Select log lines from the stream test and value 123
{test="123"}
// Select log lines of test 123
{test="123"}
// Write query for test = 123
{test="123"}
// Select logs of test equals 123
{test="123"}
// Show logs of test 123
{test="123"}
// When test is not 123
{test!="123"}
// When test is different than 123
{test!="123"}
// Select test 123 logs and filter lines that contain text
{test="123"} |= "text"
// Show test 123 lines that contain text
{test="123"} |= "text"
// Filter test different 123 not containing text
{test!="123"} != text
// Select stream test containing 123
{test~="123"}
// Select stream with regex mysql.+
{test~="mysql.+"}
// Show logs not matching test mysql.+ regexp
{test!~"mysql.+"}
`;

export async function ask(prompt: string) {
  let response;
  try {
    response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `${prependedText} // Write a logql query to ${prompt}`,
      temperature: 0.2,
      max_tokens: 60,
    });

    return response.data?.choices[0]?.text || '';
  } catch (e) {
    return 'We could not process your request.';
  }
}

type TrainingType = {
  prompt: string;
  completion: string;
};

export function getTrainingData() {
  const operations = getOperationDefinitions();

  const operationTraining: TrainingType[] = operations.map((operation) => ({
    prompt: explainOperator(operation.id),
    completion: operation.name,
  }));

  const sampleModel = {
    id: '',
    params: ['value'],
  };

  const renderTraining: TrainingType[] = operations.map((operation) => ({
    prompt: `How do you write the Grafana Loki query for ${operation.name}`,
    completion: operation.renderer({ ...sampleModel, id: operation.id }, operation, ''),
  }));

  return [...operationTraining, ...renderTraining];
}
