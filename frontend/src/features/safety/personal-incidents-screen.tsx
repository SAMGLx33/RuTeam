import { Link, Text, View } from '../../theme/primitives';
import { useState } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import type {
  IncidentTripContext,
  PersonalIncidentsPage,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { travelTime } from '../trips/route-preview';
import { IncidentSummary, kindLabel } from './incident-summary';

export function PersonalIncidentsScreen() {
  const { user } = useSession();
  const [showTrips, setShowTrips] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ['my-incidents', user?.id],
    queryFn: ({ pageParam }) =>
      api<PersonalIncidentsPage>('/me/incidents?offset=' + pageParam),
    enabled: !!user?.capabilities.passenger,
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    gcTime: 0,
  });
  const trips = useInfiniteQuery({
    queryKey: ['incident-trips', user?.id],
    queryFn: ({ pageParam }) =>
      api<{ trips: IncidentTripContext[]; nextOffset: number | null }>(
        '/me/incidents/trips?offset=' + pageParam,
      ),
    enabled: showTrips && !!user?.capabilities.passenger,
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    gcTime: 0,
  });
  const records = query.data?.pages.flatMap((page) => page.records) ?? [];
  return (
    <ProtectedPage title="Mis incidencias">
      <Text style={s.text}>
        Historial privado de los registros que guardaste desde tus viajes.
      </Text>
      <Button
        title={
          showTrips
            ? 'Cerrar selección de viaje'
            : 'Elegir viaje para registrar incidencia'
        }
        secondary
        onPress={() => setShowTrips(!showTrips)}
      />
      {showTrips && (
        <View style={s.section}>
          {trips.isPending && (
            <Text style={s.text}>Consultando tus viajes…</Text>
          )}
          {trips.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {trips.error.message}
            </Text>
          )}
          {trips.data?.pages[0]?.trips.length === 0 && (
            <Text style={s.text}>
              Aún no hay viajes que admitan un registro de incidencia.
            </Text>
          )}
          {trips.data?.pages
            .flatMap((page) => page.trips)
            .map((trip) => (
              <Link
                key={trip.id}
                href={{
                  pathname: '/incidents/[tripId]',
                  params: { tripId: trip.id },
                }}
                style={s.link}
              >
                {trip.originLabel} · {travelTime(trip.departureAt)}
              </Link>
            ))}
          {trips.hasNextPage && (
            <Button
              title="Ver otros viajes"
              secondary
              onPress={() => void trips.fetchNextPage()}
            />
          )}
        </View>
      )}
      {query.isPending && (
        <Text style={s.text}>Consultando tus registros…</Text>
      )}
      {query.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error.message}
        </Text>
      )}
      {query.data && !records.length && (
        <Text style={s.text}>Aún no tienes incidencias registradas.</Text>
      )}
      {records.map((record) => (
        <View key={record.id} style={s.section}>
          <Text style={s.title}>{kindLabel[record.kind]}</Text>
          <Text style={s.text}>
            Registro privado · {travelTime(record.createdAt)}
          </Text>
          <Text style={s.text}>{record.description}</Text>
          <Link
            href={{
              pathname: '/incidents/[tripId]',
              params: { tripId: record.trip.id },
            }}
            style={s.link}
          >
            Incidencias de {record.trip.originLabel}
          </Link>
          <IncidentSummary id={record.id} />
        </View>
      ))}
      {query.hasNextPage && (
        <Button
          title="Ver más incidencias"
          secondary
          onPress={() => void query.fetchNextPage()}
        />
      )}
    </ProtectedPage>
  );
}
