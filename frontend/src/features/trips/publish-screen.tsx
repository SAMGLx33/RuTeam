import { useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CampusMeetingPoint,
  CompensationMethod,
  DemoLicense,
  TripEconomicsPreview,
  TripEditInput,
  MeetingPointInput,
  PublishTripInput,
  RouteOption,
  RecurrenceInput,
  RecurringTripTemplate,
  RecurringTripView,
  RouteOptionsInput,
  TripRule,
  TripSummary,
  VehicleSummary,
} from '@ruteam/contracts';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Field } from '../../components/forms/field';
import { Button } from '../../components/ui/button';
import { Link, Text, View } from '../../theme/primitives';
import { breakpoints, colors, radii } from '../../theme/tokens';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { Choice, emptyPoint, type PublishFormValues } from './itinerary-form';
import {
  EconomicTerms,
  expenseConcepts,
  methodLabel,
} from '../expenses/economic-terms';
import { RouteGeometryPreview, travelTime } from './route-preview';
import { TripPlacePicker } from './trip-place-picker';
import { TripDeparturePicker, colombiaDay } from './trip-departure-picker';

type Alternative = Pick<
  RouteOption,
  'geometry' | 'durationMinutes' | 'maneuvers' | 'routingSelection'
> &
  Partial<Pick<RouteOption, 'distanceMeters'>>;
type Point = PublishFormValues['origin'];
const weekdays = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
const methodsAvailable = ['NEQUI', 'DAVIPLATA', 'CASH'] as const;

function formPoint(point: MeetingPointInput): Point {
  return 'campusPointId' in point
    ? {
        campusPointId: point.campusPointId,
        label: point.label ?? '',
        instructions: point.instructions ?? '',
      }
    : {
        campusPointId: '',
        label: point.label,
        instructions: point.instructions ?? '',
        coordinates: { latitude: point.latitude, longitude: point.longitude },
      };
}

function external(point: Point) {
  return point.coordinates && point.label.trim().length >= 2
    ? {
        ...point.coordinates,
        label: point.label.trim(),
        instructions: point.instructions.trim() || undefined,
      }
    : undefined;
}

function coordinatesKey(route: RouteOptionsInput) {
  return JSON.stringify([
    route.direction,
    [route.origin, ...route.stops, route.destination].map((point) =>
      'campusPointId' in point
        ? point.campusPointId
        : [point.longitude, point.latitude],
    ),
  ]);
}

function calendarDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

function hasDepartureWindow(value: string) {
  return Date.parse(value) > Date.now() + 30 * 60_000;
}

export function PublishScreen() {
  const { scheduleId, sourceTripId, editTripId } = useLocalSearchParams<{
    scheduleId: string;
    sourceTripId: string;
    editTripId: string;
  }>();
  const { user } = useSession();
  const schedule = useQuery({
    queryKey: ['trip-schedules', user?.id, scheduleId],
    queryFn: () =>
      api<RecurringTripView>(
        '/trip-schedules/' + encodeURIComponent(scheduleId),
      ),
    enabled: !!scheduleId && !!user?.capabilities.driver,
  });
  const mine = useQuery({
    queryKey: ['my-trips', user?.id],
    queryFn: () => api<TripSummary[]>('/trips/my'),
    enabled: !scheduleId && !!editTripId && !!user?.capabilities.driver,
  });
  const edited = mine.data?.find(({ id }) => id === editTripId);
  const priorId = editTripId ?? sourceTripId;
  const source = useQuery({
    queryKey: ['trip-reuse', user?.id, priorId],
    queryFn: () =>
      api<RecurringTripTemplate>(
        '/trips/' + encodeURIComponent(priorId) + '/reuse',
      ),
    enabled:
      !scheduleId &&
      !!priorId &&
      !!user?.capabilities.driver &&
      (!editTripId ||
        (edited?.canEdit === true && !edited.descriptiveEditsOnly)),
    staleTime: 0,
  });
  if (
    !scheduleId &&
    editTripId &&
    (!edited || !edited.canEdit || edited.descriptiveEditsOnly)
  )
    return (
      <ProtectedPage title="Editar viaje publicado" requires="driver">
        <Text
          accessibilityRole={
            mine.error || (mine.isSuccess && !edited) ? 'alert' : undefined
          }
        >
          {mine.error?.message ??
            (edited?.canEdit && edited.descriptiveEditsOnly
              ? 'El viaje tiene participaciones, grupos o propuestas. Puedes editar la descripción en Mis viajes.'
              : mine.isSuccess
                ? 'Esta publicación no admite cambios. Consulta su estado en Mis viajes.'
                : 'Cargando publicación…')}
        </Text>
      </ProtectedPage>
    );
  if (!scheduleId && priorId && !source.data)
    return (
      <ProtectedPage
        title={edited ? 'Editar viaje publicado' : 'Reutilizar publicación'}
        requires="driver"
      >
        <Text accessibilityRole={source.error ? 'alert' : undefined}>
          {source.error?.message ?? 'Cargando recorrido anterior…'}
        </Text>
      </ProtectedPage>
    );
  if (scheduleId && !schedule.data)
    return (
      <ProtectedPage title="Editar recurrencia" requires="driver">
        <Text accessibilityRole={schedule.error ? 'alert' : undefined}>
          {schedule.error?.message ?? 'Cargando plantilla…'}
        </Text>
      </ProtectedPage>
    );
  return (
    <PublishForm
      key={scheduleId ?? priorId ?? 'new'}
      schedule={schedule.data}
      prior={source.data}
      edited={edited}
    />
  );
}

