import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { TripSummary } from '@ruteam/contracts';
import { api } from '../../services/api/client';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
export function MyTripsScreen() {
  const trips = useQuery({
    queryKey: ['my-trips'],
    queryFn: () => api<TripSummary[]>('/trips/my'),
  });
  return (
    <ProtectedPage title="Mis viajes publicados">
      <Link href="/publish" style={s.link}>
        Publicar otro viaje
      </Link>
      {trips.isPending && <Text>Cargando viajes…</Text>}
      {trips.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {trips.error.message}
        </Text>
      )}
      {trips.data?.length === 0 && <Text>Aún no has publicado viajes.</Text>}
      {trips.data?.map((trip) => (
        <View key={trip.id} style={s.section}>
          <Text style={s.title}>
            {trip.origin.label} → {trip.destination.name}
          </Text>
          <Text style={s.text}>
            {new Date(trip.departureAt).toLocaleString('es-CO', {
              timeZone: 'America/Bogota',
            })}{' '}
            · Colombia
          </Text>
          <Text style={s.text}>
            {trip.status} · {trip.occupancy} · {trip.availableSeats}/
            {trip.offeredSeats} plazas
          </Text>
          <Text style={s.text}>
            {trip.vehicle.plate} · duración DEMO {trip.estimatedDurationMinutes}{' '}
            minutos
          </Text>
          {trip.stops.map((stop) => (
            <Text key={stop.position} style={s.text}>
              {stop.position}. {stop.label} · {stop.latitude}, {stop.longitude}{' '}
              (DEMO)
            </Text>
          ))}
          {trip.vehicle.type === 'MOTORCYCLE' && (
            <Text style={s.text}>
              {trip.providesHelmet
                ? 'Casco incluido DEMO'
                : 'Trae tu propio casco'}
            </Text>
          )}
          <Text style={s.text}>
            {trip.rules.map((rule) => rule.description).join(' · ')}
          </Text>
        </View>
      ))}
      <Text style={s.text}>
        Las reservas y el inicio del recorrido corresponden a fases posteriores.
      </Text>
    </ProtectedPage>
  );
}
