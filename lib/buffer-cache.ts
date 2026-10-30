/** Small process-local caches share pending work and never retain failed loads. */
export const createBufferCache = ({ maxBytes = 32 * 1024 * 1024, ttl = 5 * 60 * 1000 } = {}) => {
  const entries = new Map<string, { value: Buffer; expires: number }>();
  const pending = new Map<string, Promise<Buffer>>();
  let bytes = 0;

  const remove = (key: string) => {
    const entry = entries.get(key);
    if (entry) bytes -= entry.value.length;
    entries.delete(key);
  };

  const cached = (key: string, load: () => Promise<Buffer>): Promise<Buffer> => {
    for (const [key, entry] of entries) if (entry.expires <= Date.now()) remove(key);
    const entry = entries.get(key);
    if (entry) {
      entries.delete(key);
      entries.set(key, entry);
      return Promise.resolve(entry.value);
    }
    const existing = pending.get(key);
    if (existing) return existing;
    const promise = Promise.resolve()
      .then(load)
      .then((value) => {
        if (value.length <= maxBytes) {
          while (bytes + value.length > maxBytes && entries.size)
            remove(entries.keys().next().value!);
          entries.set(key, { value, expires: Date.now() + ttl });
          bytes += value.length;
        }
        return value;
      })
      .finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  };
  return cached;
};
