// Credentials and provider calls live on the API server, never in this bundle.
const apiBase = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/decision`;

async function post(path, body, signal) {
  const response = await fetch(`${apiBase}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'The decision service could not complete this request. Please try again.');
  }
  if (!data) throw new Error('The decision service returned an empty response.');
  return data;
}

export function toJevPrompt(userInput, signal) {
  return post('prepare', { input: userInput }, signal);
}

export function getJevResponse(prompt, signal) {
  return post('answer', prompt, signal);
}
