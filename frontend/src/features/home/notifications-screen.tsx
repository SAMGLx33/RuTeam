import { Link, type Href } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { NotificationPage, TripNotificationView } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { tripDate } from '../trips/trip-feed';

const eventNotice = {
  PARTICIPATION_CONFIRMED: {
    title: 'Tu plaza está confirmada',
    action: 'Mis participaciones',
    href: '/my-reservations',
  },
  PASSENGER_JOINED: {
    title: 'Nueva participación en tu viaje',
    action: 'Mis viajes publicados',
    href: '/my-trips',
  },
  PASSENGER_WITHDREW: {
    title: 'Un pasajero retiró su participación',
    action: 'Mis viajes publicados',
    href: '/my-trips',
  },
  PICKUP_PROPOSED: {
    title: 'Nueva propuesta de recogida',
    action: 'Mis viajes publicados',
    href: '/my-trips',
  },
  PICKUP_ACCEPTED: {
    title: 'Tu propuesta de recogida fue aceptada',
    action: 'Mis participaciones',
    href: '/my-reservations',
  },
  PICKUP_REJECTED: {
    title: 'Tu propuesta de recogida fue rechazada',
    action: 'Mis participaciones',
    href: '/my-reservations',
  },
  TRIP_CANCELLED: {
    title: 'El conductor canceló el viaje',
    action: 'Ver historial',
    href: '/my-reservations',
  },
  TRIP_STARTED: {
    title: 'Tu viaje inició',
    action: 'Mis participaciones',
    href: '/my-reservations',
  },
  PICKUP_NEXT: {
    title: 'Recogida actual o siguiente en el recorrido',
    action: 'Mis participaciones',
    href: '/my-reservations',
  },
  TRIP_FINISHED: {
    title: 'El viaje finalizó',
    action: 'Abrir viajes',
    href: '/',
  },
  COMPENSATION_DECLARED: {
    title: 'Un pasajero declaró una compensación',
    action: 'Historial económico',
    href: '/economic-history',
  },
  RECURRENCE_PAUSED: {
    title: 'Pausaste una recurrencia',
    action: 'Viajes recurrentes',
    href: '/recurring-trips',
  },
  OCCURRENCE_FAILED: {
    title: 'Una fecha recurrente está pendiente de publicar',
    action: 'Revisar fechas',
    href: '/recurring-trips',
  },
  OCCURRENCE_PUBLISHED: {
    title: 'Se publicó una fecha de tu recurrencia',
    action: 'Viajes recurrentes',
    href: '/recurring-trips',
  },
  COMPENSATION_DISPUTED: {
    title: 'Se registró una discrepancia en tu aporte',
    action: 'Historial económico',
    href: '/economic-history',
  },
  TRIP_INTERRUPTED: {
    title: 'El conductor interrumpió el viaje',
    action: 'Ver historial',
    href: '/my-reservations',
  },
  INCIDENT_RECORDED: {
    title: 'Guardaste una incidencia privada',
    action: 'Mis incidencias',
    href: '/incidents',
  },
  ACCOUNT_REACTIVATED: {
    title: 'Reactivaste tu cuenta',
    action: 'Cuenta y privacidad',
    href: '/account-settings',
  },
  ELIGIBILITY_CHANGED: {
    title: 'Cambió tu elegibilidad',
    action: 'Ver perfil',
    href: '/profile',
  },
  COMPENSATION_ACKNOWLEDGED: {
    title: 'El conductor reconoció tu compensación',
    action: 'Historial económico',
    href: '/economic-history',
  },
} as const;

function notificationContent(item: TripNotificationView): {
  title: string;
  action: string;
  href: Href;
  unavailable: string;
} {
  switch (item.kind) {
    case 'CHAT_MESSAGE':
      return {
        title: 'Nuevo mensaje en un viaje',
        action: 'Abrir chat',
        href: { pathname: '/chat/[tripId]', params: { tripId: item.tripId } },
        unavailable: 'La conversación ya no está disponible.',
      };
    case 'RATING_AVAILABLE':
      return {
        title: 'Hay un viaje que puedes calificar',
        action: 'Ver calificaciones del viaje',
        href: {
          pathname: '/ratings/[tripId]',
          params: { tripId: item.tripId },
        },
        unavailable: 'Ya no puedes consultar las calificaciones de este viaje.',
      };
    case 'GROUP_CONFIRMED':
      return {
        title: 'Participación grupal confirmada',
        action: 'Mis grupos',
        href: '/groups',
        unavailable: 'La participación ya no está disponible.',
      };
    case 'TRIP_MATCH':
      return {
        title:
          item.matchType === 'DIRECT'
            ? 'Hay un viaje compatible'
            : 'Un viaje pasa cerca de tu zona',
        action: 'Abrir viaje',
        href: { pathname: '/trip/[id]', params: { id: item.tripId } },
        unavailable: 'El viaje ya no tiene disponibilidad.',
      };
    default: {
      if (item.kind === 'PICKUP_ACCEPTED' || item.kind === 'PICKUP_REJECTED')
        return {
          title: eventNotice[item.kind].title,
          action: 'Abrir viaje',
          href: { pathname: '/trip/[id]', params: { id: item.tripId } },
          unavailable: 'El viaje ya no está abierto a nuevas recogidas.',
        };
      const { title, action, href } = eventNotice[item.kind];
      if (
        item.kind === 'COMPENSATION_DECLARED' ||
        item.kind === 'COMPENSATION_ACKNOWLEDGED' ||
        item.kind === 'COMPENSATION_DISPUTED'
      ) {
        return {
          title,
          action,
          href: {
            pathname: '/economic-history',
            params: {
              tripId: item.tripId,
              role:
                item.kind === 'COMPENSATION_DECLARED' ? 'DRIVER' : 'PASSENGER',
            },
          },
          unavailable:
            'El historial económico de este viaje ya no está disponible.',
        };
      }
      return {
        title,
        action,
        href,
        unavailable: 'La acción de este aviso ya no está disponible.',
      };
    }
  }
}

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
            {(item.kind === 'TRIP_MATCH' || item.available) && (
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