function PublishForm({
  schedule,
  prior,
  edited,
}: {
  schedule?: RecurringTripView;
  prior?: RecurringTripTemplate;
  edited?: TripSummary;
}) {
  const { user } = useSession();
  const router = useRouter();
  const client = useQueryClient();
  const wide = useWindowDimensions().width >= breakpoints.columns;
  const template = schedule?.template ?? prior;
  const [draftVersion] = useState(edited?.version);
  const initialDirection = template?.itinerary.direction ?? 'DESDE_USC';
  const form = useForm<PublishFormValues>({
    defaultValues: {
      direction: initialDirection,
      origin: template ? formPoint(template.itinerary.origin) : emptyPoint,
      destination: template
        ? formPoint(template.itinerary.destination)
        : emptyPoint,
      stops:
        template?.itinerary.stops.map((point) => ({
          ...formPoint(point),
          access: point.access,
        })) ?? [],
      departureAt: edited
        ? new Date(Date.parse(edited.departureAt) - 5 * 3600_000)
            .toISOString()
            .slice(0, 16)
            .replace('T', ' ')
        : colombiaDay(1) + ' 08:00',
      estimatedDurationMinutes: String(
        template?.estimatedDurationMinutes ?? 45,
      ),
      offeredSeats: String(template?.offeredSeats ?? 1),
      description: template?.itinerary.description ?? '',
      fuelCop: String(template?.economics?.estimate?.fuelCop ?? 0),
      tollsCop: String(template?.economics?.estimate?.tollsCop ?? 0),
      parkingCop: String(template?.economics?.estimate?.parkingCop ?? 0),
      recurrenceName: schedule?.name ?? '',
      startsOn: schedule?.startsOn ?? colombiaDay(1),
      endsOn: schedule?.endsOn ?? '',
      time: schedule?.time ?? '08:00',
    },
  });
  const [advanced, setAdvanced] = useState(!!schedule);
  const [recurring, setRecurring] = useState(!!schedule);
  const [days, setDays] = useState(schedule?.weekdays ?? []);
  const [contribution, setContribution] = useState(
    !!template?.economics?.estimate,
  );
  const [methods, setMethods] = useState<CompensationMethod[]>(
    template?.economics?.compensationMethods ?? [],
  );
  const [vehicleId, setVehicleId] = useState(template?.vehicleId ?? '');
  const [ruleIds, setRuleIds] = useState(template?.ruleIds ?? []);
  const [helmet, setHelmet] = useState(template?.providesHelmet ?? false);
  const [consent, setConsent] = useState(false);
  const [publicPoints, setPublicPoints] = useState(false);
  const [manualKey, setManualKey] = useState<string>();
  const [refreshKey, setRefreshKey] = useState<string>();
  const [choice, setChoice] = useState<{ key: string; index: number }>();
  const [showChoices, setShowChoices] = useState(false);
  const [notice, setNotice] = useState('');
  const [completedSchedule, setCompletedSchedule] = useState(false);

  const values = useWatch({ control: form.control }) as PublishFormValues;
  const stops = useFieldArray({ control: form.control, name: 'stops' });
  const fromUsc = values.direction === 'DESDE_USC';
  const campusField = fromUsc ? 'origin' : 'destination';
  const externalField = fromUsc ? 'destination' : 'origin';
  const externalTitle = fromUsc ? 'Destino' : 'Origen';
  const externalPoint = external(values[externalField]);
  const enabled = !!user?.capabilities.driver;
  const points = useQuery({
    queryKey: ['publication-campus', user?.id, edited?.id],
    queryFn: ({ signal }) =>
      edited
        ? api<CampusMeetingPoint[]>('/campus/meeting-points', { signal })
        : api<CampusMeetingPoint>('/campus/publication-point', { signal }).then(
            (point) => [point],
          ),
    enabled,
  });
  const editedCampusId = edited?.itinerary?.stops.find(
    (point) => point.campusPointId,
  )?.campusPointId;
  const campus = editedCampusId
    ? points.data?.find((point) => point.id === editedCampusId)
    : points.data?.[0];
  const vehicles = useQuery({
    queryKey: ['vehicles', user?.id],
    queryFn: () => api<VehicleSummary[]>('/vehicles'),
    enabled,
  });
  const license = useQuery({
    queryKey: ['license'],
    queryFn: () => api<DemoLicense | null>('/driver-eligibility'),
    enabled,
  });
  const rules = useQuery({
    queryKey: ['trip-rules'],
    queryFn: () => api<TripRule[]>('/trip-rules'),
    enabled,
  });
  const eligible =
    vehicles.data?.filter(
      (vehicle) =>
        vehicle.eligibleNow &&
        (license.data?.category === 'BOTH' ||
          license.data?.category === vehicle.type),
    ) ?? [];
  const vehicle = eligible.find((item) => item.id === vehicleId) ?? eligible[0];
  const seats = Math.max(
    1,
    Math.min(vehicle?.passengerCapacity ?? 1, Number(values.offeredSeats) || 1),
  );
  const interior = values[campusField].label.trim();
  const campusPoint = campus && {
    campusPointId: campus.id,
    label: interior || undefined,
  };
  const visibleStops = values.stops
    .map((stop, index) => ({ stop, index }))
    .filter(({ stop }) => fromUsc || stop.access === 'WAYPOINT');
  const intermediate = visibleStops.flatMap(({ stop }) => {
    const point = external(stop);
    return point
      ? [
          {
            ...point,
            access:
              fromUsc && stop.access !== 'WAYPOINT'
                ? ('DROPOFF' as const)
                : ('WAYPOINT' as const),
          },
        ]
      : [];
  });
  const geoCampus =
    campus?.latitude != null && campus.longitude != null
      ? {
          label: interior || campus.name,
          latitude: campus.latitude,
          longitude: campus.longitude,
          instructions:
            'Referencia pública del campus. El encuentro interior se indica mediante texto.',
        }
      : undefined;
  const anchors = [
    ...(fromUsc ? [geoCampus] : [externalPoint]),
    ...intermediate,
    ...(fromUsc ? [externalPoint] : [geoCampus]),
  ].flatMap((point) => (point ? [point] : []));
  const route: RouteOptionsInput | undefined =
    campusPoint &&
    geoCampus &&
    externalPoint &&
    intermediate.length === visibleStops.length
      ? {
          direction: values.direction,
          publicMeetingPoints: true,
          origin: fromUsc ? campusPoint : externalPoint,
          destination: fromUsc ? externalPoint : campusPoint,
          stops: intermediate,
        }
      : undefined;
  // Route signing binds geography and order. Interior wording is resolved before publication.
  const request = route && {
    ...route,
    origin:
      'campusPointId' in route.origin
        ? { ...route.origin, label: campus?.name }
        : route.origin,
    destination:
      'campusPointId' in route.destination
        ? { campusPointId: route.destination.campusPointId }
        : route.destination,
  };
  const key = route ? coordinatesKey(route) : '';
  const original =
    template?.itinerary.geometry &&
    key &&
    coordinatesKey(template.itinerary) === key
      ? {
          geometry: template.itinerary.geometry,
          durationMinutes: template.estimatedDurationMinutes,
          maneuvers: template.itinerary.maneuvers,
          routingSelection: template.itinerary.routingSelection,
        }
      : undefined;
  const routeQuery = useQuery({
    queryKey: ['publication-route', user?.id, key],
    enabled:
      enabled && !!request && consent && (!original || refreshKey === key),
    queryFn: ({ signal }) =>
      api<RouteOption[]>('/trips/route-options', {
        method: 'POST',
        body: request,
        signal,
      }),
    retry: false,
    staleTime: 20 * 60_000,
    refetchOnWindowFocus: false,
  });
  const manual = !!key && manualKey === key;
  const alternatives = routeQuery.data;
  const selectedIndex = choice?.key === key ? choice.index : 0;
  const alternative: Alternative | undefined = manual
    ? undefined
    : (alternatives?.[selectedIndex] ??
      (refreshKey === key ? undefined : original || undefined));
  const economics = {
    estimate: contribution
      ? {
          fuelCop: Number(values.fuelCop),
          tollsCop: Number(values.tollsCop),
          parkingCop: Number(values.parkingCop),
        }
      : undefined,
    compensationMethods: contribution ? methods : [],
  };
  const validCosts = expenseConcepts.every(([field]) =>
    /^\d+$/.test(values[field]),
  );
  const economicsPreview = useQuery({
    queryKey: ['publication-economics', user?.id, seats, economics],
    enabled: enabled && contribution && validCosts,
    queryFn: ({ signal }) =>
      api<TripEconomicsPreview>('/trips/economics-preview', {
        method: 'POST',
        body: { offeredSeats: seats, economics },
        signal,
      }),
    retry: false,
    staleTime: 60_000,
  });
  const save = useMutation({
    mutationFn: async ({
      draft,
      recurrence,
    }: {
      draft: PublishTripInput;
      recurrence?: RecurrenceInput;
    }) => {
      if (edited) {
        const body: TripEditInput = {
          version: draftVersion!,
          publication: draft,
        };
        return {
          trip: await api<TripSummary>('/trips/' + edited.id, {
            method: 'PATCH',
            body,
          }),
        };
      }
      if (!recurrence)
        return {
          trip: await api<TripSummary>('/trips', {
            method: 'POST',
            body: draft,
          }),
        };
      const { departureAt, ...tripTemplate } = draft;
      void departureAt;
      await api<RecurringTripView>(
        schedule ? '/trip-schedules/' + schedule.id : '/trip-schedules',
        {
          method: schedule ? 'PUT' : 'POST',
          body: { ...recurrence, template: tripTemplate },
        },
      );
      return {};
    },
    onSuccess: ({ trip }) => {
      for (const name of [
        'my-trips',
        'trip-schedules',
        'available-trips',
        'trip-feed',
        'trip-operation',
        'agenda',
        'trip-detail',
      ])
        void client.invalidateQueries({ queryKey: [name] });
      if (trip)
        router.replace({
          pathname: '/trip/[id]',
          params: { id: trip.id, published: '1' },
        });
      else setCompletedSchedule(true);
    },
  });

  function changeDirection() {
    form.setValue('origin', values.destination);
    form.setValue('destination', values.origin);
    form.setValue('direction', fromUsc ? 'HACIA_USC' : 'DESDE_USC');
    setNotice('');
  }

  function submit() {
    setNotice('');
    if (!vehicle) return setNotice('Selecciona un vehículo habilitado.');
    if (!campus || !geoCampus)
      return setNotice(
        'Pampalinda necesita una referencia geográfica configurada.',
      );
    if (fromUsc && interior.length < 2)
      return setNotice('Indica el punto de encuentro dentro de la USC.');
    if (interior.length === 1)
      return setNotice(
        'Completa el nombre del punto de encuentro dentro de la USC.',
      );
    if (!externalPoint)
      return setNotice('Elige el ' + externalTitle.toLowerCase() + ' externo.');
    if (!route) return setNotice('Completa o elimina la parada sin ubicación.');
    if (!alternative && !manual)
      return setNotice('Calcula una ruta o elige un itinerario declarado.');
    if (!publicPoints)
      return setNotice('Confirma que los puntos y la ruta son públicos.');
    const departureAt = values.departureAt.replace(' ', 'T') + ':00-05:00';
    if (!recurring && !hasDepartureWindow(departureAt))
      return setNotice(
        'Programa la salida con más de 30 minutos de anticipación.',
      );
    const duration =
      alternative?.durationMinutes ?? Number(values.estimatedDurationMinutes);
    if (!Number.isInteger(duration) || duration < 5 || duration > 360)
      return setNotice('Indica una duración de 5 a 360 minutos enteros.');
    if (contribution && (!validCosts || !economicsPreview.data))
      return setNotice(
        economicsPreview.error?.message ??
          'Espera el cálculo del aporte o revisa los gastos.',
      );
    const recurrence = recurring
      ? {
          name: values.recurrenceName.trim(),
          startsOn: values.startsOn,
          endsOn: values.endsOn,
          time: values.time,
          weekdays: [...days].sort((a, b) => a - b),
        }
      : undefined;
    if (
      recurrence &&
      (recurrence.name.length < 2 ||
        !calendarDay(recurrence.startsOn) ||
        !calendarDay(recurrence.endsOn) ||
        recurrence.startsOn > recurrence.endsOn ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(recurrence.time) ||
        !recurrence.weekdays.length)
    ) {
      setAdvanced(true);
      return setNotice(
        'Completa el nombre, rango de fechas, hora y días de la recurrencia.',
      );
    }
    save.mutate({
      recurrence,
      draft: {
        vehicleId: vehicle.id,
        departureAt,
        estimatedDurationMinutes: duration,
        offeredSeats: seats,
        economics,
        ruleIds,
        providesHelmet: vehicle.type === 'MOTORCYCLE' ? helmet : undefined,
        itinerary: {
          ...route,
          description:
            values.description.trim() ||
            (anchors[0].label + ' → ' + anchors.at(-1)!.label).slice(0, 240),
          geometry: alternative?.geometry,
          routingSelection: alternative?.routingSelection,
          maneuvers: alternative?.routingSelection
            ? alternative.maneuvers
            : undefined,
        },
      },
    });
  }

  const map = (
    <View style={styles.panel}>
      <Text style={s.title}>Recorrido</Text>
      <RouteGeometryPreview
        key={key}
        geometry={alternative?.geometry ?? null}
        stops={anchors}
      />
      {geoCampus && (
        <Text style={s.text}>
          El marcador de la USC representa una referencia pública de Pampalinda.
        </Text>
      )}
      {route && !consent && !alternative && !manual && (
        <>
          <Text style={s.text}>
            Los puntos públicos se enviarán al motor vial para calcular el
            recorrido.
          </Text>
          <Button
            title="Autorizar y calcular ruta"
            onPress={() => setConsent(true)}
          />
        </>
      )}
      {routeQuery.isFetching && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          Calculando recorrido…
        </Text>
      )}
      {routeQuery.error && (
        <>
          <Text accessibilityRole="alert" style={s.error}>
            {routeQuery.error.message}
          </Text>
          <Button
            secondary
            title="Reintentar ruta"
            onPress={() => void routeQuery.refetch()}
          />
        </>
      )}
      {alternative && (
        <Text style={s.text}>
          {alternative.distanceMeters != null
            ? (alternative.distanceMeters / 1000).toFixed(1) + ' km · '
            : ''}
          {alternative.durationMinutes} min estimados
        </Text>
      )}
      {alternative && (
        <Button
          secondary
          title="Cambiar ruta"
          onPress={() => {
            setConsent(true);
            setRefreshKey(key);
            setShowChoices(!showChoices);
            if (refreshKey === key && !alternatives?.length)
              void routeQuery.refetch();
          }}
        />
      )}
      {!manual &&
        (showChoices || (alternatives?.length ?? 0) > 1) &&
        alternatives?.map((option, index) => (
          <Choice
            key={index}
            checked={selectedIndex === index}
            label={
              'Ruta ' +
              (index + 1) +
              ' · ' +
              (option.distanceMeters / 1000).toFixed(1) +
              ' km · ' +
              option.durationMinutes +
              ' min'
            }
            onPress={() => setChoice({ key, index })}
          />
        ))}
      {route &&
        (manual ? (
          <>
            <Text style={s.text}>Itinerario declarado</Text>
            <Field
              control={form.control}
              name="estimatedDurationMinutes"
              label="Duración declarada (minutos)"
            />
            <Button
              secondary
              title="Volver al cálculo vial"
              onPress={() => {
                setManualKey(undefined);
                setConsent(true);
              }}
            />
          </>
        ) : (
          <Button
            secondary
            title="Usar itinerario declarado"
            onPress={() => setManualKey(key)}
          />
        ))}
    </View>
  );

  return (
    <ProtectedPage
      title={
        schedule
          ? 'Editar recurrencia'
          : edited
            ? 'Editar viaje publicado'
            : 'Publicar viaje'
      }
      requires="driver"
    >
      <View style={[styles.layout, wide && styles.wide]}>
        <View style={[styles.column, wide && styles.wideColumn]}>
          <View style={styles.panel}>
            <View style={styles.row}>
              <Choice
                label="Desde la USC"
                checked={fromUsc}
                onPress={() => {
                  if (!fromUsc) changeDirection();
                }}
              />
              <Choice
                label="Hacia la USC"
                checked={!fromUsc}
                onPress={() => {
                  if (fromUsc) changeDirection();
                }}
              />
            </View>
            <Text style={s.title}>
              {fromUsc ? 'Origen' : 'Destino'} ·{' '}
              {campus?.name ?? 'Ciudadela Pampalinda'}
            </Text>
            {points.error && (
              <>
                <Text accessibilityRole="alert" style={s.error}>
                  {points.error.message}
                </Text>
                <Button
                  title="Reintentar sede"
                  secondary
                  onPress={() => void points.refetch()}
                />
              </>
            )}
            <Field
              control={form.control}
              name={
                (campusField + '.label') as 'origin.label' | 'destination.label'
              }
              label={
                fromUsc
                  ? 'Punto de encuentro en la USC'
                  : 'Referencia de llegada en la USC (opcional)'
              }
            />
            <TripPlacePicker
              key={externalField}
              title={externalTitle}
              value={externalPoint}
              onChange={({ label, latitude, longitude }) =>
                form.setValue(externalField, {
                  ...emptyPoint,
                  label,
                  coordinates: { latitude, longitude },
                })
              }
            />
            {(fromUsc || advanced || visibleStops.length > 0) && (
              <>
                {visibleStops.map(({ stop, index }, order) => (
                  <View
                    key={stops.fields[index]?.id ?? index}
                    style={s.section}
                  >
                    <TripPlacePicker
                      title={
                        (fromUsc ? 'Parada ' : 'Punto de paso ') + (order + 1)
                      }
                      value={external(stop)}
                      initiallyOpen={!stop.coordinates}
                      onChange={({ label, latitude, longitude }) =>
                        form.setValue(`stops.${index}`, {
                          ...emptyPoint,
                          label,
                          coordinates: { latitude, longitude },
                          access: stop.access,
                        })
                      }
                    />
                    <View style={styles.row}>
                      {order > 0 && (
                        <Button
                          secondary
                          title={
                            (fromUsc
                              ? 'Subir parada '
                              : 'Subir punto de paso ') +
                            (order + 1)
                          }
                          onPress={() =>
                            stops.move(index, visibleStops[order - 1].index)
                          }
                        />
                      )}
                      <Button
                        secondary
                        title={
                          (fromUsc
                            ? 'Quitar parada '
                            : 'Quitar punto de paso ') +
                          (order + 1)
                        }
                        onPress={() => stops.remove(index)}
                      />
                    </View>
                  </View>
                ))}
                {(fromUsc || advanced) && (
                  <Button
                    secondary
                    title={
                      fromUsc ? '+ Añadir parada' : '+ Añadir punto de paso'
                    }
                    disabled={stops.fields.length >= 10}
                    onPress={() =>
                      stops.append({
                        ...emptyPoint,
                        access: fromUsc ? 'DROPOFF' : 'WAYPOINT',
                      })
                    }
                  />
                )}
              </>
            )}
          </View>
          {!wide && map}
          {!recurring && (
            <View style={styles.panel}>
              <TripDeparturePicker
                value={values.departureAt}
                onChange={(value) => form.setValue('departureAt', value)}
              />
            </View>
          )}
          <View style={styles.panel}>
            <Text style={s.title}>Vehículo y plazas</Text>
            {eligible.length > 1 &&
              eligible.map((item) => (
                <Choice
                  key={item.id}
                  label={
                    item.brand +
                    ' · ' +
                    item.modelYear +
                    ' · ' +
                    item.plate +
                    ' · ' +
                    item.passengerCapacity +
                    ' plazas'
                  }
                  checked={vehicle?.id === item.id}
                  onPress={() => setVehicleId(item.id)}
                />
              ))}
            {eligible.length === 1 && vehicle && (
              <Text style={s.text}>
                {vehicle.brand} · {vehicle.modelYear} · {vehicle.plate} ·{' '}
                {vehicle.passengerCapacity} plazas
              </Text>
            )}
            {!vehicle && (
              <>
                <Text style={s.text}>
                  {vehicles.isPending || license.isPending
                    ? 'Consultando vehículos…'
                    : (vehicles.error?.message ??
                      license.error?.message ??
                      'Necesitas un vehículo con SOAT vigente y una licencia que cubra su categoría.')}
                </Text>
                <Link href="/vehicles" style={s.link}>
                  Gestionar vehículos y licencia
                </Link>
              </>
            )}
            {vehicle && (
              <View style={styles.row}>
                <Button
                  secondary
                  title="−"
                  accessibilityLabel="Quitar plaza"
                  disabled={seats <= 1}
                  onPress={() =>
                    form.setValue('offeredSeats', String(seats - 1))
                  }
                />
                <Text accessibilityLiveRegion="polite" style={s.title}>
                  {seats} {seats === 1 ? 'plaza' : 'plazas'}
                </Text>
                <Button
                  secondary
                  title="+"
                  accessibilityLabel="Añadir plaza"
                  disabled={seats >= vehicle.passengerCapacity}
                  onPress={() =>
                    form.setValue('offeredSeats', String(seats + 1))
                  }
                />
              </View>
            )}
            {vehicle?.type === 'MOTORCYCLE' && (
              <Choice
                checkbox
                label="Casco de pasajero incluido"
                checked={helmet}
                onPress={() => setHelmet(!helmet)}
              />
            )}
          </View>
          <View style={styles.panel}>
            <Text style={s.title}>Aporte</Text>
            <View style={styles.row}>
              <Choice
                label="Viaje gratuito"
                checked={!contribution}
                onPress={() => setContribution(false)}
              />
              <Choice
                label="Calcular aporte voluntario"
                checked={contribution}
                onPress={() => setContribution(true)}
              />
            </View>
            {contribution && (
              <>
                {expenseConcepts.map(([field, label]) => (
                  <Field
                    key={field}
                    control={form.control}
                    name={field}
                    label={label + ' en COP'}
                  />
                ))}
                {methodsAvailable.map((method) => (
                  <Choice
                    key={method}
                    checkbox
                    label={methodLabel[method]}
                    checked={methods.includes(method)}
                    onPress={() =>
                      setMethods(
                        methods.includes(method)
                          ? methods.filter((value) => value !== method)
                          : [...methods.slice(0, 1), method],
                      )
                    }
                  />
                ))}
                {economicsPreview.data && (
                  <EconomicTerms terms={economicsPreview.data} />
                )}
                {economicsPreview.error && (
                  <Text accessibilityRole="alert" style={s.error}>
                    {economicsPreview.error.message}
                  </Text>
                )}
              </>
            )}
          </View>
          <View style={styles.panel}>
            <Button
              secondary
              title={
                advanced
                  ? 'Ocultar opciones adicionales'
                  : 'Opciones adicionales'
              }
              onPress={() => setAdvanced(!advanced)}
            />
            {advanced && (
              <>
                <Field
                  control={form.control}
                  name="description"
                  label="Nota del conductor (opcional)"
                />
                {rules.data
                  ?.filter((rule) => rule.code !== 'DEFAULT')
                  .map((rule) => (
                    <Choice
                      key={rule.id}
                      checkbox
                      label={rule.description}
                      checked={ruleIds.includes(rule.id)}
                      onPress={() =>
                        setRuleIds(
                          ruleIds.includes(rule.id)
                            ? ruleIds.filter((id) => id !== rule.id)
                            : [...ruleIds, rule.id],
                        )
                      }
                    />
                  ))}
                {fromUsc &&
                  visibleStops.map(({ stop, index }) => (
                    <Choice
                      key={stops.fields[index]?.id ?? index}
                      checkbox
                      label={'Parada ' + (index + 1) + ' sólo de paso'}
                      checked={stop.access === 'WAYPOINT'}
                      onPress={() =>
                        form.setValue(
                          `stops.${index}.access`,
                          stop.access === 'WAYPOINT' ? 'DROPOFF' : 'WAYPOINT',
                        )
                      }
                    />
                  ))}
                {!edited && !schedule && (
                  <Choice
                    checkbox
                    label="Viaje recurrente"
                    checked={recurring}
                    onPress={() => setRecurring(!recurring)}
                  />
                )}
                {recurring && (
                  <>
                    <Field
                      control={form.control}
                      name="recurrenceName"
                      label="Nombre de la recurrencia"
                    />
                    <TripDeparturePicker
                      value={values.startsOn + ' ' + values.time}
                      onChange={(value) => {
                        const [day, time] = value.split(' ');
                        form.setValue('startsOn', day);
                        form.setValue('time', time);
                      }}
                    />
                    <Field
                      control={form.control}
                      name="endsOn"
                      label="Última fecha (AAAA-MM-DD)"
                    />
                    <View style={styles.row}>
                      {weekdays.map((day, index) => (
                        <Choice
                          key={day}
                          checkbox
                          label={day}
                          checked={days.includes(index + 1)}
                          onPress={() =>
                            setDays(
                              days.includes(index + 1)
                                ? days.filter((value) => value !== index + 1)
                                : [...days, index + 1],
                            )
                          }
                        />
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>
        <View style={[styles.column, wide && styles.wideColumn]}>
          {wide && map}
          <View style={styles.panel}>
            <Text style={s.title}>Resumen</Text>
            <Text style={s.text}>
              {fromUsc ? 'Desde la USC' : 'Hacia la USC'}
            </Text>
            <Text style={s.text}>
              {(fromUsc ? geoCampus?.label : externalPoint?.label) ??
                'Origen pendiente'}{' '}
              →{' '}
              {(fromUsc ? externalPoint?.label : geoCampus?.label) ??
                'Destino pendiente'}
            </Text>
            <Text style={s.text}>
              {recurring
                ? 'Recurrente · ' + values.time
                : travelTime(
                    values.departureAt.replace(' ', 'T') + ':00-05:00',
                  )}
            </Text>
            <Text style={s.text}>
              {seats} {seats === 1 ? 'plaza' : 'plazas'} ·{' '}
              {manual
                ? 'Itinerario declarado'
                : alternative
                  ? 'Ruta calculada'
                  : 'Ruta pendiente'}
            </Text>
            {contribution && economicsPreview.data && (
              <EconomicTerms terms={economicsPreview.data} />
            )}
            {!contribution && <Text style={s.text}>Viaje gratuito</Text>}
            <Choice
              checkbox
              label="Confirmo que la ruta y los puntos son públicos"
              checked={publicPoints}
              onPress={() => setPublicPoints(!publicPoints)}
            />
            {(notice || save.error) && (
              <Text accessibilityRole="alert" style={s.error}>
                {notice || save.error?.message}
              </Text>
            )}
            {completedSchedule ? (
              <Link href="/recurring-trips" style={s.link}>
                Recurrencia guardada · Ver mis recurrencias
              </Link>
            ) : (
              <Button
                title={
                  save.isPending
                    ? 'Guardando…'
                    : recurring
                      ? 'Guardar recurrencia'
                      : edited
                        ? 'Guardar cambios'
                        : 'Publicar viaje'
                }
                loading={save.isPending}
                disabled={save.isPending}
                onPress={submit}
              />
            )}
          </View>
        </View>
      </View>
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 14 },
  wide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { gap: 14, minWidth: 0 },
  wideColumn: { flex: 1 },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    padding: 14,
    gap: 10,
    minWidth: 0,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
