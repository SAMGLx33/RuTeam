import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Text, TextInput, View } from 'react-native';
import type {
  EconomicHistory,
  EconomicHistoryEntry,
  EconomicHistoryFilter,
  EconomicHistoryRole,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Choice } from '../trips/itinerary-form';
import { travelTime, tripStatusLabel } from '../trips/route-preview';
import { pesos } from './economic-terms';

const filters: Record<EconomicHistoryFilter, string> = {
  FREE: 'Gratuitos',
  SUGGESTED: 'Con aporte sugerido',
  DECLARED: 'Pendientes de reconocer',
  ACKNOWLEDGED: 'Reconocidos',
  DISPUTED: 'Con discrepancia',
  CANCELLED: 'Registros cancelados',
};

const participationLabels = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'Sin abordaje',
};

function HistoryItem({ entry }: { entry: EconomicHistoryEntry }) {
  return (
    <View style={s.section}>
      <Text style={s.title}>{entry.route}</Text>
      <Text style={s.text}>
        {travelTime(entry.departureAt)} · {tripStatusLabel[entry.tripStatus]}
      </Text>
      {entry.participationStatus && (
        <Text style={s.text}>
          Participación ·{' '}
          {entry.traveled
            ? 'Abordada'
            : participationLabels[entry.participationStatus]}
        </Text>
      )}
      <Text style={s.text}>
        {entry.suggestedCop === null
          ? 'Condición económica histórica'
          : entry.suggestedCop === 0
            ? 'Viaje gratuito'
            : 'Aporte sugerido por pasajero · ' +
              pesos(entry.suggestedCop) +
              ' COP'}
      </Text>
      {entry.expenseCop !== null && (
        <Text style={s.text}>
          Gasto estimado privado · {pesos(entry.expenseCop)} COP
        </Text>
      )}
      {!!entry.records.DECLARED && (
        <Text style={s.text}>
          {entry.records.DECLARED} pendiente de reconocer ·{' '}
          {pesos(entry.declaredCop)} COP
        </Text>
      )}
      {!!entry.records.ACKNOWLEDGED && (
        <Text style={s.text}>
          {entry.records.ACKNOWLEDGED} reconocida ·{' '}
          {pesos(entry.acknowledgedCop)} COP
        </Text>
      )}
      {!!entry.records.DISPUTED && (
        <Text style={s.text}>
          {entry.records.DISPUTED} con discrepancia · {pesos(entry.disputedCop)}{' '}
          COP
        </Text>
      )}
      {!!entry.records.CANCELLED && (
        <Text style={s.text}>{entry.records.CANCELLED} cancelada</Text>
      )}
      <Link
        href={{ pathname: '/trip/[id]', params: { id: entry.tripId } }}
        style={s.link}
      >
        Ver viaje
      </Link>
      {entry.canOpenCompensation && entry.participationId && (
        <Link
          href={{
            pathname: '/compensations/[id]',
            params: { id: entry.participationId },
          }}
          style={s.link}
        >
          Ver registro de compensación
        </Link>
      )}
    </View>
  );
}

export function EconomicHistoryScreen() {
  const { user } = useSession();
  const params = useLocalSearchParams<{ role?: string; tripId?: string }>();
  const [mode, setMode] = useState<EconomicHistoryRole | undefined>();
  const [filter, setFilter] = useState<EconomicHistoryFilter>();
  const [monthInput, setMonthInput] = useState('');
  const [month, setMonth] = useState('');
  const role =
    user?.capabilities.driverAccess &&
    (mode === 'DRIVER' || (!mode && params.role === 'DRIVER'))
      ? 'DRIVER'
      : 'PASSENGER';
  const query = useInfiniteQuery({
    queryKey: [
      'economic-history',
      user?.id,
      role,
      filter,
      month,
      params.tripId,
    ],
    enabled: !!user?.capabilities.passenger,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const paramsQuery = new URLSearchParams({
        role,
        offset: String(pageParam),
      });
      if (filter) paramsQuery.set('filter', filter);
      if (month) paramsQuery.set('month', month);
      if (params.tripId) paramsQuery.set('tripId', params.tripId);
      return api<EconomicHistory>(
        '/economics/history?' + paramsQuery.toString(),
      );
    },
    getNextPageParam: (page) => page.nextOffset ?? undefined,
  });
  const first = query.data?.pages[0];
  return (
    <ProtectedPage title="Historial económico">
      <View style={s.section}>
        {user?.capabilities.driverAccess && (
          <>
            <Choice
              label="Como pasajero"
              checked={role === 'PASSENGER'}
              onPress={() => setMode('PASSENGER')}
            />
            <Choice
              label="Como conductor"
              checked={role === 'DRIVER'}
              onPress={() => setMode('DRIVER')}
            />
          </>
        )}
        {params.tripId && (
          <Link href="/economic-history" style={s.link}>
            Ver todos mis viajes
          </Link>
        )}
        <Text style={s.text}>Mes de salida (AAAA-MM)</Text>
        <TextInput
          accessibilityLabel="Mes de salida (AAAA-MM)"
          placeholder="Todos los meses"
          value={monthInput}
          onChangeText={setMonthInput}
          maxLength={7}
          style={{
            minHeight: 48,
            borderWidth: 1,
            padding: 10,
            borderRadius: 8,
          }}
        />
        <Button
          title="Aplicar mes"
          secondary
          disabled={
            !!monthInput && !/^20\d{2}-(0[1-9]|1[0-2])$/.test(monthInput)
          }
          onPress={() => setMonth(monthInput)}
        />
        <Choice
          label="Todos los estados"
          checked={!filter}
          onPress={() => setFilter(undefined)}
        />
        {(Object.keys(filters) as EconomicHistoryFilter[]).map((key) => (
          <Choice
            key={key}
            label={filters[key]}
            checked={filter === key}
            onPress={() => setFilter(key)}
          />
        ))}
      </View>
      {query.isPending && <Text style={s.text}>Consultando historial…</Text>}
      {query.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error.message}
        </Text>
      )}
      {first && (
        <View style={s.section}>
          <Text style={s.title}>Totales del periodo</Text>
          <Text style={s.text}>{first.totalEntries} registros</Text>
          <Text style={s.text}>
            {role === 'DRIVER'
              ? 'Gastos estimados de ' +
                first.totals.expenseTrips +
                ' viajes · ' +
                pesos(first.totals.expenseCop)
              : 'Aportes sugeridos de viajes abordados · ' +
                pesos(first.totals.suggestedForTraveledCop)}{' '}
            COP
          </Text>
          <Text style={s.text}>
            Declarado pendiente · {pesos(first.totals.declaredCop)} COP
          </Text>
          <Text style={s.text}>
            Reconocido · {pesos(first.totals.acknowledgedCop)} COP
          </Text>
          <Text style={s.text}>
            En discrepancia · {pesos(first.totals.disputedCop)} COP
          </Text>
          <Text style={s.text}>
            Las cifras resumen gastos estimados y declaraciones personales.
          </Text>
        </View>
      )}
      {first?.totalEntries === 0 && (
        <Text style={s.text}>
          El periodo y estado elegidos no tienen registros.
        </Text>
      )}
      {query.data?.pages
        .flatMap((page) => page.entries)
        .map((entry) => (
          <HistoryItem
            key={entry.participationId ?? entry.tripId}
            entry={entry}
          />
        ))}
      {query.hasNextPage && (
        <Button
          title="Ver más registros"
          disabled={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      )}
    </ProtectedPage>
  );
}
