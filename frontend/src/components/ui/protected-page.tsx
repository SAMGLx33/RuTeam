import { Link, Redirect } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { useSession } from '../../providers/session-provider';
import { colors } from '../../theme/tokens';
export function ProtectedPage({
  title,
  children,
  admin = false,
}: {
  title: string;
  children: ReactNode;
  admin?: boolean;
}) {
  const session = useSession();
  if (session.loading)
    return <ActivityIndicator accessibilityLabel="Consultando sesión" />;
  if (!session.user) return <Redirect href="/" />;
  if (admin && session.user.role !== 'ADMIN')
    return (
      <View>
        <Text accessibilityRole="alert">
          Acceso reservado a administración.
        </Text>
        <Link href="/">Volver al perfil</Link>
      </View>
    );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.page}
      >
        <Link href="/" style={styles.link}>
          ← Volver al perfil
        </Link>
        <Text style={styles.banner}>
          ENTORNO DE DEMOSTRACIÓN; VINCULACIÓN SIMULADA
        </Text>
        <Text role="heading" aria-level={1} style={styles.title}>
          {title}
        </Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export const formStyles = StyleSheet.create({
  section: {
    gap: 15,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  error: { color: colors.danger, fontSize: 16, lineHeight: 23 },
  choice: {
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  selected: { backgroundColor: colors.selected, borderColor: colors.primary },
  link: { color: colors.primary, fontSize: 17, paddingVertical: 10 },
});
const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 22,
    gap: 18,
    paddingBottom: 50,
  },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800' },
  banner: {
    color: colors.bannerText,
    backgroundColor: colors.banner,
    borderRadius: 8,
    padding: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
  link: { color: colors.primary, fontSize: 17 },
});
