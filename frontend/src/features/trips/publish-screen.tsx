import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CampusMeetingPoint,
  MeetingPointInput,
  PublishTripInput,
  RouteOption,
  RouteOptionsInput,
  StopAccess,
  TripPoint,
  TripRule,
  TripSummary,
  VehicleSummary,
} from '@ruteam/contracts';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Field } from '../../components/forms/field';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import {
  Choice,
  emptyPoint,
  PointEditor,
  pointInput,
  StopAccessEditor,
  type PublishFormValues,
} from './itinerary-form';
import { RoutePreview } from './route-preview';

type Draft = PublishTripInput;
const emptyCatalog: CampusMeetingPoint[] = [];
function previewPoint(
  point: MeetingPointInput,
  catalog: CampusMeetingPoint[],
): TripPoint & { instructions?: string } {
  if (!('campusPointId' in point)) return point;
  const entry = catalog.find(({ id }) => id === point.campusPointId);
  if (!entry || entry.latitude === null || entry.longitude === null)
    throw new Error('Elige un punto del catálogo con coordenadas.');
  return {
    label: point.label || entry.name,
    latitude: entry.latitude,
    longitude: entry.longitude,
    instructions: [entry.description, entry.accessReference, point.instructions]
      .filter(Boolean)
      .join(' · '),
  };
}

function routePoints(values: PublishFormValues): RouteOptionsInput {
  return {
    direction: values.direction,
    origin: pointInput(values.origin, values.direction === 'DESDE_USC'),
    destination: pointInput(
      values.destination,
      values.direction === 'HACIA_USC',
    ),
    stops: values.stops.map((stop) => ({
      ...pointInput(stop),
      access:
        values.direction === 'DESDE_USC' && stop.access !== 'WAYPOINT'
          ? 'DROPOFF'
          : stop.access,
    })),
    publicMeetingPoints: true,
  };
}

