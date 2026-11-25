import { Pressable, Text, View } from 'react-native';
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
    <View style={s.section}>
      <Text style={s.text}>
        {vehicle.plate} · {vehicle.type === 'CAR' ? 'Automóvil' : 'Moto'} ·{' '}
        {vehicle.passengerCapacity} plazas de pasajeros ·{' '}
        {documentLabels[vehicle.verificationStatus]}
      </Text>
      <Text style={s.text}>
        {vehicle.soatExpiresAt
          ? `Vigencia declarada hasta ${new Date(vehicle.soatExpiresAt).toLocaleDateString('es-CO')}`
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
        <Text>Vigencia declarada actualizada; no es verificación oficial.</Text>
      )}
      <Button
        title={`Actualizar SOAT ${vehicle.plate}`}
        disabled={save.isPending}
        onPress={() => {
          void form.handleSubmit((values) => save.mutate(values))();
        }}
      />
    </View>
  );
}
export function VehiclesScreen() {
  const client = useQueryClient();
  const vehicles = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api<VehicleSummary[]>('/vehicles'),
  });
  const catalog = useQuery({
    queryKey: ['vehicle-catalog'],
    queryFn: () => api<{ colors: string[] }>('/vehicles/catalog'),
  });
  const license = useQuery({
    queryKey: ['license'],
    queryFn: () => api<DemoLicense | null>('/driver-eligibility'),
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
          passengerCapacity: Number(values.passengerCapacity),
          modelYear: Number(values.modelYear),
          soatExpiresAt: `${values.soatExpiresAt}T23:59:59-05:00`,
        },
      }),
    onSuccess: () => {
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
    <ProtectedPage title="Vehículos y licencia">
      <Text style={s.text}>
        Declara únicamente vehículos propios o con autorización de uso. La
        vigencia declarada no acredita verificación oficial de licencia o SOAT.
        Las pruebas de desarrollo sólo habilitan documentos sintéticos; la
        verificación autorizada sigue pendiente.
      </Text>
      <View style={s.section}>
        <Text role="heading" aria-level={2} style={s.title}>
          Mis vehículos
        </Text>
        {vehicles.isPending && <Text>Cargando vehículos…</Text>}
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
      <View style={s.section}>
        <Text role="heading" aria-level={2} style={s.title}>
          Registrar vehículo
        </Text>
        {(['CAR', 'MOTORCYCLE'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={value === 'CAR' ? 'Automóvil' : 'Motocicleta'}
            accessibilityState={{ checked: type === value }}
            onPress={() => {
              form.setValue('type', value);
              form.setValue('passengerCapacity', value === 'CAR' ? '3' : '1');
            }}
            style={[s.choice, type === value && s.selected]}
          >
            <Text>{value === 'CAR' ? 'Automóvil' : 'Motocicleta'}</Text>
          </Pressable>
        ))}
        <Field control={form.control} name="plate" label="Placa" />
        <Field control={form.control} name="brand" label="Marca" />
        <Field control={form.control} name="modelYear" label="Año del modelo" />
        <Field
          control={form.control}
          name="passengerCapacity"
          label="Plazas de pasajeros (sin conductor)"
        />
        <Text style={s.text}>Color</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
        {save.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {save.error.message}
          </Text>
        )}
        {save.isSuccess && (
          <Text accessibilityLiveRegion="polite">
            Vehículo registrado con información declarada; no es verificación
            oficial.
          </Text>
        )}
        <Button
          title={save.isPending ? 'Registrando…' : 'Registrar vehículo'}
          disabled={save.isPending}
          onPress={() => {
            void form.handleSubmit((values) => save.mutate(values))();
          }}
        />
      </View>
      <View style={s.section}>
        <Text role="heading" aria-level={2} style={s.title}>
          Licencia de conducción
        </Text>
        {license.isPending && <Text>Cargando licencia…</Text>}
        {license.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {license.error.message}
          </Text>
        )}
        <Text style={s.text}>
          {license.data
            ? `${license.data.category} · ${documentLabels[license.data.verificationStatus]} · vence ${new Date(license.data.expiresAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`
            : 'Sin licencia registrada.'}
        </Text>
        {['CAR', 'MOTORCYCLE', 'BOTH'].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={`Licencia ${value}`}
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
          <Text>Licencia declarada guardada; no es verificación oficial.</Text>
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
    </ProtectedPage>
  );
}
