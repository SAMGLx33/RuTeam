import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppearanceProvider, useAppearance } from '../src/theme/appearance';
import { SessionProvider } from '../src/providers/session-provider';
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
function Screens() {
  const { dark, palette, reducedMotion } = useAppearance();
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? 'none' : 'default',
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <SessionProvider>
          <AppearanceProvider>
            <Screens />
          </AppearanceProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
