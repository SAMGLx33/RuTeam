const key = 'ruteam-appearance';
export async function readPreference() {
  return globalThis.localStorage?.getItem(key) ?? null;
}
export async function writePreference(value: string) {
  globalThis.localStorage?.setItem(key, value);
}
