// Construct integrations only when used, so builds do not require live secrets.
export function lazyClient<T extends object>(create: () => T): T {
  let client: T | undefined;
  return new Proxy({} as T, {
    get(_target, key) {
      client ??= create();
      const value = Reflect.get(client, key, client);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}
