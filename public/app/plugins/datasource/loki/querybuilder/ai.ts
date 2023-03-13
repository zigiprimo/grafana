const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({});
const openai = new OpenAIApi(configuration);

export async function ask(prompt: string) {
  let response;
  try {
    response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      temperature: 0.2,
      max_tokens: 30,
    });

    return response.data?.choices[0]?.text || '';
  } catch (e) {
    return 'We could not process your request.';
  }

  return response;
}
