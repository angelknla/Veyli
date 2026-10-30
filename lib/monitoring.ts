import 'server-only';
import { randomUUID } from 'node:crypto';
export const reportFailure = (code: string, operation: string) => {
  const event = {
    level: 'error',
    service: 'veyli',
    code: /^[a-zA-Z0-9_]+$/.test(code) ? code : 'unexpected',
    operation,
    requestId: randomUUID(),
    time: new Date().toISOString(),
  };
  console.error(JSON.stringify(event));
  const endpoint = process.env.MONITORING_ENDPOINT;
  if (endpoint?.startsWith('https://'))
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  return event.requestId;
};
