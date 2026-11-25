import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/providers/session-provider';
import { LoginScreen } from '../src/features/auth/login-screen';
import { ProfileScreen } from '../src/features/auth/profile-screen';
import { Button } from '../src/components/ui/button';
import { colors } from '../src/theme/tokens';
export default function Home() {
  const session = useSession();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  async function revoke() {
    try {
      await session.signOut();
      setLogoutError(null);
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : 'No pudimos cerrar sesión',
      );
    }
  }
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.page, { padding: width < 600 ? 22 : 42 }]}>
          <View style={styles.header}>
            <Text style={styles.brand}>RuTeam</Text>
            <Text style={styles.caption}>Carpooling académico</Text>
          </View>
          {session.user?.demo && (
            <Text style={styles.banner}>
              ENTORNO DE DESARROLLO; IDENTIDADES SINTÉTICAS
            </Text>
          )}
          {session.loading ? (
            <View style={styles.loading}>
              <ActivityIndicator
                color={colors.primary}
                accessibilityLabel="Consultando sesión"
              />
              <Text style={styles.caption}>Consultando sesión…</Text>
            </View>
          ) : (
            <>
              {session.error && (
                <View style={styles.alert}>
                  <Text
                    accessibilityRole="alert"
                    style={{ color: colors.danger }}
                  >
                    {session.error}
                  </Text>
                  <Button
                    title="Reintentar conexión"
                    secondary
                    onPress={session.retry}
                  />
                  {session.accessDenied && (
                    <Button
                      title="Cerrar sesión"
                      secondary
                      onPress={() => {
                        void revoke();
                      }}
                    />
                  )}
                  {logoutError && (
                    <Text
                      accessibilityRole="alert"
                      style={{ color: colors.danger }}
                    >
                      {logoutError}
                    </Text>
                  )}
                </View>
              )}
              {session.user ? (
                <ProfileScreen user={session.user} />
              ) : (
                <LoginScreen />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingVertical: 20 },
  page: { width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  brand: { fontSize: 38, fontWeight: '800', color: colors.ink },
  caption: { fontSize: 16, color: colors.muted },
  banner: {
    backgroundColor: colors.banner,
    color: colors.bannerText,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 23,
    padding: 17,
    borderRadius: 10,
  },
  loading: { padding: 45, gap: 20, alignItems: 'center' },
  alert: { gap: 12, maxWidth: 530, width: '100%', alignSelf: 'center' },
});
