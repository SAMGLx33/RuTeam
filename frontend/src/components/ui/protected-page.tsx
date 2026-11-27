import { Link, Redirect, usePathname, type Href } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode, RefObject } from 'react';
import type { Account } from '@ruteam/contracts';
import { useSession } from '../../providers/session-provider';
import { colors } from '../../theme/tokens';

interface NavigationItem {
  href: Href;
  title: string;
  compact?: string;
}

function navigation(user: Account): NavigationItem[] {
  return [
    { href: '/', title: 'Inicio' },
    {
      href: '/available-trips',
      title: 'Viajes disponibles',
      compact: 'Viajes',
    },
    {
      href: '/my-reservations',
      title: 'Mis participaciones',
      compact: 'Participaciones',
    },
    ...(user.capabilities.driver
      ? [{ href: '/publish', title: 'Publicar viaje' } as const]
      : []),
    ...(user.capabilities.driverAccess
      ? [{ href: '/my-trips', title: 'Mis viajes publicados' } as const]
      : []),
    { href: '/notifications', title: 'Notificaciones', compact: 'Avisos' },
    { href: '/chat', title: 'Mensajes' },
    { href: '/profile', title: 'Perfil' },
  ];
}

export function ProtectedPage({
  title,
  children,
  requires,
  allowOnboarding = false,
  scrollRef,
}: {
  title: string;
  children: ReactNode;
  requires?: 'driver' | 'driverAccess';
  allowOnboarding?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const session = useSession();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const user = session.user;

  if (session.loading)
    return <ActivityIndicator accessibilityLabel="Consultando sesión" />;
  if (!user) return <Redirect href="/" />;
  if (!user.capabilities.passenger) return <Redirect href="/verify-email" />;
  if (!user.onboarding.completed && !allowOnboarding)
    return <Redirect href="/onboarding" />;
  if (requires && !user.capabilities[requires])
    return <Redirect href="/profile" />;

  const inOnboarding = !user.onboarding.completed;
  const items = navigation(user);
  const navLinks = (compact: boolean) =>
    items
      .filter(
        (item) =>
          !compact ||
          !['/publish', '/my-trips', '/chat'].includes(String(item.href)),
      )
      .map((item) => {
        const current =
          path === item.href ||
          (item.href === '/chat' && path.startsWith('/chat/')) ||
          (item.href === '/available-trips' &&
            (path === '/search-trips' || path.startsWith('/trip/')));
        return (
          <Link
            key={String(item.href)}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            style={[
              styles.link,
              compact && styles.compactLink,
              current && styles.selected,
            ]}
          >
            {compact ? (item.compact ?? item.title) : item.title}
          </Link>
        );
      });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.frame, wide && styles.horizontal]}>
        {wide && !inOnboarding && (
          <View style={styles.sidebar}>
            <Link href="/" style={styles.brand}>
              RuTeam
            </Link>
            <View
              role="navigation"
              accessibilityLabel="Navegación principal"
              style={styles.nav}
            >
              {navLinks(false)}
            </View>
          </View>
        )}
        <View style={styles.main}>
          {(!wide || inOnboarding) && (
            <View style={styles.top}>
              <Text style={styles.brand}>RuTeam</Text>
            </View>
          )}
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.page}
          >
            {inOnboarding && (
              <Link href="/onboarding" style={formStyles.link}>
                Volver a la incorporación
              </Link>
            )}
            <Text role="heading" aria-level={1} style={styles.title}>
              {title}
            </Text>
            {(session.connection !== 'available' ||
              session.reconnectingLive) && (
              <Text accessibilityLiveRegion="polite" style={formStyles.text}>
                {session.connection === 'lost'
                  ? 'Conexión perdida. La información visible puede contener datos desactualizados.'
                  : session.connection === 'reconnecting'
                    ? 'Reconectando. La información visible puede contener datos desactualizados.'
                    : 'Reconectando las actualizaciones en tiempo real.'}
              </Text>
            )}
            {children}
          </ScrollView>
        </View>
        {!wide && !inOnboarding && (
          <View
            role="navigation"
            accessibilityLabel="Navegación principal"
            style={styles.bottom}
          >
            {navLinks(true)}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

export const formStyles = StyleSheet.create({
  section: {
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  error: { color: colors.danger, fontSize: 16, lineHeight: 23 },
  choice: {
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    minHeight: 44,
  },
  selected: { backgroundColor: colors.selected, borderColor: colors.primary },
  link: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 10,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  frame: { flex: 1 },
  horizontal: { flexDirection: 'row' },
  sidebar: {
    width: 239,
    borderRightWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 28,
    gap: 34,
  },
  brand: {
    color: colors.dark,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  top: {
    minHeight: 52,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  nav: { gap: 6 },
  link: {
    color: colors.muted,
    fontWeight: '700',
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  compactLink: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 3,
    flex: 1,
  },
  selected: { backgroundColor: colors.selected, color: colors.dark },
  bottom: {
    flexDirection: 'row',
    minHeight: 56,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  main: { flex: 1, minWidth: 0 },
  page: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    padding: 18,
    gap: 18,
    paddingBottom: 42,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
});