export function PublishScreen() {
  const { user } = useSession();
  const client = useQueryClient();
  const [selectedRoute, setSelectedRoute] = useState<{
    key: string;
    option: RouteOption;
  }>();
  const [vehicleId, setVehicleId] = useState('');
  const [ruleIds, setRuleIds] = useState<string[]>([]);
  const [helmet, setHelmet] = useState(false);
  const [preview, setPreview] = useState<{
    draft: Draft;
    stops: (ReturnType<typeof previewPoint> & { access: StopAccess })[];
  }>();
  const [confirmedPublic, setConfirmedPublic] = useState(false);
  const [routingConsent, setRoutingConsent] = useState(false);
  const [inputError, setInputError] = useState('');
  const [tomorrow] = useState(() =>
    new Date(Date.now() + 86400000 - 5 * 3600000)
      .toISOString()
      .slice(0, 16)
      .replace('T', ' '),
  );
  const vehicles = useQuery({
    queryKey: ['vehicles', user?.id],
    queryFn: () => api<VehicleSummary[]>('/vehicles'),
    enabled: !!user?.capabilities.driver,
  });
  const points = useQuery({
    queryKey: ['meeting-points'],
    queryFn: () => api<CampusMeetingPoint[]>('/campus/meeting-points'),
    enabled: !!user?.capabilities.driver,
  });
  const rules = useQuery({
    queryKey: ['trip-rules'],
    queryFn: () => api<TripRule[]>('/trip-rules'),
    enabled: !!user?.capabilities.driver,
  });
  const catalog = points.data ?? emptyCatalog;
  const selected =
    vehicles.data?.find((item) => item.id === vehicleId) ??
    vehicles.data?.find((item) => item.eligibleNow);
  const form = useForm<PublishFormValues>({
    defaultValues: {
      origin: emptyPoint,
      destination: emptyPoint,
      stops: [],
      departureAt: tomorrow,
      estimatedDurationMinutes: '45',
      offeredSeats: '1',
      description: '',
      direction: 'DESDE_USC',
    },
  });
  const direction = useWatch({ control: form.control, name: 'direction' });
  const stops = useFieldArray({ control: form.control, name: 'stops' });
  const save = useMutation({
    mutationFn: (body: Draft) =>
      api<TripSummary>('/trips', { method: 'POST', body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['my-trips'] });
      void client.invalidateQueries({ queryKey: ['available-trips'] });
      void client.invalidateQueries({ queryKey: ['trip-feed'] });
    },
  });
  const options = useMutation({
    mutationFn: (body: RouteOptionsInput) =>
      api<RouteOption[]>('/trips/route-options', { method: 'POST', body }),
  });
  const suggest = form.handleSubmit((values) => {
    if (!routingConsent) return;
    setInputError('');
    options.reset();
    try {
      options.mutate(routePoints(values));
      setRoutingConsent(false);
    } catch (error) {
      setInputError(
        error instanceof Error ? error.message : 'Revisa los puntos del viaje.',
      );
    }
  });
  function chooseOption(option: RouteOption) {
    setInputError('');
    try {
      if (
        JSON.stringify(routePoints(form.getValues())) !==
        JSON.stringify(options.variables)
      )
        throw new Error(
          'Los puntos cambiaron. Consulta las alternativas para el nuevo recorrido.',
        );
      setSelectedRoute({ key: JSON.stringify(options.variables), option });
      if (option.durationMinutes >= 5 && option.durationMinutes <= 360)
        form.setValue(
          'estimatedDurationMinutes',
          String(option.durationMinutes),
        );
      options.reset();
    } catch (error) {
      setInputError(
        error instanceof Error ? error.message : 'Revisa la alternativa.',
      );
    }
  }

  const review = form.handleSubmit((values) => {
    if (!selected) return;
    setInputError('');
    save.reset();
    try {
      const route = routePoints(values);
      const chosen =
        selectedRoute?.key === JSON.stringify(route)
          ? selectedRoute.option
          : undefined;
      const previewStops = [
        { ...previewPoint(route.origin, catalog), access: 'PICKUP' as const },
        ...route.stops.map((point) => ({
          ...previewPoint(point, catalog),
          access: point.access,
        })),
        {
          ...previewPoint(route.destination, catalog),
          access: 'DROPOFF' as const,
        },
      ];
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(values.departureAt))
        throw new Error('Indica la salida como AAAA-MM-DD HH:mm.');
      if (values.description.trim().length < 2)
        throw new Error('Describe las vías o referencias del recorrido.');
      setConfirmedPublic(false);
      setPreview({
        stops: previewStops,
        draft: {
          vehicleId: selected.id,
          departureAt: `${values.departureAt.replace(' ', 'T')}:00-05:00`,
          offeredSeats: Number(values.offeredSeats),
          estimatedDurationMinutes: chosen?.routingSelection
            ? chosen.durationMinutes
            : Number(values.estimatedDurationMinutes),
          ruleIds,
          ...(selected.type === 'MOTORCYCLE' && { providesHelmet: helmet }),
          itinerary: {
            ...route,
            description: values.description.trim(),
            geometry: chosen?.geometry,
            routingSelection: chosen?.routingSelection,
          },
        },
      });
    } catch (error) {
      setInputError(
        error instanceof Error ? error.message : 'Revisa los datos del viaje.',
      );
    }
  });
  const draft = preview?.draft;
  return (
    <ProtectedPage title="Publicar viaje" requires="driver">
      <Link href="/vehicles" style={s.link}>
        Gestionar vehículos y licencia
      </Link>
      {[vehicles, points, rules].some((query) => query.isPending) && (
        <Text>Cargando catálogos…</Text>
      )}
      {[vehicles, points, rules].map(
        (query, index) =>
          query.error && (
            <Text key={index} accessibilityRole="alert" style={s.error}>
              {query.error.message}
            </Text>
          ),
      )}
      {draft && preview ? (
        <>
          <Text style={s.title}>Resumen para publicar</Text>
          <Text style={s.text}>
            {selected?.plate} · {draft.offeredSeats} plazas · duración declarada{' '}
            {draft.estimatedDurationMinutes} min · {draft.departureAt}
          </Text>
          {selected?.type === 'MOTORCYCLE' && (
            <Text style={s.text}>
              {draft.providesHelmet
                ? 'Casco incluido'
                : 'Cada pasajero debe traer casco'}
            </Text>
          )}
          <Text style={s.text}>
            {rules.data
              ?.filter((rule) =>
                draft.ruleIds.length
                  ? draft.ruleIds.includes(rule.id)
                  : rule.code === 'DEFAULT',
              )
              .map((rule) => rule.description)
              .join(' · ')}
          </Text>
          <RoutePreview
            geometry={draft.itinerary.geometry ?? null}
            description={draft.itinerary.description}
            stops={preview.stops}
          />
          {save.isSuccess ? (
            <Text accessibilityLiveRegion="polite">
              Viaje publicado. Ya aparece en Mis viajes.
            </Text>
          ) : (
            <>
              <Choice
                label="Confirmo que la ruta y los puntos son públicos y no incluyen domicilios ni datos privados"
                checkbox
                checked={confirmedPublic}
                onPress={() => setConfirmedPublic(!confirmedPublic)}
              />
              <Button
                title={save.isPending ? 'Publicando…' : 'Confirmar publicación'}
                disabled={!confirmedPublic || save.isPending}
                onPress={() => save.mutate(draft)}
              />
              <Button
                title="Editar antes de publicar"
                secondary
                disabled={save.isPending}
                onPress={() => {
                  save.reset();
                  setPreview(undefined);
                }}
              />
            </>
          )}
        </>
      ) : (
        <>
          <Text style={s.text}>
            Define los puntos públicos del viaje desde o hacia la USC. La salida
            requiere más de 30 minutos de anticipación.
          </Text>
          <View style={s.section}>
            <Text style={s.title}>Vehículo propio</Text>
            {vehicles.data &&
              !vehicles.data.some(({ eligibleNow }) => eligibleNow) && (
                <Text>
                  Registra un vehículo y consulta los requisitos vigentes para
                  conducir.
                </Text>
              )}
            {vehicles.data?.map((item) => (
              <Choice
                key={item.id}
                label={`Vehículo ${item.plate} · ${item.passengerCapacity} plazas · ${item.verificationStatus === 'VERIFIED' ? 'verificado' : item.verificationStatus === 'DECLARED' ? 'declarado' : 'sin vigencia verificada'}`}
                checked={selected?.id === item.id}
                onPress={() => setVehicleId(item.id)}
              />
            ))}
            {selected?.type === 'MOTORCYCLE' && (
              <Choice
                checkbox
                label="Casco de pasajero incluido"
                checked={helmet}
                onPress={() => setHelmet(!helmet)}
              />
            )}
          </View>
          <View style={s.section}>
            <Text style={s.title}>Sentido del viaje</Text>
            <Choice
              label="Desde la USC"
              checked={direction === 'DESDE_USC'}
              onPress={() => {
                form.setValue('direction', 'DESDE_USC');
                form.getValues('stops').forEach(({ access }, index) => {
                  if (access === 'PICKUP' || access === 'BOTH')
                    form.setValue(`stops.${index}.access`, 'DROPOFF');
                });
              }}
            />
            <Choice
              label="Hacia la USC"
              checked={direction === 'HACIA_USC'}
              onPress={() => form.setValue('direction', 'HACIA_USC')}
            />
          </View>
          <PointEditor
            title="Origen"
            institutional={direction === 'DESDE_USC'}
            name="origin"
            control={form.control}
            catalog={catalog}
          />
          <PointEditor
            title="Destino"
            institutional={direction === 'HACIA_USC'}
            name="destination"
            control={form.control}
            catalog={catalog}
          />
          <Field
            control={form.control}
            name="departureAt"
            label="Salida Colombia (AAAA-MM-DD HH:mm)"
          />
          <Field
            control={form.control}
            name="estimatedDurationMinutes"
            label="Duración declarada (minutos)"
          />
          <Field
            control={form.control}
            name="offeredSeats"
            label="Cupos ofrecidos"
          />
          <Field
            control={form.control}
            name="description"
            label="Vías y referencias del recorrido"
          />
          <Text style={s.text}>
            Puedes publicar el itinerario descrito o elegir una alternativa vial
            si el proveedor está disponible.
          </Text>
          {stops.fields.map((stop, index) => (
            <View key={stop.id} style={s.section}>
              <PointEditor
                title={`Parada ${index + 1}`}
                name={`stops.${index}`}
                control={form.control}
                catalog={catalog}
              />
              <StopAccessEditor
                control={form.control}
                index={index}
                direction={direction}
              />
              {index > 0 && (
                <Button
                  title={`Subir parada ${index + 1}`}
                  secondary
                  onPress={() => stops.move(index, index - 1)}
                />
              )}
              {index < stops.fields.length - 1 && (
                <Button
                  title={`Bajar parada ${index + 1}`}
                  secondary
                  onPress={() => stops.move(index, index + 1)}
                />
              )}
              <Button
                title={`Quitar parada ${index + 1}`}
                secondary
                onPress={() => stops.remove(index)}
              />
            </View>
          ))}
          <Button
            title="Añadir parada"
            disabled={stops.fields.length >= 10}
            secondary
            onPress={() =>
              stops.append({
                ...emptyPoint,
                access: direction === 'DESDE_USC' ? 'DROPOFF' : 'PICKUP',
              })
            }
          />
          <View style={s.section}>
            <Text style={s.title}>Reglas de convivencia</Text>
            {rules.data
              ?.filter(({ code }) => code !== 'DEFAULT')
              .map((rule) => (
                <Choice
                  key={rule.id}
                  label={rule.description}
                  checkbox
                  checked={ruleIds.includes(rule.id)}
                  onPress={() =>
                    setRuleIds((ids) =>
                      ids.includes(rule.id)
                        ? ids.filter((id) => id !== rule.id)
                        : [...ids, rule.id],
                    )
                  }
                />
              ))}
            <Text style={s.text}>
              Sin selección se aplica el acuerdo general del catálogo.
            </Text>
          </View>
          <Choice
            checkbox
            label="Autorizo enviar las coordenadas de estos puntos públicos al motor vial configurado"
            checked={routingConsent}
            onPress={() => setRoutingConsent(!routingConsent)}
          />
          <Button
            title={
              options.isPending
                ? 'Consultando rutas…'
                : 'Consultar rutas viales'
            }
            secondary
            disabled={
              !selected?.eligibleNow || !routingConsent || options.isPending
            }
            onPress={() => {
              void suggest();
            }}
          />
          {options.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {options.error.message}
            </Text>
          )}
          {options.data?.map((option, index) => (
            <View key={index} style={s.section}>
              <RoutePreview
                geometry={option.geometry}
                stops={[]}
                description={`Alternativa vial ${index + 1} · ${option.durationMinutes} minutos estimados`}
                distanceMeters={option.distanceMeters}
              />
              <Button
                title={`Elegir alternativa ${index + 1}`}
                secondary
                onPress={() => chooseOption(option)}
              />
            </View>
          ))}
          <Button
            title="Revisar viaje"
            disabled={!selected?.eligibleNow || !rules.data || !points.data}
            onPress={() => {
              void review();
            }}
          />
        </>
      )}
      {(inputError || save.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {inputError || save.error?.message}
        </Text>
      )}
      <Link href="/my-trips" style={s.link}>
        Ver mis viajes publicados
      </Link>
    </ProtectedPage>
  );
}
