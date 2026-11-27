import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../src/providers/session-provider';
import { NotificationNavigation } from '../src/providers/notification-navigation';
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { networkMode: 'always', retry: false },
  },
});
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <SessionProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
          <NotificationNavigation />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
