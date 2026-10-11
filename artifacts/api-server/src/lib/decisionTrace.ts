// Request-local traces only: never share one visitor's exchange with another.
export type Trace = (label: string, value: unknown) => void;

export function formatTrace(label: string, value: unknown, extraSecrets: string[] = []): string {
  let text = JSON.stringify(value, (key, item) =>
    /^(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)$/i.test(key)
      ? "[REDACTED]" : item, 2) ?? "null";
  // Protect configured credentials even if an upstream error echoes one in prose.
  for (const secret of [process.env.API_KEY, process.env.SESSION_SECRET, ...extraSecrets]) {
    if (secret) {
      text = text.split(JSON.stringify(secret).slice(1, -1)).join("[REDACTED]");
    }
  }
  return `[8ball] ${label}\n${text}`;
}
