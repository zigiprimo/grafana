const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({});
const openai = new OpenAIApi(configuration);

export async function ask(question: string) {
  let response;
  try {
    response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: 'Say this is a test',
      temperature: 0,
      max_tokens: 7,
    });
  } catch (e) {
    return 'We could not process your request.';
  }

  return response;
}
