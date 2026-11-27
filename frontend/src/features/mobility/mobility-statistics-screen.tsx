import { Link, Text, View } from '../../theme/primitives';
import { EnvironmentPanel } from './environment-panel';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { colors, radii } from '../../theme/tokens';

import { useQuery } from '@tanstack/react-query';

import type { MobilityStatistics, MobilityTotals } from '@ruteam/contracts';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Choice } from '../trips/itinerary-form';

const kilometers = (meters: number) =>
  (meters / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 });

function Distance({
  label,
  meters,
  measured,
  trips,
}: {
  label: string;
  meters: number | null;
  measured: number;
  trips: number;
}) {
  return (
    <Text style={s.text}>
      {label} ·{' '}
      {meters === null
        ? 'Sin trayectos con distancia disponible'
        : kilometers(meters) + ' km · ' + measured + ' de ' + trips + ' viajes'}
    </Text>
  );
}

function Totals({ value }: { value: MobilityTotals }) {
  return (
    <>
      <Text style={s.text}>Como conductor · {value.driverTrips}</Text>
      <Text style={s.text}>Como pasajero · {value.passengerTrips}</Text>
      <Text style={s.text}>
        Desplazamientos compartidos · {value.sharedTrips}
      </Text>
      <Text style={s.text}>
        Participantes transportados · {value.transportedParticipants}
      </Text>
      <Distance
        label="Distancia como conductor"
        meters={value.driverDistanceMeters}
        measured={value.driverTripsWithDistance}
        trips={value.driverTrips}
      />
      <Distance
        label="Distancia compartida como pasajero"
        meters={value.passengerDistanceMeters}
        measured={value.passengerTripsWithDistance}
        trips={value.passengerTrips}
      />
    </>
  );
}

function MonthlyTravel({ rows }: { rows: MobilityStatistics['monthly'] }) {
  const maximum = Math.max(1, ...rows.map(({ sharedTrips }) => sharedTrips));
  return (
    <View style={s.section}>
      <Text role="heading" aria-level={2} style={s.title}>
        Desplazamientos compartidos por mes
      </Text>
      {rows.map(({ period, sharedTrips }) => {
        const month = new Intl.DateTimeFormat('es-CO', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(period + '-01T00:00:00Z'));
        return (
          <View key={period} style={chart.row}>
            <Text style={[s.text, chart.label]}>{month}</Text>
            <View style={chart.track} accessible={false}>
              <View
                style={[
                  chart.bar,
                  { width: `${(100 * sharedTrips) / maximum}%` },
                ]}
              />
            </View>
            <Text style={chart.value}>{sharedTrips}</Text>
          </View>
        );
      })}
    </View>
  );
}

const chart = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 83 },
  track: {
    flex: 1,
    borderRadius: radii.control,
    height: 10,
    backgroundColor: colors.selected,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radii.control,
    backgroundColor: colors.primary,
  },
  value: {
    minWidth: 26,
    textAlign: 'right',
    color: colors.ink,
    fontWeight: '700',
  },
});

export function MobilityStatisticsScreen() {
  const { user } = useSession();
  const [months, setMonths] = useState(12);
  const query = useQuery({
    queryKey: ['mobility-statistics', user?.id, months],
    queryFn: () =>
      api<MobilityStatistics>('/mobility/statistics?months=' + months),
    enabled: !!user?.capabilities.passenger,
  });
  return (
    <ProtectedPage title="Mis estadísticas de movilidad">
      <Link href="/my-reservations" style={s.link}>
        Mis participaciones
      </Link>
      <View style={s.section}>
        {[3, 6, 12].map((period) => (
          <Choice
            key={period}
            label={period + ' meses'}
            checked={months === period}
            onPress={() => setMonths(period)}
          />
        ))}
        {query.isPending && <Text style={s.text}>Cargando estadísticas…</Text>}
        {query.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {query.error.message}
          </Text>
        )}
        {query.data && (
          <>
            <Text style={s.title}>Totales del periodo</Text>
            {!query.data.monthly.length && (
              <Text style={s.text}>
                Aún no hay viajes completados en este periodo.
              </Text>
            )}
            <Totals value={query.data.totals} />
          </>
        )}
      </View>
      {query.data && query.data.monthly.length > 0 && (
        <MonthlyTravel rows={query.data.monthly} />
      )}
      {query.data && <EnvironmentPanel value={query.data.environmental} />}
      {query.data?.monthly.map((row) => (
        <View key={row.period} style={s.section}>
          <Text style={s.title}>
            {new Intl.DateTimeFormat('es-CO', {
              year: 'numeric',
              month: 'long',
              timeZone: 'UTC',
            }).format(new Date(row.period + '-01T00:00:00Z'))}
          </Text>
          <Totals value={row} />
        </View>
      ))}
    </ProtectedPage>
  );
}
