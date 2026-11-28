import type { RecurringTripTemplate } from '@ruteam/contracts';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  useWindowDimensions,
  type ScrollView,
  type View as ViewInstance,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  useForm,
  useFieldArray,
  useWatch,
  type Control,
} from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CampusMeetingPoint,
  CompensationMethod,
  TripEconomicsPreview,
  TripEditInput,
  MeetingPointInput,
  PublishTripInput,
  RouteOption,
  RecurrenceInput,
  RecurringTripView,
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
import { Link, Text, View } from '../../theme/primitives';
import { breakpoints } from '../../theme/tokens';
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
import {
  EconomicTerms,
  EconomicsPreview,
  expenseConcepts,
  methodLabel,
} from '../expenses/economic-terms';
import { maneuverInstruction, RoutePreview } from './route-preview';
import { BottomSheet } from '../../components/ui/bottom-sheet';
import {
  PublishProgress,
  PublishSummary,
  publishSteps,
  publishStyles as w,
  type PublishStep,
} from './publish-wizard';

type Draft = PublishTripInput;
type PreviewAlternative = Pick<RouteOption, 'geometry' | 'durationMinutes'> &
  Partial<
    Pick<RouteOption, 'routingSelection' | 'maneuvers' | 'distanceMeters'>
  >;
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

function routePoints(
  values: Pick<
    PublishFormValues,
    'direction' | 'origin' | 'destination' | 'stops'
  >,
): RouteOptionsInput {
  return {
    direction: values.direction,
    origin: pointInput(
      'Origen',
      values.origin,
      values.direction === 'DESDE_USC',
    ),
    destination: pointInput(
      'Destino',
      values.destination,
      values.direction === 'HACIA_USC',
    ),
    stops: values.stops.map((stop, index) => ({
      ...pointInput(`Parada ${index + 1}`, stop),
      access:
        values.direction === 'DESDE_USC' && stop.access !== 'WAYPOINT'
          ? 'DROPOFF'
          : stop.access,
    })),
    publicMeetingPoints: true,
  };
}

const weekdays = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const routeFields = ['direction', 'origin', 'destination', 'stops'] as const;

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function previewStops(route: RouteOptionsInput, catalog: CampusMeetingPoint[]) {
  return [
    { ...previewPoint(route.origin, catalog), access: 'PICKUP' as const },
    ...route.stops.map((stop) => ({
      ...previewPoint(stop, catalog),
      access: stop.access,
    })),
    { ...previewPoint(route.destination, catalog), access: 'DROPOFF' as const },
  ];
}

function RouteAlternatives({
  control,
  catalog,
  selectionKey,
  selected,
  requested,
  options,
  onChoose,
}: {
  control: Control<PublishFormValues>;
  catalog: CampusMeetingPoint[];
  selectionKey?: string;
  selected?: PreviewAlternative;
  requested?: RouteOptionsInput;
  options?: RouteOption[];
  onChoose: (option: RouteOption) => void;
}) {
  const [direction, origin, destination, routeStops] = useWatch({
    control,
    name: routeFields,
  });
  let key: string | undefined;
  let stops: ReturnType<typeof previewStops> = [];
  try {
    const route = routePoints({
      direction,
      origin,
      destination,
      stops: routeStops,
    });
    stops = previewStops(route, catalog);
    key = JSON.stringify(route);
  } catch {
    // The selected alternative no longer describes these points.
  }
  const matches = !!selected && selectionKey === key;
  const currentOptions =
    key && requested && JSON.stringify(requested) === key ? options : undefined;
  const displayed = matches ? selected : currentOptions?.[0];
  const displayedIndex =
    currentOptions?.findIndex((option) => displayed === option) ?? -1;
  const title =
    displayedIndex >= 0
      ? `Alternativa vial ${displayedIndex + 1}`
      : 'Alternativa vial seleccionada';
  return (
    <>
      {!!selected && (
        <Text
          style={matches ? w.success : w.note}
          accessibilityLiveRegion="polite"
        >
          {matches
            ? 'Alternativa vial seleccionada'
            : 'Los puntos cambiaron. Consulta otra alternativa vial para este recorrido.'}
        </Text>
      )}
      {currentOptions?.map((option, index) => (
        <View key={index} style={w.group}>
          <Text style={s.text}>
            Alternativa {index + 1} ·{' '}
            {(option.distanceMeters / 1000).toFixed(1)} km ·{' '}
            {option.durationMinutes} min
          </Text>
          <Button
            secondary={!matches || selected !== option}
            title={`Elegir alternativa ${index + 1}`}
            disabled={matches && selected === option}
            onPress={() => onChoose(option)}
          />
        </View>
      ))}
      {displayed && (
        <>
          <RoutePreview
            key={displayedIndex}
            geometry={displayed.geometry}
            stops={stops}
            description={`${title} · ${displayed.durationMinutes} minutos estimados`}
            distanceMeters={displayed.distanceMeters}
          />
          {!!displayed.maneuvers?.length && (
            <BottomSheet title="Indicaciones viales">
              {displayed.maneuvers.map((maneuver) => (
                <Text key={maneuver.order} style={s.text}>
                  {maneuverInstruction(maneuver)}
                  {maneuver.street ? ' · ' + maneuver.street : ''}
                </Text>
              ))}
            </BottomSheet>
          )}
        </>
      )}
    </>
  );
}

