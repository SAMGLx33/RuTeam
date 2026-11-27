import type { Href } from 'expo-router';
import type { TripNotificationView } from '@ruteam/contracts';

const eventNotice: Partial<
  Record<string, { title: string; action: string; href: Href }>
> = {
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
  DRIVING_DOCUMENT_REMINDER: {
    title: 'Revisa la vigencia de tus documentos de conducción',
    action: 'Ver mis documentos',
    href: '/vehicles',
  },
};

const operationNotice: Partial<Record<string, string>> = {
  PARTICIPATION_CONFIRMED: 'Tu plaza está confirmada',
  PASSENGER_JOINED: 'Nueva participación en tu viaje',
  PASSENGER_WITHDREW: 'Un pasajero retiró su participación',
  PICKUP_PROPOSED: 'Nueva propuesta de recogida',
  TRIP_CANCELLED: 'El conductor canceló el viaje',
  TRIP_STARTED: 'Tu viaje inició',
  PICKUP_NEXT: 'Recogida actual o siguiente en el recorrido',
  TRIP_FINISHED: 'El viaje finalizó',
  TRIP_INTERRUPTED: 'El conductor interrumpió el viaje',
  DESTINATION_REACHED: 'El conductor registró la llegada a tu destino',
  TRIP_DELAYED: 'El conductor informó un retraso',
  TRIP_EXPIRED: 'La publicación venció antes de iniciar',
  TRIP_EDITED: 'El conductor actualizó la descripción del viaje',
  TRIP_DEPARTURE_REMINDER: 'Se acerca la salida de tu viaje',
  TRIP_PICKUP_REMINDER: 'Se acerca la hora de tu recogida',
};

const detailNotice: Partial<Record<string, string>> = {
  SEAT_AVAILABLE: 'Se liberó una plaza',
  PICKUP_CONFIRMATION_REMINDER: 'Revisa tu propuesta de recogida',
  PICKUP_ACCEPTED: 'Tu propuesta de recogida fue aceptada',
  PICKUP_REJECTED: 'Tu propuesta de recogida fue rechazada',
};

export function notificationContent(item: TripNotificationView): {
  title: string;
  action: string;
  href?: Href;
  unavailable: string;
} {
  const operationTitle = operationNotice[item.kind];
  if (item.tripId && operationTitle)
    return {
      title: operationTitle,
      action: 'Abrir resumen del viaje',
      href: {
        pathname: '/trip-operation/[tripId]',
        params: { tripId: item.tripId },
      },
      unavailable: 'El resumen de este viaje ya no está disponible.',
    };
  const detailTitle = detailNotice[item.kind];
  if (item.tripId && detailTitle)
    return {
      title: detailTitle,
      action: 'Abrir viaje',
      href: { pathname: '/trip/[id]', params: { id: item.tripId } },
      unavailable: 'El viaje ya no tiene disponibilidad.',
    };
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
      const content = eventNotice[item.kind];
      if (!content)
        return {
          title: 'Hay una actualización en RuTeam',
          action: '',
          unavailable: 'La acción de este aviso ya no está disponible.',
        };
      const { title, action, href } = content;
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
