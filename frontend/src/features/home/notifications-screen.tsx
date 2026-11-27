import { Link } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { NotificationPage } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { tripDate } from '../trips/trip-feed';

import { notificationContent } from './notification-content';

export function NotificationsScreen() {
  const { user } = useSession();
  const client = useQueryClient();
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
  return (
    <ProtectedPage title="Notificaciones">
      <Link href="/notification-settings" style={s.link}>
        Preferencias de avisos
      </Link>
      <Link href="/chat" style={s.link}>
        Ver mensajes
      </Link>
      {query.isPending && <Text style={s.text}>Cargando avisos…</Text>}
      {(query.error || read.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error?.message ?? read.error?.message}
        </Text>
      )}
      {!query.isPending && !query.error && !items.length && (
        <View style={s.section}>
          <Text style={s.title}>Aún no tienes avisos</Text>
          <Text style={s.text}>
            Aquí aparecen las novedades de tus viajes y las coincidencias con
            tus preferencias.
          </Text>
          <Link href="/mobility" style={s.link}>
            Configurar mis preferencias
          </Link>
        </View>
      )}
      {items.map((item) => {
        const content = notificationContent(item);
        return (
          <View key={item.id} style={s.section}>
            <Text style={s.title}>{content.title}</Text>
            <Text style={s.text}>
              {tripDate(item.createdAt)} · {item.readAt ? 'Leído' : 'Sin leer'}
            </Text>
            {!item.available && (
              <Text style={s.text}>{content.unavailable}</Text>
            )}
            {String(item.kind) === 'SEAT_AVAILABLE' && item.available && (
              <Text style={s.text}>
                La disponibilidad puede cambiar antes de confirmar.
              </Text>
            )}
            {content.href && (item.kind === 'TRIP_MATCH' || item.available) && (
              <Link
                href={content.href}
                style={s.link}
                onPress={() => {
                  if (!item.readAt) read.mutate(item.id);
                }}
              >
                {content.action}
              </Link>
            )}
            {!item.readAt && (
              <Button
                title="Marcar como leído"
                secondary
                disabled={read.isPending}
                onPress={() => read.mutate(item.id)}
              />
            )}
          </View>
        );
      })}
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
