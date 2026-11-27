import type { CampusMeetingPoint, VehicleSummary } from '@ruteam/contracts';
import { StyleSheet } from 'react-native';
import { useWatch, type Control } from 'react-hook-form';
import { Icon } from '../../components/ui/icon';
import { Pressable, Text, View } from '../../theme/primitives';
import { colors, filledPrimary, radii } from '../../theme/tokens';
import type { PublishFormValues } from './itinerary-form';

export const publishSteps = [
  { id: 'schedule', label: 'Vehículo y horario', shortLabel: 'Horario' },
  { id: 'route', label: 'Recorrido', shortLabel: 'Recorrido' },
  { id: 'terms', label: 'Condiciones', shortLabel: 'Condiciones' },
  { id: 'review', label: 'Revisión', shortLabel: 'Revisión' },
] as const;

export type PublishStep = (typeof publishSteps)[number]['id'];
const summaryFields = [
  'direction',
  'origin',
  'destination',
  'offeredSeats',
  'departureAt',
  'time',
] as const;

export function PublishProgress({
  step,
  onStep,
  locked,
  compact,
}: {
  step: PublishStep;
  onStep: (step: PublishStep) => void;
  locked: boolean;
  compact: boolean;
}) {
  const activeIndex = publishSteps.findIndex(({ id }) => id === step);
  return (
    <View style={p.progress} accessibilityLabel="Pasos de publicación">
      {publishSteps.map(({ id, label, shortLabel }, index) => {
        const current = index === activeIndex;
        const completed = index < activeIndex;
        const content = (
          <>
            <View style={[p.stepNumber, current && p.stepNumberActive]}>
              {completed ? (
                <Icon name="check" size={15} />
              ) : (
                <Text style={[p.stepNumberText, current && p.stepNumberInk]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[p.stepLabel, current && p.stepLabelActive]}>
              {compact ? shortLabel : label}
            </Text>
          </>
        );
        if (completed && !locked)
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Volver a ${label.toLowerCase()}`}
              onPress={() => onStep(id)}
              style={({ pressed }) => [p.step, pressed && p.stepPressed]}
            >
              {content}
            </Pressable>
          );
        return (
          <View
            key={id}
            accessible
            accessibilityLabel={`${label}, paso ${index + 1}${current ? ', actual' : ''}`}
            style={[p.step, current && p.stepCurrent]}
          >
            {content}
          </View>
        );
      })}
    </View>
  );
}

export function PublishSummary({
  control,
  catalog,
  plate,
  isRecurring,
}: {
  control: Control<PublishFormValues>;
  catalog: CampusMeetingPoint[];
  plate?: VehicleSummary['plate'];
  isRecurring: boolean;
}) {
  const [direction, origin, destination, seats, departureAt, time] = useWatch({
    control,
    name: summaryFields,
  });
  function pointLabel(
    point: PublishFormValues['origin'],
    institutional: boolean,
  ) {
    const label = point.label.trim();
    if (institutional) {
      const campus = catalog.find(({ id }) => id === point.campusPointId);
      return campus
        ? [label, campus.name].filter(Boolean).join(' · ')
        : 'Referencia USC por elegir';
    }
    return label || 'Punto público por elegir';
  }

  return (
    <View style={p.summary}>
      <Text role="heading" aria-level={2} style={p.groupTitle}>
        Resumen del viaje
      </Text>
      <View style={p.summaryRoute}>
        <View style={p.summaryPoint}>
          <View style={[p.routeMarker, p.originMarker]} />
          <View style={p.summaryValue}>
            <Text style={p.caption}>Origen</Text>
            <Text style={p.summaryText}>
              {pointLabel(origin, direction === 'DESDE_USC')}
            </Text>
          </View>
        </View>
        <View style={p.summaryPoint}>
          <View style={p.routeMarker} />
          <View style={p.summaryValue}>
            <Text style={p.caption}>Destino</Text>
            <Text style={p.summaryText}>
              {pointLabel(destination, direction === 'HACIA_USC')}
            </Text>
          </View>
        </View>
      </View>
      <View style={p.summaryPoint}>
        <Icon name="calendar" size={17} />
        <View style={p.summaryValue}>
          <Text style={p.caption}>
            {isRecurring ? 'Horario recurrente' : 'Salida'}
          </Text>
          <Text style={p.summaryText}>
            {(isRecurring ? time : departureAt) || 'Por indicar'}
          </Text>
        </View>
      </View>
      <View style={p.summaryPoint}>
        <Icon name="users" size={17} />
        <View style={p.summaryValue}>
          <Text style={p.caption}>Vehículo y cupos</Text>
          <Text style={p.summaryText}>
            {[plate, seats && `${seats} ${seats === '1' ? 'plaza' : 'plazas'}`]
              .filter(Boolean)
              .join(' · ') || 'Por elegir'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const publishStyles = StyleSheet.create({
  layout: { gap: 16, alignItems: 'stretch' },
  horizontal: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { gap: 16, minWidth: 0 },
  mainWide: { flex: 1 },
  aside: { gap: 10, minWidth: 0 },
  asideWide: { width: 284 },
  panel: {
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  heading: { gap: 3, alignSelf: 'flex-start' },
  stepCount: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: '800' },
  groupTitle: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  group: { gap: 10 },
  divider: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  action: { flexGrow: 1, flexBasis: 145 },
  alert: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  success: {
    color: colors.success,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
});

const p = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.panel,
    padding: 5,
    gap: 2,
  },
  step: {
    flex: 1,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 3,
    borderRadius: radii.control,
  },
  stepCurrent: { backgroundColor: colors.selected },
  stepPressed: { backgroundColor: colors.background },
  stepLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLabelActive: { color: colors.primary, fontWeight: '800' },
  stepNumber: {
    width: 23,
    height: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.background,
  },
  stepNumberActive: { backgroundColor: filledPrimary },
  stepNumberText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  stepNumberInk: { color: colors.onPrimary },
  summary: {
    gap: 13,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  groupTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  summaryRoute: {
    gap: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 13,
  },
  summaryPoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  summaryValue: { flex: 1, minWidth: 0, gap: 2 },
  summaryText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  caption: { color: colors.muted, fontSize: 12 },
  routeMarker: {
    width: 12,
    height: 12,
    marginTop: 3,
    marginHorizontal: 2,
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: radii.round,
  },
  originMarker: { borderColor: colors.turquoise },
});
