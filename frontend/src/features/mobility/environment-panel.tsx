import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EnvironmentalMissing,
  EnvironmentalTrip,
  MobilityStatistics,
  EmissionScope,
  AlternativeMode,
  VehicleEnergyInput,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Choice } from '../trips/itinerary-form';
import { EnergyFields } from './vehicle-energy';

const scopeLabel: Record<EmissionScope, string> = {
  DIRECT_FUEL_CO2: 'Combustible · kg de CO₂',
  INDIRECT_GRID_CO2E: 'Electricidad · kg de CO₂e',
};
const missingLabel: Record<EnvironmentalMissing, string> = {
  VEHICLE_ENERGY: 'Falta el consumo del vehículo',
  ROUTE_DISTANCE: 'Falta la distancia del recorrido',
  FACTOR: 'Falta un factor compatible con la fuente',
  SEGMENT_DISTANCE: 'Falta distancia para repartir por tramo',
  NO_SNAPSHOT: 'Viaje anterior al registro ambiental',
};
const modes: Record<AlternativeMode, string> = {
  CAR: 'Automóvil',
  MOTORCYCLE: 'Motocicleta',
  PUBLIC_TRANSIT: 'Transporte público',
  WALK: 'Caminata',
  CYCLE: 'Bicicleta',
  OTHER: 'Otro',
  UNSPECIFIED: 'Sin especificar',
};
const formatted = (kg: number) =>
  kg.toLocaleString('es-CO', { maximumFractionDigits: 3 });
const roleLabel = {
  DRIVER: 'Como conductor',
  PASSENGER: 'Como pasajero',
} as const;

export function EnvironmentPanel({
  value,
}: {
  value: MobilityStatistics['environmental'];
}) {
  const grouped = value.totals.filter(({ period }) => period === null);
  const monthly = value.totals.filter(({ period }) => period !== null);
  return (
    <View style={s.section}>
      <Text style={s.title}>Estimaciones ambientales</Text>
      {value.status === 'NO_DATA' && (
        <Text style={s.text}>
          Aún no hay estimaciones con datos suficientes en este periodo.
        </Text>
      )}
      {grouped.map((item) => (
        <View key={item.role + item.scope}>
          <Text style={s.text}>
            {roleLabel[item.role]} · {scopeLabel[item.scope]} · {item.trips}{' '}
            viajes
          </Text>
          {item.vehicleKg !== null && (
            <Text style={s.text}>
              Emitido por el vehículo · {formatted(item.vehicleKg)}
            </Text>
          )}
          {item.attributedKg !== null && (
            <Text style={s.text}>
              Parte atribuida a ti · {formatted(item.attributedKg)}
            </Text>
          )}
        </View>
      ))}
      {Object.entries(value.missing).map(([key, count]) => (
        <Text key={key} style={s.text}>
          {missingLabel[key as EnvironmentalMissing]} · {count} viajes
        </Text>
      ))}
      {monthly.map((item) => {
        const metric = item.attributedKg ?? item.vehicleKg;
        const maximum = Math.max(
          ...monthly
            .filter(
              ({ role, scope }) => role === item.role && scope === item.scope,
            )
            .map(
              ({ attributedKg, vehicleKg }) => attributedKg ?? vehicleKg ?? 0,
            ),
        );
        return (
          <View key={item.period! + item.role + item.scope} style={{ gap: 5 }}>
            <Text style={s.text}>
              {item.period} · {roleLabel[item.role]} · {scopeLabel[item.scope]}{' '}
              · {metric === null ? 'Sin dato' : formatted(metric)}{' '}
              {item.attributedKg === null ? '(vehículo)' : '(atribuido)'}
            </Text>
            {metric !== null && maximum > 0 && (
              <View
                style={{
                  backgroundColor: '#28734c',
                  height: 7,
                  width: ((metric / maximum) * 100 + '%') as `${number}%`,
                }}
              />
            )}
          </View>
        );
      })}
      <Text style={s.text}>
        El consumo declarado y la distancia publicada estiman la operación. El
        reparto incluye al conductor y combina abordajes registrados con el
        punto de descenso del itinerario. Las unidades de combustible y
        electricidad se muestran por separado.
      </Text>
      <Link
        href="https://app.upme.gov.co/Calculadora_Emisiones1/new/Informe_Final_FECOC_Correcciones_UPME_FunNatura.pdf#page=31"
        style={s.link}
      >
        Factores colombianos FECOC
      </Link>
      <Link
        href="https://docs.upme.gov.co/Normatividad/0085_2026.pdf#page=3"
        style={s.link}
      >
        Factor eléctrico SIN 2024
      </Link>
    </View>
  );
}

