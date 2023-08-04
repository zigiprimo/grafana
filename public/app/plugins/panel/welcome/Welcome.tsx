import React, { useState } from 'react';
import { useAsync } from 'react-use';

import { llms } from '@grafana/experimental';
import { Button, Input, Spinner } from '@grafana/ui';

export const WelcomeBanner = () => {
  // The current input value.
  const [input, setInput] = React.useState('');
  // The final message to send to the LLM, updated when the button is clicked.
  const [message, setMessage] = React.useState('');
  // The latest reply from the LLM.
  const [reply, setReply] = useState('');

  const { loading, error, value } = useAsync(async () => {
    // Check if the LLM plugin is enabled and configured.
    // If not, we won't be able to make requests, so return early.
    const enabled = await llms.openai.enabled();
    if (!enabled) {
      return { enabled };
    }
    if (message === '') {
      return { enabled };
    }
    // Stream the completions. Each element is the next stream chunk.
    const stream = llms.openai
      .streamChatCompletions({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant in Grafana.' },
          { role: 'user', content: message },
        ],
      })
      .pipe(
        // Accumulate the stream content into a stream of strings, where each
        // element contains the accumulated message so far.
        llms.openai.accumulateContent()
      );
    // Subscribe to the stream and update the state for each returned value.
    return {
      enabled,
      stream: stream.subscribe(setReply),
    };
  }, [message]);

  if (error) {
    // TODO: handle errors.
    return null;
  }

  return (
    <>
      {value?.enabled ? (
        <>
          <Input
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="What are you trying to do today?"
          />
          <br />
          <Button type="submit" onClick={() => setMessage(input)}>
            Submit
          </Button>
          <br />
          <div>{loading ? <Spinner /> : reply}</div>
        </>
      ) : (
        <div>LLM plugin not enabled.</div>
      )}
    </>
  );
};
