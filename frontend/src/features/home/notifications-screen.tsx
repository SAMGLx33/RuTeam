import { useState } from 'react';
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import type { NotificationPage, TripNotificationView } from '@ruteam/contracts';
import { Text, View } from 'react-native';
import type { NotificationPage } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Link, Pressable, Text, View } from '../../theme/primitives';
import { colors } from '../../theme/tokens';

const noticeDay = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'full',
});
const noticeTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  timeStyle: 'short',
});

const noticeFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'unread', label: 'Sin leer' },
] as const;

import { notificationContent } from './notification-content';

export function NotificationsScreen() {
  const { user } = useSession();
  const client = useQueryClient();
  const [filter, setFilter] =
    useState<(typeof noticeFilters)[number]['id']>('all');
  const query = useInfiniteQuery({
    queryKey: ['notification-list', user?.id],
    enabled: !!user?.capabilities.passenger,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<NotificationPage>(
        `/notifications${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 30000,
  });
  const read = useMutation({
    mutationFn: (id: string) =>
      api(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notification-list'] });
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const sections = new Map<string, TripNotificationView[]>();
  for (const item of items) {
    if (filter === 'unread' && item.readAt) continue;
    const day = noticeDay.format(new Date(item.createdAt));
    const entries = sections.get(day);
    if (entries) entries.push(item);
    else sections.set(day, [item]);
  }
  return (
    <ProtectedPage title="Notificaciones">
      <View style={styles.toolbar}>
        <View
          role="group"
          accessibilityLabel="Filtrar avisos"
          style={styles.filters}
        >
          {noticeFilters.map(({ id, label }) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === id }}
              aria-pressed={filter === id}
              onPress={() => setFilter(id)}
              style={[styles.filter, filter === id && styles.selectedFilter]}
            >
              <Text style={styles.filterText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.links}>
          <Link href="/notification-settings" style={styles.actionLink}>
            Preferencias de avisos
          </Link>
          <Link href="/chat" style={styles.actionLink}>
            Ver mensajes
          </Link>
        </View>
      </View>
      {query.isPending && <Text style={s.text}>Cargando avisos…</Text>}
      {(query.error || read.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error?.message ?? read.error?.message}
        </Text>
      )}
      {!query.isPending && !query.error && !items.length && (
        <View style={s.section}>
          <Text role="heading" aria-level={2} style={s.title}>
            Aún no tienes avisos
          </Text>
          <Text style={s.text}>
            Aquí aparecen las novedades de tus viajes y las coincidencias con
            tus preferencias.
          </Text>
          <Link href="/mobility" style={s.link}>
            Configurar mis preferencias
          </Link>
        </View>
      )}
      {items.length > 0 && sections.size === 0 && (
        <View style={s.section}>
          <Text style={s.text} accessibilityLiveRegion="polite">
            {query.hasNextPage
              ? 'No hay avisos sin leer en los resultados cargados.'
              : 'Ya leíste todos tus avisos.'}
          </Text>
        </View>
      )}
      {[...sections].map(([day, entries]) => (
        <View key={day} style={styles.dateSection}>
          <Text role="heading" aria-level={2} style={styles.dateHeading}>
            {day}
          </Text>
          <View style={styles.notices}>
            {entries.map((item, index) => {
              const content = notificationContent(item);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.notice,
                    index > 0 && styles.divider,
                    !item.readAt && styles.unread,
                  ]}
                >
                  <View style={styles.noticeHeading}>
                    <Text style={styles.noticeTitle}>{content.title}</Text>
                    <Text style={styles.meta}>
                      {noticeTime.format(new Date(item.createdAt))} ·{' '}
                      <Text style={!item.readAt && styles.unreadText}>
                        {item.readAt ? 'Leído' : 'Sin leer'}
                      </Text>
                    </Text>
                  </View>
                  {!item.available && (
                    <Text style={styles.meta}>{content.unavailable}</Text>
                  )}
                  <View style={styles.links}>
                    {(item.kind === 'TRIP_MATCH' || item.available) && (
                      <Link
                        href={content.href}
                        style={[
                          styles.actionLink,
                          !item.readAt && styles.unreadAction,
                        ]}
                        onPress={() => {
                          if (!item.readAt) read.mutate(item.id);
                        }}
                      >
                        {content.action}
                      </Link>
                    )}
                    {!item.readAt && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: read.isPending }}
                        disabled={read.isPending}
                        onPress={() => read.mutate(item.id)}
                        style={({ pressed }) => [
                          styles.readAction,
                          (pressed || read.isPending) && styles.inactive,
                        ]}
                      >
                        <Text style={styles.readActionText}>
                          Marcar como leído
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {query.hasNextPage && (
        <Button
          title="Ver más avisos"
          secondary
          disabled={query.isFetchingNextPage}
          onPress={() => {
            void query.fetchNextPage();
          }}
        />
      )}
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 18,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filter: {
    minHeight: 44,
    paddingHorizontal: 15,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  selectedFilter: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  filterText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 },
  dateSection: { gap: 8 },
  dateHeading: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  notices: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  notice: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 5, gap: 3 },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  unread: { backgroundColor: colors.selected },
  noticeHeading: { gap: 4, paddingBottom: 2 },
  noticeTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  unreadText: { color: colors.ink, fontWeight: '700' },
  actionLink: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    paddingVertical: 12,
  },
  unreadAction: { color: colors.ink, textDecorationLine: 'underline' },
  readAction: { justifyContent: 'center', minHeight: 44 },
  readActionText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  inactive: { opacity: 0.65 },
});