function formPoint(point: MeetingPointInput): PublishFormValues['origin'] {
  if ('campusPointId' in point)
    return {
      campusPointId: point.campusPointId,
      label: point.label ?? '',
      instructions: point.instructions ?? '',
    };
  return {
    campusPointId: '',
    label: point.label,
    coordinates: { latitude: point.latitude, longitude: point.longitude },
    instructions: point.instructions ?? '',
  };
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
  const client = useQueryClient();
  const template = schedule?.template ?? prior;
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.columns;
  const [step, setStep] = useState<PublishStep>('schedule');
  const previousStep = useRef(step);
  const scroll = useRef<ScrollView>(null);
  const heading = useRef<ViewInstance>(null);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === 'web') {
      heading.current?.focus();
    } else {
      const target = findNodeHandle(heading.current);
      if (target != null) AccessibilityInfo.setAccessibilityFocus(target);
    }
  }, [step]);

  const [draftVersion] = useState(edited?.version);
  const [tomorrow] = useState(() =>
    new Date(Date.now() + 86400000 - 5 * 3600000)
      .toISOString()
      .slice(0, 16)
      .replace('T', ' '),
  );
  const form = useForm<PublishFormValues>({
    shouldUnregister: false,
    defaultValues: {
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
        ? new Date(Date.parse(edited.departureAt) - 5 * 3600000)
            .toISOString()
            .slice(0, 16)
            .replace('T', ' ')
        : tomorrow,
      estimatedDurationMinutes: String(
        template?.estimatedDurationMinutes ?? 45,
      ),
      offeredSeats: String(template?.offeredSeats ?? 1),
      description: template?.itinerary.description ?? '',
      fuelCop: String(template?.economics?.estimate?.fuelCop ?? 0),
      tollsCop: String(template?.economics?.estimate?.tollsCop ?? 0),
      parkingCop: String(template?.economics?.estimate?.parkingCop ?? 0),
      direction: template?.itinerary.direction ?? 'DESDE_USC',
      recurrenceName: schedule?.name ?? '',
      startsOn: schedule?.startsOn ?? tomorrow.slice(0, 10),
      endsOn: schedule?.endsOn ?? '',
      time: schedule?.time ?? tomorrow.slice(11),
    },
  });
  const [selectedRoute, setSelectedRoute] = useState<
    | {
        key: string;
        option: PreviewAlternative;
      }
    | undefined
  >(
    () =>
      template?.itinerary.geometry && {
        key: JSON.stringify(routePoints(form.getValues())),
        option: {
          geometry: template.itinerary.geometry,
          routingSelection: template.itinerary.routingSelection,
          maneuvers: template.itinerary.maneuvers,
          durationMinutes: template.estimatedDurationMinutes,
        },
      },
  );
  const [isRecurring, setIsRecurring] = useState(!!schedule);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    schedule?.weekdays ?? [],
  );
  const [withContribution, setWithContribution] = useState(
    !!template?.economics?.estimate,
  );
  const [methods, setMethods] = useState<CompensationMethod[]>(
    template?.economics?.compensationMethods ?? [],
  );
  const [vehicleId, setVehicleId] = useState(template?.vehicleId ?? '');
  const [ruleIds, setRuleIds] = useState<string[]>(template?.ruleIds ?? []);
  const [helmet, setHelmet] = useState(template?.providesHelmet ?? false);
  const [preview, setPreview] = useState<{
    draft: Draft;
    recurrence?: RecurrenceInput;
    economics: TripEconomicsPreview;
    stops: (ReturnType<typeof previewPoint> & { access: StopAccess })[];
  }>();
  const [confirmedPublic, setConfirmedPublic] = useState(false);
  const [routingConsent, setRoutingConsent] = useState(false);
  const [inputError, setInputError] = useState('');
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
  const direction = useWatch({ control: form.control, name: 'direction' });
  const stops = useFieldArray({ control: form.control, name: 'stops' });
  const save = useMutation({
    mutationFn: async ({
      draft,
      recurrence,
    }: {
      draft: Draft;
      recurrence?: RecurrenceInput;
    }) => {
      if (edited) {
        if (draftVersion === undefined)
          throw new Error('Vuelve a cargar la publicación.');
        const body: TripEditInput = {
          version: draftVersion,
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
      return {
        schedule: await api<RecurringTripView>(
          schedule ? '/trip-schedules/' + schedule.id : '/trip-schedules',
          {
            method: schedule ? 'PUT' : 'POST',
            body: { ...recurrence, template: tripTemplate },
          },
        ),
      };
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['my-trips'] });
      void client.invalidateQueries({ queryKey: ['trip-schedules'] });
      void client.invalidateQueries({ queryKey: ['available-trips'] });
      void client.invalidateQueries({ queryKey: ['trip-feed'] });
      void client.invalidateQueries({ queryKey: ['trip-operation'] });
      void client.invalidateQueries({ queryKey: ['agenda'] });
    },
  });
  const economicsPreview = useMutation({
    mutationFn: (body: {
      offeredSeats: number;
      economics: NonNullable<Draft['economics']>;
    }) =>
      api<TripEconomicsPreview>('/trips/economics-preview', {
        method: 'POST',
        body,
      }),
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
      if (
        (!option.routingSelection || edited) &&
        option.durationMinutes >= 5 &&
        option.durationMinutes <= 360
      )
        form.setValue(
          'estimatedDurationMinutes',
          String(option.durationMinutes),
        );
    } catch (error) {
      setInputError(
        error instanceof Error ? error.message : 'Revisa la alternativa.',
      );
    }
  }

  function visitStep(next: PublishStep) {
    setInputError('');
    if (step === 'review' && next !== step) {
      save.reset();
      setPreview(undefined);
    }
    setStep(next);
  }

  function continueSchedule() {
    const values = form.getValues();
    if (!selected?.eligibleNow) {
      setInputError('Elige un vehículo habilitado para publicar.');
      return;
    }
    if (isRecurring) {
      const name = values.recurrenceName.trim();
      const startsOn = values.startsOn.trim();
      const endsOn = values.endsOn.trim();
      if (name.length < 2 || name.length > 80) {
        setInputError(
          'Indica un nombre para la recurrencia de 2 a 80 caracteres.',
        );
        return;
      }
      if (
        !isCalendarDate(startsOn) ||
        !isCalendarDate(endsOn) ||
        startsOn > endsOn
      ) {
        setInputError(
          'Indica un rango de fechas válido en formato AAAA-MM-DD.',
        );
        return;
      }
      if (!timePattern.test(values.time.trim()) || !selectedDays.length) {
        setInputError(
          'Indica la hora en formato HH:mm y selecciona al menos un día.',
        );
        return;
      }
    } else {
      const [day, hour, extra] = values.departureAt.split(' ');
      if (
        extra !== undefined ||
        !isCalendarDate(day) ||
        !hour ||
        !timePattern.test(hour)
      ) {
        setInputError('Indica la salida como AAAA-MM-DD HH:mm.');
        return;
      }
    }
    visitStep('route');
  }

  function continueRoute() {
    const values = form.getValues();
    try {
      const route = routePoints(values);
      [route.origin, ...route.stops, route.destination].forEach((point) =>
        previewPoint(point, catalog),
      );
      if (values.description.trim().length < 2)
        throw new Error('Describe las vías o referencias del recorrido.');
      const signed =
        selectedRoute?.key === JSON.stringify(route) &&
        selectedRoute.option.routingSelection;
      const duration = Number(values.estimatedDurationMinutes);
      if (
        !signed &&
        (!Number.isInteger(duration) || duration < 5 || duration > 360)
      )
        throw new Error('Indica una duración de 5 a 360 minutos enteros.');
      visitStep('terms');
    } catch (error) {
      setInputError(
        error instanceof Error
          ? error.message
          : 'Revisa los datos del recorrido.',
      );
    }
  }

  const review = form.handleSubmit(async (values) => {
    if (!selected) return;
    setInputError('');
    save.reset();
    try {
      const route = routePoints(values);
      const chosen =
        selectedRoute?.key === JSON.stringify(route)
          ? selectedRoute.option
          : undefined;
      const reviewedStops = previewStops(route, catalog);
      const offeredSeats = Number(values.offeredSeats);
      if (
        !Number.isInteger(offeredSeats) ||
        offeredSeats < 1 ||
        offeredSeats > selected.passengerCapacity
      )
        throw new Error(
          'Elige de una plaza al máximo permitido por el vehículo.',
        );
      if (
        withContribution &&
        expenseConcepts.some(([key]) => !/^\d+$/.test(values[key]))
      )
        throw new Error('Indica los gastos como pesos colombianos enteros.');
      const economics = {
        estimate: withContribution
          ? {
              fuelCop: Number(values.fuelCop),
              tollsCop: Number(values.tollsCop),
              parkingCop: Number(values.parkingCop),
            }
          : undefined,
        compensationMethods: withContribution ? methods : [],
      };
      const calculated = await economicsPreview.mutateAsync({
        offeredSeats,
        economics,
      });
      const recurrence = isRecurring
        ? {
            name: values.recurrenceName.trim(),
            startsOn: values.startsOn.trim(),
            endsOn: values.endsOn.trim(),
            time: values.time.trim(),
            weekdays: selectedDays.slice().sort((a, b) => a - b),
          }
        : undefined;
      if (
        recurrence &&
        (!recurrence.name ||
          !recurrence.startsOn ||
          !recurrence.endsOn ||
          !recurrence.time ||
          !selectedDays.length)
      )
        throw new Error(
          'Completa el nombre, las fechas, la hora y al menos un día de la recurrencia.',
        );
      const submittedMinutes =
        edited || !chosen?.routingSelection
          ? Number(values.estimatedDurationMinutes)
          : chosen.durationMinutes;
      const routingSelection =
        chosen?.durationMinutes === submittedMinutes
          ? chosen.routingSelection
          : undefined;
      setConfirmedPublic(false);
      setPreview({
        recurrence,
        economics: calculated,
        stops: reviewedStops,
        draft: {
          vehicleId: selected.id,
          departureAt: `${values.departureAt.replace(' ', 'T')}:00-05:00`,
          offeredSeats,
          economics,
          estimatedDurationMinutes: submittedMinutes,
          ruleIds,
          ...(selected.type === 'MOTORCYCLE' && { providesHelmet: helmet }),
          itinerary: {
            ...route,
            description: values.description.trim(),
            geometry: chosen?.geometry,
            routingSelection,
            maneuvers: routingSelection ? chosen?.maneuvers : undefined,
          },
        },
      });
      visitStep('review');
    } catch (error) {
      setInputError(
        error instanceof Error ? error.message : 'Revisa los datos del viaje.',
      );
    }
  });
  const activeIndex = publishSteps.findIndex(({ id }) => id === step);
  const activeTitle =
    step === 'review'
      ? edited
        ? 'Resumen de los cambios'
        : 'Resumen para publicar'
      : publishSteps[activeIndex].label;
  const busy = economicsPreview.isPending || save.isPending;
  const draft = preview?.draft;
  const previewVehicle =
    draft && vehicles.data?.find(({ id }) => id === draft.vehicleId);
  const notice =
    inputError ||
    (step === 'route' && options.error?.message) ||
    (step === 'review' && save.error?.message);
  const catalogs = [vehicles, points, rules];
  const failedCatalogs = catalogs.filter((query) => query.isError);

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
      scrollRef={scroll}
    >
      {catalogs.some((query) => query.isPending) && (
        <Text accessibilityLiveRegion="polite" style={w.note}>
          Cargando catálogos…
        </Text>
      )}
      {failedCatalogs.length > 0 && (
        <View style={w.group}>
          {failedCatalogs.map((query, index) => (
            <Text key={index} accessibilityRole="alert" style={w.alert}>
              {query.error?.message}
            </Text>
          ))}
          <Button
            title="Reintentar catálogos"
            secondary
            onPress={() =>
              failedCatalogs.forEach((query) => void query.refetch())
            }
          />
        </View>
      )}
      <View style={[w.layout, wide && w.horizontal]}>
        <View style={[w.main, wide && w.mainWide]}>
          <PublishProgress
            step={step}
            onStep={visitStep}
            locked={busy || save.isSuccess}
            compact={width < 620}
          />
          <View style={w.panel}>
            <View style={w.heading}>
              <Text nativeID="publish-step-count" style={w.stepCount}>
                Paso {activeIndex + 1} de {publishSteps.length}
              </Text>
              <View
                ref={heading}
                tabIndex={-1}
                accessible={Platform.OS === 'web' ? undefined : true}
                accessibilityLabel={
                  Platform.OS === 'web'
                    ? undefined
                    : `Paso ${activeIndex + 1} de ${publishSteps.length}. ${activeTitle}`
                }
                aria-describedby="publish-step-count"
                role="heading"
                aria-level={2}
              >
                <Text style={w.title}>{activeTitle}</Text>
              </View>
            </View>
            {step === 'schedule' && (
              <>
                <View style={w.group}>
                  <Text role="heading" aria-level={3} style={w.groupTitle}>
                    Vehículo propio
                  </Text>
                  {vehicles.data &&
                    !vehicles.data.some(({ eligibleNow }) => eligibleNow) && (
                      <Text>
                        Registra un vehículo y consulta los requisitos vigentes
                        para conducir.
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
                  {vehicles.data && selected && !selected.eligibleNow && (
                    <Text style={w.note}>
                      Este vehículo no está habilitado para publicar.
                    </Text>
                  )}
                  <Link href="/vehicles" style={s.link}>
                    Gestionar vehículos y licencia
                  </Link>
                </View>

                <View style={[w.group, w.divider]}>
                  <Text role="heading" aria-level={3} style={w.groupTitle}>
                    Programación
                  </Text>
                  {!schedule && !edited && (
                    <View style={w.group}>
                      <Choice
                        label="Viaje individual"
                        checked={!isRecurring}
                        onPress={() => setIsRecurring(false)}
                      />
                      <Choice
                        label="Viaje recurrente"
                        checked={isRecurring}
                        onPress={() => setIsRecurring(true)}
                      />
                    </View>
                  )}
                  {isRecurring ? (
                    <View style={w.group}>
                      <Field
                        control={form.control}
                        name="recurrenceName"
                        label="Nombre de la recurrencia"
                      />
                      <Field
                        control={form.control}
                        name="startsOn"
                        label="Fecha inicial (AAAA-MM-DD)"
                      />
                      <Field
                        control={form.control}
                        name="endsOn"
                        label="Fecha final (AAAA-MM-DD)"
                      />
                      <Field
                        control={form.control}
                        name="time"
                        label="Hora Colombia (HH:mm)"
                      />
                      <View style={w.inline}>
                        {weekdays.map((name, index) => {
                          const day = index + 1;
                          return (
                            <Choice
                              key={day}
                              label={name}
                              checkbox
                              checked={selectedDays.includes(day)}
                              onPress={() =>
                                setSelectedDays((days) =>
                                  days.includes(day)
                                    ? days.filter((item) => item !== day)
                                    : [...days, day],
                                )
                              }
                            />
                          );
                        })}
                      </View>
                    </View>
                  ) : (
                    <Field
                      control={form.control}
                      name="departureAt"
                      label="Salida Colombia (AAAA-MM-DD HH:mm)"
                    />
                  )}

                  {!isRecurring && (
                    <Text style={w.note}>
                      Programa la salida con más de 30 minutos de anticipación.
                    </Text>
                  )}
                </View>
              </>
            )}
            {step === 'route' && (
              <>
                <View style={w.group}>
                  <Text role="heading" aria-level={3} style={w.groupTitle}>
                    Sentido del viaje
                  </Text>
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
                  name="description"
                  label="Vías y referencias del recorrido"
                />
                <Text style={s.text}>
                  Puedes publicar el itinerario descrito o elegir una
                  alternativa vial si el proveedor está disponible.
                </Text>
                <Text role="heading" aria-level={3} style={w.groupTitle}>
                  Paradas intermedias
                </Text>
                {stops.fields.map((stop, index) => (
                  <View key={stop.id} style={[w.group, w.divider]}>
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
                <Field
                  control={form.control}
                  name="estimatedDurationMinutes"
                  label="Duración declarada (minutos)"
                />

                <View style={[w.group, w.divider]}>
                  <Text role="heading" aria-level={3} style={w.groupTitle}>
                    Alternativas viales
                  </Text>
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
                      !selected?.eligibleNow ||
                      !routingConsent ||
                      options.isPending
                    }
                    onPress={() => {
                      void suggest();
                    }}
                  />
                  <RouteAlternatives
                    control={form.control}
                    catalog={catalog}
                    selectionKey={selectedRoute?.key}
                    selected={selectedRoute?.option}
                    requested={options.variables}
                    options={options.data}
                    onChoose={chooseOption}
                  />
                </View>
              </>
            )}
            {step === 'terms' && (
              <>
                <View style={w.group}>
                  <Field
                    control={form.control}
                    name="offeredSeats"
                    label="Cupos ofrecidos"
                  />

                  {selected && (
                    <Text style={w.note}>
                      Máximo {selected.passengerCapacity}{' '}
                      {selected.passengerCapacity === 1 ? 'plaza' : 'plazas'}{' '}
                      para este vehículo.
                    </Text>
                  )}
                  {selected?.type === 'MOTORCYCLE' && (
                    <Choice
                      checkbox
                      label="Casco de pasajero incluido"
                      checked={helmet}
                      onPress={() => setHelmet(!helmet)}
                    />
                  )}
                </View>
                <View style={w.group}>
                  <Text role="heading" aria-level={3} style={w.groupTitle}>
                    Aporte del viaje
                  </Text>
                  <Choice
                    label="Viaje gratuito"
                    checked={!withContribution}
                    onPress={() => setWithContribution(false)}
                  />
                  <Choice
                    label="Calcular aporte con gastos declarados"
                    checked={withContribution}
                    onPress={() => setWithContribution(true)}
                  />
                  {withContribution && (
                    <>
                      {expenseConcepts.map(([name, label]) => (
                        <Field
                          key={name}
                          control={form.control}
                          name={name}
                          label={`${label} en COP`}
                        />
                      ))}
                      <Text style={s.text}>
                        Selecciona hasta dos métodos si el cálculo produce un
                        aporte.
                      </Text>
                      {(Object.keys(methodLabel) as CompensationMethod[]).map(
                        (method) => (
                          <Choice
                            key={method}
                            label={methodLabel[method]}
                            checkbox
                            checked={methods.includes(method)}
                            onPress={() =>
                              setMethods((before) =>
                                before.includes(method)
                                  ? before.filter((item) => item !== method)
                                  : before.length < 2
                                    ? [...before, method]
                                    : before,
                              )
                            }
                          />
                        ),
                      )}
                    </>
                  )}
                </View>
                <View style={w.group}>
                  <Text role="heading" aria-level={3} style={w.groupTitle}>
                    Reglas de convivencia
                  </Text>
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
              </>
            )}
            {step === 'review' && draft && preview && (
              <>
                <View style={w.group}>
                  {preview.recurrence && (
                    <Text style={w.groupTitle}>{preview.recurrence.name}</Text>
                  )}
                  <Text style={s.text}>
                    {previewVehicle?.plate} · {draft.offeredSeats}{' '}
                    {draft.offeredSeats === 1 ? 'plaza' : 'plazas'} ·{' '}
                    {draft.estimatedDurationMinutes} min
                  </Text>
                  {preview.recurrence ? (
                    <Text style={s.text}>
                      {preview.recurrence.startsOn} a{' '}
                      {preview.recurrence.endsOn} · {preview.recurrence.time}{' '}
                      Colombia
                      {'\n'}
                      {preview.recurrence.weekdays
                        .map((day) => weekdays[day - 1])
                        .join(', ')}
                    </Text>
                  ) : (
                    <Text style={s.text}>
                      {draft.departureAt.slice(0, 16).replace('T', ' ')}{' '}
                      Colombia
                    </Text>
                  )}
                  {previewVehicle?.type === 'MOTORCYCLE' && (
                    <Text style={s.text}>
                      {draft.providesHelmet
                        ? 'Casco incluido'
                        : 'Cada pasajero debe traer casco'}
                    </Text>
                  )}
                </View>
                <RoutePreview
                  geometry={draft.itinerary.geometry ?? null}
                  description={draft.itinerary.description}
                  stops={preview.stops}
                />
                {!save.data && <EconomicsPreview preview={preview.economics} />}
                {save.data?.trip && (
                  <EconomicTerms terms={save.data.trip.economics} />
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
                {save.isSuccess ? (
                  <Text accessibilityLiveRegion="polite" style={w.success}>
                    {save.data?.schedule
                      ? 'Recurrencia guardada. Consulta las fechas generadas en Viajes recurrentes.'
                      : edited
                        ? 'Cambios guardados en el viaje.'
                        : 'Viaje publicado. Ya aparece en Mis viajes.'}
                  </Text>
                ) : (
                  <Choice
                    label="Confirmo que la ruta y los puntos son públicos y no incluyen domicilios ni datos privados"
                    checkbox
                    checked={confirmedPublic}
                    onPress={() => setConfirmedPublic(!confirmedPublic)}
                  />
                )}
              </>
            )}
            {notice && (
              <Text accessibilityRole="alert" style={w.alert}>
                {notice}
              </Text>
            )}
            {!save.isSuccess && (
              <View style={[w.actions, w.divider]}>
                {step !== 'schedule' && (
                  <View style={w.action}>
                    <Button
                      title={
                        step === 'review'
                          ? edited
                            ? 'Volver a editar'
                            : 'Editar antes de publicar'
                          : 'Atrás'
                      }
                      secondary
                      disabled={busy}
                      onPress={() =>
                        visitStep(publishSteps[activeIndex - 1].id)
                      }
                    />
                  </View>
                )}
                {step === 'schedule' && (
                  <View style={w.action}>
                    <Button
                      title="Continuar"
                      disabled={!vehicles.data}
                      onPress={continueSchedule}
                    />
                  </View>
                )}
                {step === 'route' && (
                  <View style={w.action}>
                    <Button
                      title="Continuar"
                      disabled={!points.data}
                      onPress={continueRoute}
                    />
                  </View>
                )}
                {step === 'terms' && (
                  <View style={w.action}>
                    <Button
                      title={
                        economicsPreview.isPending
                          ? 'Calculando…'
                          : 'Revisar viaje'
                      }
                      disabled={
                        !selected?.eligibleNow ||
                        !rules.data ||
                        !points.data ||
                        busy
                      }
                      onPress={() => void review()}
                    />
                  </View>
                )}
                {step === 'review' && preview && (
                  <View style={w.action}>
                    <Button
                      title={
                        save.isPending
                          ? 'Guardando…'
                          : preview.recurrence
                            ? 'Guardar recurrencia'
                            : edited
                              ? 'Confirmar cambios'
                              : 'Confirmar publicación'
                      }
                      disabled={!confirmedPublic || busy}
                      onPress={() => save.mutate(preview)}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
        <View style={[w.aside, wide && w.asideWide]}>
          <PublishSummary
            control={form.control}
            catalog={catalog}
            plate={selected?.plate}
            isRecurring={isRecurring}
          />
          <View style={w.group}>
            <Link href="/recurring-trips" style={s.link}>
              Viajes recurrentes
            </Link>
            <Link href="/my-trips" style={s.link}>
              Ver mis viajes publicados
            </Link>
          </View>
        </View>
      </View>
    </ProtectedPage>
  );
}
