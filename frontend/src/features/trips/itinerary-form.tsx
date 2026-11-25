import { Pressable, Text, View } from 'react-native';
import { useController, type Control } from 'react-hook-form';
import type {
  CampusMeetingPoint,
  MeetingPointInput,
  TripDirection,
  StopAccess,
} from '@ruteam/contracts';
import { Field } from '../../components/forms/field';
import { formStyles as s } from '../../components/ui/protected-page';
import { accessLabel } from './route-preview';
import { MeetingMapPicker, type Coordinates } from './meeting-map-picker';

interface PointValue {
  campusPointId: string;
  label: string;
  coordinates?: Coordinates;
  instructions: string;
}
export interface PublishFormValues {
  origin: PointValue;
  destination: PointValue;
  stops: (PointValue & { access: StopAccess })[];
  departureAt: string;
  estimatedDurationMinutes: string;
  offeredSeats: string;
  description: string;
  direction: TripDirection;
}
export const emptyPoint: PointValue = {
  campusPointId: '',
  label: '',
  instructions: '',
};

export function Choice({
  label,
  checked,
  onPress,
  checkbox = false,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  checkbox?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={checkbox ? 'checkbox' : 'radio'}
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[s.choice, checked && s.selected]}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}

export function PointEditor({
  title,
  name,
  control,
  catalog,
  institutional,
}: {
  title: string;
  name: 'origin' | 'destination' | `stops.${number}`;
  control: Control<PublishFormValues>;
  catalog: CampusMeetingPoint[];
  institutional?: boolean;
}) {
  const { field: point } = useController({
    control,
    name: `${name}.campusPointId`,
  });
  const { field: coordinates } = useController({
    control,
    name: `${name}.coordinates`,
  });
  const selected = catalog.find(({ id }) => id === point.value);
  return (
    <View style={s.section}>
      <Text style={s.title}>{title}</Text>
      {institutional !== false && (
        <>
          {institutional === undefined && (
            <Choice
              label={`${title} externo`}
              checked={!point.value}
              onPress={() => point.onChange('')}
            />
          )}
          {catalog
            .filter(
              ({ kind, latitude, longitude }) =>
                kind !== 'CAMPUS' && latitude !== null && longitude !== null,
            )
            .map((item) => (
              <Choice
                key={item.id}
                label={`${title} · ${item.name}`}
                checked={point.value === item.id}
                onPress={() => point.onChange(item.id)}
              />
            ))}
          {selected && (
            <Text style={s.text}>
              {[
                selected.description,
                selected.accessReference,
                selected.level && `Nivel ${selected.level}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </>
      )}
      <Field
        control={control}
        name={`${name}.label`}
        label={
          selected || institutional
            ? `Punto de encuentro libre · ${title}`
            : `Nombre público · ${title}`
        }
      />
      {(institutional === false ||
        (institutional === undefined && !selected)) &&
        (() => {
          const reference = catalog.find(
            ({ latitude, longitude }) =>
              latitude !== null && longitude !== null,
          );
          return reference?.latitude != null && reference.longitude != null ? (
            <MeetingMapPicker
              title={title}
              reference={{
                latitude: reference.latitude,
                longitude: reference.longitude,
              }}
              value={coordinates.value}
              onSelect={coordinates.onChange}
            />
          ) : (
            <Text style={s.text}>
              No hay referencia del campus para inicializar el mapa.
            </Text>
          );
        })()}
      <Field
        control={control}
        name={`${name}.instructions`}
        label={`Instrucciones · ${title}`}
      />
    </View>
  );
}

export function StopAccessEditor({
  control,
  index,
  direction,
}: {
  control: Control<PublishFormValues>;
  index: number;
  direction: TripDirection;
}) {
  const { field } = useController({ control, name: `stops.${index}.access` });
  return (
    <View style={{ gap: 8 }}>
      {(Object.keys(accessLabel) as StopAccess[])
        .filter(
          (access) =>
            direction === 'HACIA_USC' ||
            access === 'DROPOFF' ||
            access === 'WAYPOINT',
        )
        .map((access) => (
          <Choice
            key={access}
            label={`${accessLabel[access]} · Parada ${index + 1}`}
            checked={field.value === access}
            onPress={() => field.onChange(access)}
          />
        ))}
    </View>
  );
}

export function pointInput(
  value: PointValue,
  institutional?: boolean,
): MeetingPointInput {
  const instructions = value.instructions.trim() || undefined;
  const label = value.label.trim();
  if (institutional !== false && value.campusPointId)
    return {
      campusPointId: value.campusPointId,
      label: label || undefined,
      instructions,
    };
  if (institutional)
    throw new Error('Elige una referencia USC para el punto de encuentro.');
  if (!value.coordinates)
    throw new Error(
      'Selecciona una ubicación en el mapa para cada punto externo.',
    );
  if (label.length < 2 || !instructions)
    throw new Error(
      'Indica un nombre público e instrucciones para cada punto externo.',
    );
  return { label, ...value.coordinates, instructions };
}