export function TripEnvironment({ tripId }: { tripId: string }) {
  const { user } = useSession();
  const client = useQueryClient();
  const queryKey = ['trip-environment', user?.id, tripId];
  const path = '/mobility/environment/trips/' + tripId;
  const query = useQuery({
    queryKey,
    queryFn: () => api<EnvironmentalTrip>(path),
    enabled: !!user,
  });
  const row = query.data;
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<AlternativeMode>();
  const [energy, setEnergy] = useState<VehicleEnergyInput>({
    propulsion: 'COMBUSTION',
    source: 'OTHER',
  });
  const save = useMutation({
    mutationFn: () =>
      api<EnvironmentalTrip>(path + '/alternative', {
        method: 'PUT',
        body: {
          mode,
          energy:
            (mode === 'CAR' || mode === 'MOTORCYCLE') &&
            energy.average !== undefined
              ? energy
              : undefined,
        },
      }),
    onSuccess: (value) => {
      client.setQueryData(queryKey, value);
      setEditing(false);
    },
  });
  if (!row)
    return query.error ? (
      <Text style={s.text}>{query.error.message}</Text>
    ) : (
      <Text style={s.text}>Consultando impacto ambiental…</Text>
    );
  const difference = row.alternative?.differenceKg;
  return (
    <View style={s.section}>
      <Text style={s.title}>Impacto ambiental del viaje</Text>
      {row.distanceMeters !== null && (
        <Text style={s.text}>
          Distancia estimada de tu recorrido ·{' '}
          {formatted(row.distanceMeters / 1000)} km
        </Text>
      )}
      {row.dropoffBasis && (
        <Text style={s.text}>
          {row.dropoffBasis === 'CONFIRMED_STOP'
            ? 'Tramo hasta el descenso confirmado'
            : 'Tramo estimado hasta el descenso previsto'}
        </Text>
      )}
      {row.missing && <Text style={s.text}>{missingLabel[row.missing]}</Text>}
      {row.factor && (
        <>
          <Text style={s.text}>{scopeLabel[row.factor.scope]}</Text>
          {row.vehicleKg !== null && (
            <Text style={s.text}>Vehículo · {formatted(row.vehicleKg)}</Text>
          )}
          {row.attributedKg !== null && (
            <Text style={s.text}>
              Parte atribuida a ti · {formatted(row.attributedKg)}
            </Text>
          )}
          <Link
            href={row.factor.reference as `https://${string}`}
            style={s.link}
          >
            {row.factor.version}
          </Link>
        </>
      )}
      {row.alternative && (
        <Text style={s.text}>
          Alternativa declarada · {modes[row.alternative.mode]} ·{' '}
          {difference == null
            ? 'Estimación no disponible'
            : difference < 0
              ? 'El viaje tiene ' +
                formatted(-difference) +
                ' kg más de emisiones atribuidas'
              : formatted(difference) + ' kg potencialmente evitados'}
          . Escenario estimado para tu tramo.
        </Text>
      )}
      {row.canDeclareAlternative &&
        (editing ? (
          <>
            <Text style={s.text}>
              ¿Cómo habrías hecho este trayecto por tu cuenta?
            </Text>
            {(Object.keys(modes) as AlternativeMode[]).map((key) => (
              <Choice
                key={key}
                label={modes[key]}
                checked={mode === key}
                onPress={() => setMode(key)}
              />
            ))}
            {(mode === 'CAR' || mode === 'MOTORCYCLE') && (
              <EnergyFields value={energy} change={setEnergy} />
            )}
            <Button
              title="Guardar alternativa"
              disabled={!mode || save.isPending}
              onPress={() => save.mutate()}
            />
            <Button
              title="Volver sin guardar"
              secondary
              onPress={() => setEditing(false)}
            />
          </>
        ) : (
          <Button
            secondary
            title="Indicar alternativa de movilidad"
            onPress={() => {
              setMode(row.alternative?.mode);
              setEditing(true);
            }}
          />
        ))}
      {save.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {save.error.message}
        </Text>
      )}
    </View>
  );
}
