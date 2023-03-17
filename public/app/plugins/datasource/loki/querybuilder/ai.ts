import { trim } from 'lodash';
import { Configuration, OpenAIApi } from 'openai';

import { validateQuery } from '../components/monaco-query-field/monaco-completion-provider/validation';

import { explainOperator, getOperationDefinitions } from './operations';

const configuration = new Configuration({});

const openai = new OpenAIApi(configuration);

const prependedText = `// Example LogQL queries:
// For test = 123
{test="123"}
// Logs of test 123
{test="123"}
// {test="123"}
{test="123"}
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
// Show logs of test = 123
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
// Select test 123 logs and filter lines containing text
{test="123"} |= "text"
// Show test 123 lines that contain "text"
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
// Logs compose_service = app parse as logfmt
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
// Count all the log lines within the last five minutes for the MySQL job
count_over_time({job="mysql"}[5m])
// Count log lines from job = mysql in the last 10 minutes
count_over_time({job="mysql"}[5m])
// Count log lines from job = mysql in the current interval
count_over_time({job="mysql"}[$__interval])
// Count all the log lines within the last five minutes for the MySQL job
count_over_time({job="mysql"}[5m])
// Rate per second for the mysql job in a minute
rate({job="mysql"}[1m])
// Rate per second of mysql job within a minute
rate({job="mysql"}[1m])
// Rate per second of test = 123 in 1 minute
rate({test="123"}[1m])
// Rate per second by host of errors that are not timeout with duration above 10 seconds in the last minute for the mysql job, aggregate using sum by host, json parser
sum by (host) (rate({job="mysql"} |= "error" != "timeout" | json | duration > 10s [1m]))
// For job = mysql calculate the rate per second by host of errors that are not timeout with duration above 10 seconds in the last minute, aggregate using sum by host, use json parser
sum by (host) (rate({job="mysql"} |= "error" != "timeout" | json | duration > 10s [1m]))
// Get the top 10 results by name with the highest log throughput in region us-east1
topk(10,sum(rate({region="us-east1"}[5m])) by (name))
// For region = "us-east1" get the top 10 by name with the highest log rate
topk(10,sum(rate({region="us-east1"}[5m])) by (name))
// Get the count of job = mysql during the last five minutes grouping by level:
sum(count_over_time({job="mysql"}[5m])) by (level)
// Get the rate of HTTP GET requests from NGINX logs over 10 seconds
avg(rate(({job="nginx"} |= "GET")[10s])) by (region)
// Error logs in job = container-name" and label not value
{job="container-name", label!="value"} |~ "(?i)(error|fail|lost|closed|panic|fatal|crash|password|authentication|denied)"
// Find rate limiting issues in job="container-name"
{job="container-name"} |~ "(too many requests|rate.limit)"
// List authentication errors, label test, value container:
{test="container"} |~ "(unauthenticated|access.denied)"
// Check job = container-name for parse errors
{job="container-name"} |~ "(?i)(deserialize|unmarshal|bad request|missing required|invalid value)"
// Find job = container-name server errors 
{job="container-name"} |~ "(?i)(internal server error)"
// Return all log lines for the job varlog
{job="varlogs"}
// Return all log lines for the filename /var/log/syslog
{filename="/var/log/syslog"}
// Return all log lines for the job varlogs and the filename /var/log/auth.log
{filename="/var/log/auth.log",job="varlogs"}
// Show all log lines for filenames /var/log/auth.log or /var/log/syslog
{filename=~"/var/log/auth.log|/var/log/syslog"}
// Show everything of filename
{filename=~".+"}
// Show all the logs of filename except /var/log/syslog
{filename=~".+",filename!="/var/log/syslog"}
// Count of job = varlog at 1 minutes time intervals
count_over_time({job="varlogs"}[1m])
// Rate of job = varlogs per minute
rate({job="varlogs"}[1m])

// Using the examples above, help the user to write a LogQL query by following the instructions below.

`;

export async function ask(prompt: string) {
  let response;
  try {
    response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `${prependedText}
      Instructions: """
      ${prompt}
      """`,
      temperature: 0.5,
      max_tokens: 60,
      user: `${Math.ceil(Math.random() * 100000)}`,
    });

    return trim(response.data?.choices[0]?.text || '', '\n\t ');
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

/*
 * Given a GPT response, identify a query within it.
 */
export function identifyQuery(response: string, interpolatedResponse: string) {
  let errors;
  let queryExpr = response;
  while ((errors = validateQuery(queryExpr, interpolatedResponse, [response])) !== false && errors[0]) {
    const error = errors[0];
    queryExpr = `${queryExpr.substring(0, error.startColumn - 1)}${queryExpr.substring(error.endColumn - 1)}`;
  }

  return trim(queryExpr);
}
