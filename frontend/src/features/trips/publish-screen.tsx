import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CampusDestination,
  VehicleSummary,
  TripSummary,
  TripRule,
} from '@ruteam/contracts';
import { api } from '../../services/api/client';
import { Field } from '../../components/forms/field';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
interface PublishFormValues {
  originLabel: string;
  originLatitude: string;
  originLongitude: string;
  departureAt: string;
  estimatedDurationMinutes: string;
  offeredSeats: string;
  stops: { label: string; latitude: string; longitude: string }[];
}
function coordinate(value: string): number {
  if (!value.trim() || !Number.isFinite(Number(value)))
    throw new Error('Completa todas las coordenadas DEMO con números válidos.');
  return Number(value);
}
export function PublishScreen() {
  const client = useQueryClient();
  const [vehicleId, setVehicleId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [ruleIds, setRuleIds] = useState<string[]>([]);
  const [helmet, setHelmet] = useState(false);
  const vehicles = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api<VehicleSummary[]>('/vehicles'),
  });
  const destinations = useQuery({
    queryKey: ['destinations'],
    queryFn: () => api<CampusDestination[]>('/campus/destinations'),
  });
  const rules = useQuery({
    queryKey: ['trip-rules'],
    queryFn: () => api<TripRule[]>('/trip-rules'),
  });
  const selected =
    vehicles.data?.find((item) => item.id === vehicleId) ?? vehicles.data?.[0];
  const destination =
    destinations.data?.find((item) => item.id === destinationId) ??
    destinations.data?.[0];
  const [tomorrow] = useState(() =>
    new Date(Date.now() + 86400000 - 5 * 3600000)
      .toISOString()
      .slice(0, 16)
      .replace('T', ' '),
  );
  const form = useForm<PublishFormValues>({
    defaultValues: {
      originLabel: 'Origen DEMO',
      originLatitude: '3.43',
      originLongitude: '-76.52',
      departureAt: tomorrow,
      estimatedDurationMinutes: '45',
      offeredSeats: '1',
      stops: [
        { label: 'Recogida DEMO', latitude: '3.42', longitude: '-76.53' },
      ],
    },
  });
  const stops = useFieldArray({ control: form.control, name: 'stops' });
  const save = useMutation({
    mutationFn: (values: PublishFormValues) =>
      api<TripSummary>('/trips', {
        method: 'POST',
        body: {
          vehicleId: selected?.id,
          destinationId: destination?.id,
          origin: {
            label: values.originLabel,
            latitude: coordinate(values.originLatitude),
            longitude: coordinate(values.originLongitude),
          },
          departureAt: `${values.departureAt.replace(' ', 'T')}:00-05:00`,
          estimatedDurationMinutes: Number(values.estimatedDurationMinutes),
          offeredSeats: Number(values.offeredSeats),
          ruleIds,
          stops: values.stops.map((stop, index) => ({
            position: index + 1,
            label: stop.label,
            latitude: coordinate(stop.latitude),
            longitude: coordinate(stop.longitude),
          })),
          ...(selected?.type === 'MOTORCYCLE'
            ? { providesHelmet: helmet }
            : {}),
        },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['my-trips'] }),
  });
  return (
    <ProtectedPage title="Publicar viaje hacia USC">
      <Text style={s.text}>
        Ubicaciones y duración DEMO. No representan ruta, GPS ni ETA por
        carretera. La salida requiere más de 30 minutos de anticipación.
      </Text>
      <Link href="/vehicles" style={s.link}>
        Gestionar vehículos y licencia
      </Link>
      {[vehicles, destinations, rules].some((query) => query.isPending) && (
        <Text>Cargando catálogos…</Text>
      )}
      {[vehicles, destinations, rules]
        .filter((query) => query.error)
        .map((query, index) => (
          <Text key={index} accessibilityRole="alert" style={s.error}>
            {query.error?.message}
          </Text>
        ))}
      <View style={s.section}>
        <Text style={s.title}>Vehículo propio</Text>
        {vehicles.data?.length === 0 && (
          <Text>Registra primero un vehículo y solicita revisión.</Text>
        )}
        {vehicles.data?.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityLabel={`Vehículo ${item.plate}`}
            accessibilityState={{ checked: selected?.id === item.id }}
            onPress={() => setVehicleId(item.id)}
            style={[s.choice, selected?.id === item.id && s.selected]}
          >
            <Text>
              {item.plate} · {item.passengerCapacity} pasajeros ·{' '}
              {item.reviewStatus} · DEMO
            </Text>
          </Pressable>
        ))}
        {selected?.type === 'MOTORCYCLE' && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: helmet }}
            onPress={() => setHelmet(!helmet)}
            style={s.choice}
          >
            <Text>{helmet ? '☑' : '☐'} Casco de pasajero incluido DEMO</Text>
          </Pressable>
        )}
      </View>
      <View style={s.section}>
        <Text style={s.title}>Destino USC</Text>
        {destinations.data?.length === 0 && (
          <Text>No hay destinos USC habilitados.</Text>
        )}
        {destinations.data?.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityLabel={`Destino ${item.name}`}
            accessibilityState={{ checked: destination?.id === item.id }}
            onPress={() => setDestinationId(item.id)}
            style={[s.choice, destination?.id === item.id && s.selected]}
          >
            <Text>{item.name} · DEMO</Text>
          </Pressable>
        ))}
      </View>
      <Field
        control={form.control}
        name="originLabel"
        label="Nombre del origen DEMO"
      />
      <Field
        control={form.control}
        name="originLatitude"
        label="Latitud del origen DEMO"
      />
      <Field
        control={form.control}
        name="originLongitude"
        label="Longitud del origen DEMO"
      />
      <Field
        control={form.control}
        name="departureAt"
        label="Salida Colombia (AAAA-MM-DD HH:mm)"
      />
      <Field
        control={form.control}
        name="estimatedDurationMinutes"
        label="Duración simulada (minutos)"
      />
      <Field
        control={form.control}
        name="offeredSeats"
        label="Cupos ofrecidos"
      />
      <View style={s.section}>
        <Text style={s.title}>Recogidas ordenadas</Text>
        {stops.fields.map((stop, index) => (
          <View key={stop.id} style={s.section}>
            <Field
              control={form.control}
              name={`stops.${index}.label`}
              label={`Nombre de recogida ${index + 1}`}
            />
            <Field
              control={form.control}
              name={`stops.${index}.latitude`}
              label={`Latitud de recogida ${index + 1}`}
            />
            <Field
              control={form.control}
              name={`stops.${index}.longitude`}
              label={`Longitud de recogida ${index + 1}`}
            />
            <Button
              title={`Quitar recogida ${index + 1}`}
              secondary
              onPress={() => stops.remove(index)}
            />
          </View>
        ))}
        <Button
          title="Añadir recogida"
          disabled={stops.fields.length >= 10}
          secondary
          onPress={() =>
            stops.append({
              label: 'Recogida DEMO',
              latitude: '3.41',
              longitude: '-76.54',
            })
          }
        />
      </View>
      <View style={s.section}>
        <Text style={s.title}>Reglas de convivencia</Text>
        {rules.data
          ?.filter((rule) => rule.code !== 'DEFAULT')
          .map((rule) => (
            <Pressable
              key={rule.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ruleIds.includes(rule.id) }}
              onPress={() =>
                setRuleIds((ids) =>
                  ids.includes(rule.id)
                    ? ids.filter((id) => id !== rule.id)
                    : [...ids, rule.id],
                )
              }
              style={s.choice}
            >
              <Text>
                {ruleIds.includes(rule.id) ? '☑' : '☐'} {rule.description}
              </Text>
            </Pressable>
          ))}
        <Text style={s.text}>
          Sin selección se aplica el acuerdo general del catálogo.
        </Text>
      </View>
      {save.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {save.error.message}
        </Text>
      )}
      {save.isSuccess && (
        <Text accessibilityLiveRegion="polite">
          Viaje publicado en PostgreSQL: PROGRAMADO · DISPONIBLE.
        </Text>
      )}
      <Button
        title={save.isPending ? 'Publicando…' : 'Publicar viaje DEMO'}
        disabled={save.isPending || !selected || !destination || !rules.data}
        onPress={() => {
          void form.handleSubmit((values) => save.mutate(values))();
        }}
      />
      <Link href="/my-trips" style={s.link}>
        Ver mis viajes publicados
      </Link>
    </ProtectedPage>
  );
}
