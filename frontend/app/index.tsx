import { ActivityIndicator } from '../src/theme/primitives';
import { Redirect } from 'expo-router';

import { useSession } from '../src/providers/session-provider';
import { LoginScreen } from '../src/features/auth/login-screen';
import { HomeScreen } from '../src/features/home/home-screen';
import { colors } from '../src/theme/tokens';

export default function HomeRoute() {
  const { user, loading } = useSession();
  if (loading)
    return (
      <ActivityIndicator
        color={colors.primary}
        accessibilityLabel="Consultando sesión"
      />
    );
  if (!user) return <LoginScreen />;
  if (!user.capabilities.passenger) return <Redirect href="/verify-email" />;
  if (!user.onboarding.completed) return <Redirect href="/onboarding" />;
  return <HomeScreen user={user} />;
}
