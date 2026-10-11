// Credentials and provider calls live on the API server, never in this bundle.
const apiBase = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/decision`;

async function post(path, body, signal, apiKey) {
  const safe = text => apiKey ? text.split(apiKey).join('[REDACTED]') : text;
  console.info(safe(`[8ball] ${path} submitted\n${JSON.stringify(body, null, 2)}`));
  const response = await fetch(`${apiBase}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-8ball-key': apiKey } : {}) },
    credentials: 'same-origin',
    body: JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => null);
  console.groupCollapsed(`[8ball] ${path} exchange · HTTP ${response.status}`);
  try {
    for (const entry of data?.debugLog ?? []) console.info(safe(entry));
    const { debugLog, ...result } = data ?? {};
    console.info(safe(`[8ball] ${path} result\n${JSON.stringify(result, null, 2)}`));
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

export function toJevPrompt(userInput, signal, apiKey) {
  return post('prepare', { input: userInput }, signal, apiKey);
}

export function getJevResponse(prompt, signal, apiKey) {
  return post('answer', prompt, signal, apiKey);
}

export async function getDecisionAccess(signal) {
  const response = await fetch(`${apiBase}/access`, { signal, credentials: 'same-origin', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'Could not load your free allowance.');
  return data;
}

// Exa research is performed on demand by Claude through the prepare endpoint.
// Nothing calls an external provider on page load; credentials stay server-side.
