import * as SecureStore from 'expo-secure-store';

const key = 'ruteam-appearance';
export const readPreference = () => SecureStore.getItemAsync(key);
export const writePreference = (value: string) =>
  SecureStore.setItemAsync(key, value);
