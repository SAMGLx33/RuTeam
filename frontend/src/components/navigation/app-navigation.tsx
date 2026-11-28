import { usePathname } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Link, Text, View } from '../../theme/primitives';
import { useAppearance } from '../../theme/appearance';
import { colors, filledPrimary, radii } from '../../theme/tokens';
import { Icon, type IconName } from '../ui/icon';

const sections = [
  { route: '/', label: 'Inicio', icon: 'home' },
  { route: '/available-trips', label: 'Viajes', icon: 'navigation' },
  { route: '/activity', label: 'Actividad', icon: 'clock' },
  { route: '/chat', label: 'Mensajes', icon: 'message-square' },
  { route: '/profile', label: 'Perfil', icon: 'user' },
] as const satisfies readonly {
  route: string;
  label: string;
  icon: IconName;
}[];

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <View style={styles.identity}>
      <View style={[styles.mark, small && styles.markSmall]}>
        <Icon
          name="git-merge"
          color={colors.onPrimary}
          size={small ? 18 : 23}
        />
      </View>
      <Text style={[styles.brand, small && styles.brandSmall]}>RuTeam</Text>
    </View>
  );
}

function sectionFor(path: string): (typeof sections)[number]['route'] {
  if (path === '/') return '/';
  if (path === '/chat' || path.startsWith('/chat/')) return '/chat';
  if (
    ['/available-trips', '/search-trips', '/saved-trips', '/publish'].includes(
      path,
    ) ||
    path.startsWith('/trip/')
  )
    return '/available-trips';
  if (
    [
      '/activity',
      '/agenda',
      '/my-reservations',
      '/my-trips',
      '/recurring-trips',
      '/notifications',
    ].includes(path) ||
    path.startsWith('/trip-operation/')
  )
    return '/activity';
  return '/profile';
}

export function AppNavigation({ wide }: { wide: boolean }) {
  const active = sectionFor(usePathname());
  const { palette } = useAppearance();
  return (
    <View
      role="navigation"
      accessibilityLabel="Navegación principal"
      style={wide ? styles.sidebar : styles.tabs}
    >
      {wide && (
        <Link
          href="/"
          accessibilityLabel="RuTeam Inicio"
          style={styles.brandLink}
        >
          <Brand />
        </Link>
      )}
      {sections.map(({ route, icon, label }) => (
        <Link
          key={route}
          href={route}
          asChild
          aria-current={active === route ? 'page' : undefined}
        >
          <NavEntry
            wide={wide}
            active={active === route}
            icon={icon}
            label={label}
            color={active === route ? palette.primary : palette.muted}
          />
        </Link>
      ))}
    </View>
  );
}

import { Pressable } from '../../theme/primitives';
import type { ComponentProps } from 'react';
function NavEntry({
  wide,
  active,
  icon,
  label,
  color,
  ...press
}: {
  wide: boolean;
  active: boolean;
  icon: IconName;
  label: string;
  color: string;
} & ComponentProps<typeof Pressable>) {
  return (
    <Pressable
      {...press}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [
        wide ? styles.railItem : styles.tabItem,
        (active || pressed) && styles.itemActive,
      ]}
    >
      <Icon name={icon} color={color} size={wide ? 21 : 19} />
      <Text style={[styles.navText, !wide && styles.tabText, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase('es'))
      .join('') || 'R'
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    height: 42,
    width: 42,
    borderRadius: 12,
    backgroundColor: filledPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markSmall: { height: 34, width: 34, borderRadius: 10 },
  brand: {
    color: colors.ink,
    fontSize: 24,
    letterSpacing: -0.75,
    fontWeight: '900',
  },
  brandSmall: { fontSize: 20 },
  brandLink: { marginBottom: 28, paddingLeft: 6 },
  sidebar: {
    width: 222,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    paddingVertical: 26,
    backgroundColor: colors.surface,
    gap: 5,
  },
  railItem: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radii.control,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 5,
    paddingVertical: 5,
    gap: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 49,
    gap: 4,
    borderRadius: 10,
  },
  itemActive: { backgroundColor: colors.selected },
  navText: { fontSize: 15, fontWeight: '700' },
  tabText: { fontSize: 10, textAlign: 'center' },
});
