import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ConsumptionUnit,
  EnergySource,
  PropulsionType,
  VehicleEnergyInput,
  VehicleSummary,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { api } from '../../services/api/client';
import { Choice } from '../trips/itinerary-form';

export const sourceLabel: Record<EnergySource, string> = {
  GASOLINE: 'Gasolina motor sin mezcla',
  GASOLINE_E10: 'Gasolina E10',
  DIESEL: 'Diésel de referencia FECOC',
  COLOMBIAN_GRID: 'Electricidad de la red colombiana',
  OTHER: 'Otra o por confirmar',
};
const propulsionLabel: Record<PropulsionType, string> = {
  COMBUSTION: 'Combustión',
  HYBRID: 'Híbrido · componente de combustible',
  ELECTRIC: 'Eléctrico',
  OTHER: 'Otra',
};
const units: Record<ConsumptionUnit, string> = {
  KM_PER_L: 'km/L',
  L_PER_100_KM: 'L/100 km',
  KWH_PER_100_KM: 'kWh/100 km',
};

export function EnergyFields({
  value,
  change,
}: {
  value: VehicleEnergyInput;
  change: (value: VehicleEnergyInput) => void;
}) {
  const [average, setAverage] = useState(value.average?.toString() ?? '');
  const electric = value.propulsion === 'ELECTRIC';
  const unit = value.unit ?? (electric ? 'KWH_PER_100_KM' : 'L_PER_100_KM');
  return (
    <View style={{ gap: 6 }}>
      {(Object.keys(propulsionLabel) as PropulsionType[]).map((key) => (
        <Choice
          key={key}
          label={propulsionLabel[key]}
          checked={value.propulsion === key}
          onPress={() => {
            setAverage('');
            change({
              propulsion: key,
              source: 'OTHER',
            });
          }}
        />
      ))}
      {(Object.keys(sourceLabel) as EnergySource[])
        .filter(
          (key) => key === 'OTHER' || (key === 'COLOMBIAN_GRID') === electric,
        )
        .map((key) => (
          <Choice
            key={key}
            label={sourceLabel[key]}
            checked={value.source === key}
            onPress={() => change({ ...value, source: key })}
          />
        ))}
      <Text style={s.text}>Consumo promedio (opcional)</Text>
      <TextInput
        accessibilityLabel="Consumo promedio"
        inputMode="decimal"
        value={average}
        style={s.choice}
        onChangeText={(next) => {
          setAverage(next);
          change({
            ...value,
            average: next.trim() ? Number(next.replace(',', '.')) : undefined,
            unit: next.trim() ? unit : undefined,
          });
        }}
      />
      {(Object.keys(units) as ConsumptionUnit[])
        .filter((key) => (key === 'KWH_PER_100_KM') === electric)
        .map((key) => (
          <Choice
            key={key}
            label={units[key]}
            checked={unit === key}
            onPress={() => change({ ...value, unit: key })}
          />
        ))}
    </View>
  );
}

export function VehicleEnergyEditor({ vehicle }: { vehicle: VehicleSummary }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<VehicleEnergyInput>(
    vehicle.energyProfile
      ? {
          propulsion: vehicle.energyProfile.propulsion,
          source: vehicle.energyProfile.source,
          average: vehicle.energyProfile.average,
          unit: vehicle.energyProfile.unit,
        }
      : { propulsion: 'COMBUSTION', source: 'OTHER' },
  );
  const save = useMutation({
    mutationFn: (value: VehicleEnergyInput | null) =>
      api<VehicleSummary>('/vehicles/' + vehicle.id + '/energy', {
        method: 'PUT',
        body: {
          profile: value && {
            ...value,
            unit: value.average === undefined ? undefined : value.unit,
          },
        },
      }),
    onSuccess: async () => {
      setEditing(false);
      await client.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.text}>
        {vehicle.energyProfile
          ? 'Energía declarada · ' + sourceLabel[vehicle.energyProfile.source]
          : 'Energía sin declarar'}
      </Text>
      {editing ? (
        <>
          <Text style={s.text}>Se aplicará a las nuevas publicaciones.</Text>
          <EnergyFields value={profile} change={setProfile} />
          <Button
            title="Guardar datos energéticos"
            onPress={() => save.mutate(profile)}
            disabled={
              save.isPending ||
              (profile.average !== undefined &&
                (!Number.isFinite(profile.average) ||
                  profile.average < 0.01 ||
                  profile.average > 300))
            }
          />
          {vehicle.energyProfile && (
            <Button
              secondary
              title="Quitar declaración energética"
              onPress={() => save.mutate(null)}
              disabled={save.isPending}
            />
          )}
          <Button
            secondary
            title="Volver sin guardar"
            onPress={() => setEditing(false)}
          />
        </>
      ) : (
        <Button
          secondary
          title={'Datos energéticos · ' + vehicle.plate}
          onPress={() => setEditing(true)}
        />
      )}
      {save.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {save.error.message}
        </Text>
      )}
    </View>
  );
}
