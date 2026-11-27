import { useState } from 'react';
import type { VehicleEnergyInput } from '@ruteam/contracts';
import { EnergyFields, VehicleEnergyEditor } from '../mobility/vehicle-energy';
import { useSession } from '../../providers/session-provider';
import { StyleSheet } from 'react-native';
import { Pressable, Text, View } from '../../theme/primitives';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DemoLicense,
  VehicleSummary,
  VehicleType,
} from '@ruteam/contracts';
import { api } from '../../services/api/client';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/forms/field';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import {
  TripColumns,
  TripSectionTitle,
  tripSurfaceStyles as ui,
} from './trip-surface';

interface VehicleFormValues {
  plate: string;
  type: VehicleType;
  passengerCapacity: string;
  brand: string;
  modelYear: string;
  color: string;
  soatExpiresAt: string;
}
interface LicenseFormValues {
  category: string;
  expiresAt: string;
}
const documentLabels = {
  DECLARED: 'Declarado · sin verificación oficial',
  VERIFIED: 'Verificado por fuente autorizada',
  EXPIRED: 'Vencido',
  UNVERIFIED: 'Sin verificación habilitante',
};
const licenseLabels = {
  CAR: 'Automóvil',
  MOTORCYCLE: 'Motocicleta',
  BOTH: 'Auto y moto',
} as const;
function SoatRenewal({ vehicle }: { vehicle: VehicleSummary }) {
  const client = useQueryClient();
  const form = useForm<{ soatExpiresAt: string }>({
    defaultValues: { soatExpiresAt: '' },
  });
  const save = useMutation({
    mutationFn: ({ soatExpiresAt }: { soatExpiresAt: string }) =>
      api<VehicleSummary>(`/vehicles/${vehicle.id}/soat`, {
        method: 'PATCH',
        body: { soatExpiresAt: `${soatExpiresAt}T23:59:59-05:00` },
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['vehicles'] });
      void client.invalidateQueries({ queryKey: ['me'] });
    },
  });
  return (
    <View style={[ui.subdued, styles.vehicle]} testID={`vehicle-${vehicle.id}`}>
      <View style={ui.row}>
        <Text role="heading" aria-level={3} style={ui.heading}>
          {vehicle.plate}
        </Text>
        <Text style={s.text}>{documentLabels[vehicle.verificationStatus]}</Text>
      </View>
      <Text style={s.text}>
        {vehicle.brand} · {vehicle.modelYear} · {vehicle.color} ·{' '}
        {vehicle.type === 'CAR' ? 'Automóvil' : 'Moto'} ·{' '}
        {vehicle.passengerCapacity}{' '}
        {vehicle.passengerCapacity === 1
          ? 'plaza de pasajero'
          : 'plazas de pasajeros'}
      </Text>
      <Text style={s.text}>
        {vehicle.soatExpiresAt
          ? `Vigencia declarada hasta ${new Date(vehicle.soatExpiresAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`
          : 'Sin vigencia SOAT declarada'}
      </Text>
      <Field
        control={form.control}
        name="soatExpiresAt"
        label={`Nueva vigencia SOAT ${vehicle.plate} (AAAA-MM-DD)`}
      />
      {save.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {save.error.message}
        </Text>
      )}
      {save.isSuccess && (
        <Text style={s.text} accessibilityLiveRegion="polite">
          Vigencia declarada actualizada; no es verificación oficial.
        </Text>
      )}
      <Button
        title={`Actualizar SOAT ${vehicle.plate}`}
        secondary
        disabled={save.isPending}
        onPress={() => {
          void form.handleSubmit((values) => save.mutate(values))();
        }}
      />
      <VehicleEnergyEditor vehicle={vehicle} />
    </View>
  );
}
export function VehiclesScreen() {
  const { user } = useSession();
  const client = useQueryClient();
  const [energy, setEnergy] = useState<VehicleEnergyInput>();
  const vehicles = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api<VehicleSummary[]>('/vehicles'),
    enabled: !!user?.capabilities.driverAccess,
  });
  const catalog = useQuery({
    queryKey: ['vehicle-catalog'],
    queryFn: () => api<{ colors: string[] }>('/vehicles/catalog'),
    enabled: !!user?.capabilities.driverAccess,
  });
  const license = useQuery({
    queryKey: ['license'],
    queryFn: () => api<DemoLicense | null>('/driver-eligibility'),
    enabled: !!user?.capabilities.driverAccess,
  });
  const form = useForm<VehicleFormValues>({
    defaultValues: {
      plate: '',
      type: 'CAR' as VehicleType,
      passengerCapacity: '3',
      brand: '',
      modelYear: '',
      color: 'GRIS',
      soatExpiresAt: '',
    },
  });
  const licenseForm = useForm<LicenseFormValues>({
    defaultValues: { category: 'CAR', expiresAt: '' },
  });
  const type = useWatch({ control: form.control, name: 'type' });
  const selectedColor = useWatch({ control: form.control, name: 'color' });
  const category = useWatch({ control: licenseForm.control, name: 'category' });
  const save = useMutation({
    mutationFn: (values: VehicleFormValues) =>
      api<VehicleSummary>('/vehicles', {
        method: 'POST',
        body: {
          ...values,
          energyProfile: energy && {
            ...energy,
            unit: energy.average === undefined ? undefined : energy.unit,
          },
          passengerCapacity: Number(values.passengerCapacity),
          modelYear: Number(values.modelYear),
          soatExpiresAt: `${values.soatExpiresAt}T23:59:59-05:00`,
        },
      }),
    onSuccess: () => {
      setEnergy(undefined);
      void client.invalidateQueries({ queryKey: ['vehicles'] });
      void client.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const saveLicense = useMutation({
    mutationFn: (values: LicenseFormValues) =>
      api<DemoLicense>('/driver-eligibility', {
        method: 'POST',
        body: { ...values, expiresAt: `${values.expiresAt}T23:59:59-05:00` },
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['license'] });
      void client.invalidateQueries({ queryKey: ['me'] });
    },
  });
  return (
    <ProtectedPage
      title="Vehículos y licencia"
      requires="driverAccess"
      allowOnboarding
    >
      <Text style={s.text}>
        Declara vehículos propios o con autorización de uso. Consulta el estado
        de verificación de la licencia y el SOAT en cada registro.
      </Text>
      <TripColumns
        main={
          <>
            <View style={ui.panel} testID="vehicle-list">
              <TripSectionTitle>Mis vehículos</TripSectionTitle>
              {vehicles.isPending && (
                <Text style={s.text}>Cargando vehículos…</Text>
              )}
              {vehicles.error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {vehicles.error.message}
                </Text>
              )}
              {vehicles.data?.length === 0 && (
                <Text style={s.text}>Aún no tienes vehículos.</Text>
              )}
              {vehicles.data?.map((vehicle) => (
                <SoatRenewal key={vehicle.id} vehicle={vehicle} />
              ))}
            </View>
            <View style={ui.panel} testID="vehicle-registration">
              <TripSectionTitle>Registrar vehículo</TripSectionTitle>
              <View style={ui.row}>
                {(['CAR', 'MOTORCYCLE'] as const).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={
                      value === 'CAR' ? 'Automóvil' : 'Motocicleta'
                    }
                    accessibilityState={{ checked: type === value }}
                    onPress={() => {
                      form.setValue('type', value);
                      form.setValue(
                        'passengerCapacity',
                        value === 'CAR' ? '3' : '1',
                      );
                    }}
                    style={[s.choice, type === value && s.selected]}
                  >
                    <Text>{value === 'CAR' ? 'Automóvil' : 'Motocicleta'}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Field control={form.control} name="plate" label="Placa" />
                </View>
                <View style={styles.formField}>
                  <Field control={form.control} name="brand" label="Marca" />
                </View>
                <View style={styles.formField}>
                  <Field
                    control={form.control}
                    name="modelYear"
                    label="Año del modelo"
                  />
                </View>
                <View style={styles.formField}>
                  <Field
                    control={form.control}
                    name="passengerCapacity"
                    label="Plazas de pasajeros (sin conductor)"
                  />
                </View>
              </View>
              <Text style={[s.text, ui.emphasized]}>Color</Text>
              {catalog.isPending && (
                <Text style={s.text}>Cargando colores…</Text>
              )}
              {catalog.error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {catalog.error.message}
                </Text>
              )}
              <View style={ui.row}>
                {catalog.data?.colors.map((color) => (
                  <Pressable
                    key={color}
                    accessibilityRole="radio"
                    accessibilityLabel={`Color ${color}`}
                    accessibilityState={{ checked: selectedColor === color }}
                    onPress={() => form.setValue('color', color)}
                    style={[s.choice, selectedColor === color && s.selected]}
                  >
                    <Text>{color}</Text>
                  </Pressable>
                ))}
              </View>
              <Field
                control={form.control}
                name="soatExpiresAt"
                label="Vencimiento SOAT (AAAA-MM-DD)"
              />
              {energy ? (
                <>
                  <EnergyFields value={energy} change={setEnergy} />
                  <Button
                    secondary
                    title="Continuar sin declarar energía"
                    onPress={() => setEnergy(undefined)}
                  />
                </>
              ) : (
                <Button
                  secondary
                  title="Añadir datos energéticos (opcional)"
                  onPress={() =>
                    setEnergy({ propulsion: 'COMBUSTION', source: 'OTHER' })
                  }
                />
              )}
              {save.error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {save.error.message}
                </Text>
              )}
              {save.isSuccess && (
                <Text style={s.text} accessibilityLiveRegion="polite">
                  Vehículo registrado con información declarada; no es
                  verificación oficial.
                </Text>
              )}
              <Button
                title={save.isPending ? 'Registrando…' : 'Registrar vehículo'}
                disabled={
                  save.isPending ||
                  (energy?.average !== undefined &&
                    (!Number.isFinite(energy.average) ||
                      energy.average < 0.01 ||
                      energy.average > 300))
                }
                onPress={() => {
                  void form.handleSubmit((values) => save.mutate(values))();
                }}
              />
            </View>
          </>
        }
        side={
          <View style={ui.panel} testID="vehicle-license">
            <TripSectionTitle>Licencia de conducción</TripSectionTitle>
            {license.isPending && (
              <Text style={s.text}>Cargando licencia…</Text>
            )}
            {license.error && (
              <Text accessibilityRole="alert" style={s.error}>
                {license.error.message}
              </Text>
            )}
            {license.isSuccess && (
              <View style={ui.subdued}>
                <Text style={s.text}>
                  {license.data
                    ? `${licenseLabels[license.data.category]} · ${documentLabels[license.data.verificationStatus]} · vence ${new Date(license.data.expiresAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`
                    : 'Sin licencia registrada.'}
                </Text>
              </View>
            )}
            <View style={ui.row}>
              {(['CAR', 'MOTORCYCLE', 'BOTH'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={`Licencia ${licenseLabels[value]}`}
                  accessibilityState={{ checked: category === value }}
                  onPress={() => licenseForm.setValue('category', value)}
                  style={[s.choice, category === value && s.selected]}
                >
                  <Text>
                    {value === 'BOTH'
                      ? 'Auto y moto (alcance declarado)'
                      : value === 'CAR'
                        ? 'Automóvil'
                        : 'Moto'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field
              control={licenseForm.control}
              name="expiresAt"
              label="Vencimiento licencia (AAAA-MM-DD)"
            />
            {saveLicense.error && (
              <Text accessibilityRole="alert" style={s.error}>
                {saveLicense.error.message}
              </Text>
            )}
            {saveLicense.isSuccess && (
              <Text style={s.text} accessibilityLiveRegion="polite">
                Licencia declarada guardada; no es verificación oficial.
              </Text>
            )}
            <Button
              title="Guardar licencia declarada"
              disabled={saveLicense.isPending}
              onPress={() => {
                void licenseForm.handleSubmit((values) =>
                  saveLicense.mutate(values),
                )();
              }}
            />
          </View>
        }
      />
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  vehicle: { gap: 10 },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 10,
  },
  formField: { flexBasis: '45%', flexGrow: 1, flexShrink: 1, minWidth: 158 },
});
