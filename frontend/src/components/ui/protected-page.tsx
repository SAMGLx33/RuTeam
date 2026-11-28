import { Redirect, usePathname, useRouter } from 'expo-router';
import {
  ScrollView as NativeScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import type { ReactNode, RefObject } from 'react';
import type { NotificationPage } from '@ruteam/contracts';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import {
  breakpoints,
  colors,
  radii,
  spacing,
  typography,
} from '../../theme/tokens';
import {
  ActivityIndicator,
  Link,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '../../theme/primitives';
import { AppNavigation, Brand, initials } from '../navigation/app-navigation';
import { Icon } from './icon';
import { IconButton } from './button';

const mainRoutes = ['/', '/available-trips', '/activity', '/chat', '/profile'];

export function ProtectedPage({
  title,
  children,
  requires,
  allowOnboarding = false,
  compactTitle = false,
  scrollRef,
}: {
  title: string;
  children: ReactNode;
  requires?: 'driver' | 'driverAccess';
  allowOnboarding?: boolean;
  compactTitle?: boolean;
  scrollRef?: RefObject<NativeScrollView | null>;
}) {
  const session = useSession();
  const router = useRouter();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.sidebar;
  const user = session.user;
  const unlocked = !!user?.capabilities.passenger && user.onboarding.completed;
  const notices = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: unlocked,
    queryFn: () => api<NotificationPage>('/notifications'),
    refetchInterval: 30000,
  });

  if (session.loading)
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator accessibilityLabel="Consultando sesión" />
      </SafeAreaView>
    );
  if (!user) return <Redirect href="/" />;
  if (!user.capabilities.passenger) return <Redirect href="/verify-email" />;
  if (!user.onboarding.completed && !allowOnboarding)
    return <Redirect href="/onboarding" />;
  if (requires && !user.capabilities[requires])
    return <Redirect href="/profile" />;

  const unread =
    notices.data?.items.filter(({ readAt }) => !readAt).length ?? 0;
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace('/');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.frame, wide && styles.horizontal]}>
        {wide && unlocked && <AppNavigation wide />}
        <View style={styles.main}>
          <View style={[styles.header, wide && styles.headerWide]}>
            <View style={styles.headerLeft}>
              {unlocked && !mainRoutes.includes(path) && (
                <IconButton label="Volver" icon="arrow-left" onPress={goBack} />
              )}
              {wide && unlocked ? (
                <Text role="heading" aria-level={1} style={styles.headerTitle}>
                  {title}
                </Text>
              ) : (
                <>
                  <Brand small />
                  {compactTitle && (
                    <Text
                      role="heading"
                      aria-level={1}
                      style={styles.compactTitle}
                    >
                      {title}
                    </Text>
                  )}
                </>
              )}
            </View>
            {unlocked && (
              <View style={styles.headerTools}>
                <Link
                  href="/notifications"
                  accessibilityLabel={
                    unread
                      ? `Notificaciones, ${unread} sin leer`
                      : 'Notificaciones'
                  }
                  style={styles.utility}
                >
                  <Icon name="bell" />
                  {unread > 0 && <Text style={styles.unread}>{unread}</Text>}
                </Link>
                {wide && (
                  <Link
                    href="/profile"
                    accessibilityLabel="Abrir mi perfil"
                    style={styles.avatar}
                  >
                    {initials(user.profile.displayName)}
                  </Link>
                )}
              </View>
            )}
          </View>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.page, wide && styles.pageWide]}
          >
            {!unlocked && (
              <Link href="/onboarding" style={formStyles.link}>
                Volver a la incorporación
              </Link>
            )}
            {(!wide || !unlocked) && !compactTitle && (
              <Text role="heading" aria-level={1} style={styles.title}>
                {title}
              </Text>
            )}
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
        {!wide && unlocked && <AppNavigation wide={false} />}
      </View>
    </SafeAreaView>
  );
}

export const formStyles = StyleSheet.create({
  section: {
    gap: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.ink,
    fontSize: typography.section,
    letterSpacing: -0.35,
    fontWeight: '700',
  },
  text: { color: colors.muted, fontSize: typography.body, lineHeight: 22 },
  error: { color: colors.danger, fontSize: typography.body, lineHeight: 22 },
  choice: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.selected, borderColor: colors.primary },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 10,
    minHeight: 42,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  frame: { flex: 1 },
  horizontal: { flexDirection: 'row' },
  main: { flex: 1, minWidth: 0 },
  header: {
    minHeight: 59,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerWide: { minHeight: 74, paddingHorizontal: spacing.xxl },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  compactTitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 25,
    letterSpacing: -0.65,
    fontWeight: '800',
    flexShrink: 1,
  },
  headerTools: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  utility: {
    minWidth: 44,
    minHeight: 44,
    padding: 10,
    textAlign: 'center',
    color: colors.ink,
  },
  unread: {
    backgroundColor: colors.selected,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  avatar: {
    backgroundColor: colors.selected,
    color: colors.primary,
    fontWeight: '800',
    borderRadius: 22,
    minWidth: 44,
    minHeight: 44,
    textAlign: 'center',
    padding: 12,
  },
  page: {
    width: '100%',
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 34,
    maxWidth: 1460,
    flexGrow: 1,
  },
  pageWide: { padding: spacing.xxl, gap: spacing.xl, paddingBottom: 48 },
  title: {
    color: colors.ink,
    fontSize: typography.title,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -0.85,
  },
});
