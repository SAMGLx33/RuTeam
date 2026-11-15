import * as SecureStore from 'expo-secure-store';
const KEY = 'ruteam-demo-session';
export function readToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}
export async function writeToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}
