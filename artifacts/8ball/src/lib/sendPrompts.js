// Credentials and provider calls live on the API server, never in this bundle.
const apiBase = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/decision`;

async function post(path, body, signal) {
  console.info(`[8ball] ${path} submitted\n${JSON.stringify(body, null, 2)}`);
  const response = await fetch(`${apiBase}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => null);
  console.groupCollapsed(`[8ball] ${path} exchange · HTTP ${response.status}`);
  try {
    for (const entry of data?.debugLog ?? []) console.info(entry);
    const { debugLog, ...result } = data ?? {};
    console.info(`[8ball] ${path} result\n${JSON.stringify(result, null, 2)}`);
  } finally {
    console.groupEnd();
  }
  if (!response.ok) {
    throw new Error(data?.error || 'The decision service could not complete this request. Please try again.');
  }
  if (!data) throw new Error('The decision service returned an empty response.');
  // Do not send the Claude trace back to the server as part of the Jev prompt.
  const { debugLog, ...result } = data;
  return result;
}

export function toJevPrompt(userInput, signal) {
  return post('prepare', { input: userInput }, signal);
}

export function getJevResponse(prompt, signal) {
  return post('answer', prompt, signal);
}


//this is an example of how you could call EXA
const response = await fetch('https://ai.hackclub.com/proxy/v1/exa/search', {
  method: 'POST',
  headers: {
    'Authorization': '',// fill in the same API key here when you implement it in the api-server
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'open source alternatives to Notion',
    numResults: 3,
    contents: { text: { maxCharacters: 500 } },
  }),
});
