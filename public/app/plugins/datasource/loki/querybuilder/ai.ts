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
// Select stream test containing 123
{test~="123"}
// Select stream with regex mysql.+
{test~="mysql.+"}
// Show logs not matching test mysql.+ regexp
{test!~"mysql.+"} 
// Select test 123 logs and filter lines that contain text
{test="123"} |= "text"
// Show test 123 lines that contain text
{test="123"} |= "text"
// Filter test different 123 not containing text
{test!="123"} != "text"
// test different 123 logs not matching mysql.+ regular expression
{test!="123"} !~ "mysql.+"
// Discard test = 123 label != value log lines that have the substring “kafka.server:type=ReplicaManager”:
{test="123", label!="value"} != "kafka.server:type=ReplicaManager"
// Select test 123 and keep log lines that contain a substring that starts with tsdb-ops
{test="123"} |~ "tsdb-ops.*io:2003"
// Keep test 123 lines that contain a substring that starts with error=, and is followed by 1 or more word characters
{test="123"} |~  \`error=\w+\`
// job = mysql logs that include the string error and not include timeout
{job="mysql"} |= "error" != "timeout"
// job = mysql logs that include the string error and not include timeout with duration >= 20ms or size < 20kb json parser
{job="mysql"} |= "error" != "timeout" | json | duration >= 20ms or size < 20kb 
// Logs of test 123 extract json 
{job="mysql"} | json
// Logs of test 123 parse json 
{job="mysql"} | json
// Logs of test 123 json parser
{job="mysql"} | json
// Logs of test 123 extract json labels server and user_agent
{job="mysql"} | json server, user_agent
// Logs of test 123 extract logfmt 
{job="mysql"} | logfmt
// Logs of test 123 parse logfmt
{job="mysql"} | logfmt
// Logs of test 123 logfmt parser
{job="mysql"} | logfmt
// Logs of test 123 log format parser
{job="mysql"} | logfmt
// Logs of test 123 log format
{job="mysql"} | logfmt
// Logs of test 123 unpack parser
{job="mysql"} | unpack
// Logs of label container value frontend logfmt parser and format query duration
{container="frontend"} | logfmt | line_format "{{.query}} {{.duration}}"
// Logs of label container value frontend json parser and rewrite query duration labels
{container="frontend"} | json | line_format "{{.query}} {{.duration}}"
// Logs of label container value frontend json parser and line format  "{{.query}} {{.duration}}"
{container="frontend"} | json | line_format "{{.query}} {{.duration}}"

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
