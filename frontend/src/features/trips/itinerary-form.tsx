import { Pressable, Text, View } from 'react-native';
import { useController, type Control } from 'react-hook-form';
import { z } from 'zod';
import type {
  CampusMeetingPoint,
  MeetingPointInput,
  RouteGeometry,
  StopAccess,
} from '@ruteam/contracts';
import { Field } from '../../components/forms/field';
import { formStyles as s } from '../../components/ui/protected-page';
import { accessLabel } from './route-preview';

interface PointValue {
  campusPointId: string;
  label: string;
  latitude: string;
  longitude: string;
  instructions: string;
  campusReference: boolean;
}
export interface PublishFormValues {
  origin: PointValue;
  destination: PointValue;
  stops: (PointValue & { access: StopAccess })[];
  departureAt: string;
  estimatedDurationMinutes: string;
  offeredSeats: string;
  description: string;
  geometry: string;
}
export const emptyPoint: PointValue = {
  campusPointId: '',
  label: '',
  latitude: '',
  longitude: '',
  instructions: '',
  campusReference: false,
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
}: {
  title: string;
  name: 'origin' | 'destination' | `stops.${number}`;
  control: Control<PublishFormValues>;
  catalog: CampusMeetingPoint[];
}) {
  const { field: point } = useController({
    control,
    name: `${name}.campusPointId`,
  });
  const { field: campus } = useController({
    control,
    name: `${name}.campusReference`,
  });
  const selected = catalog.find(({ id }) => id === point.value);
  return (
    <View style={s.section}>
      <Text style={s.title}>{title}</Text>
      <Choice
        label={`${title} personalizado`}
        checked={!point.value}
        onPress={() => point.onChange('')}
      />
      {catalog
        .filter(({ kind, latitude }) => kind !== 'CAMPUS' && latitude !== null)
        .map((item) => (
          <Choice
            key={item.id}
            label={`${title} · ${item.name}${item.demo ? ' · DEMO' : ''}`}
            checked={point.value === item.id}
            onPress={() => point.onChange(item.id)}
          />
        ))}
      {selected ? (
        <Text style={s.text}>
          {[
            selected.description,
            selected.accessReference,
            selected.level && `Nivel ${selected.level}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : (
        <>
          <Field
            control={control}
            name={`${name}.label`}
            label={`Nombre público · ${title}`}
          />
          <Field
            control={control}
            name={`${name}.latitude`}
            label={`Latitud · ${title}`}
          />
          <Field
            control={control}
            name={`${name}.longitude`}
            label={`Longitud · ${title}`}
          />
          <Choice
            label={`${title} personalizado dentro de la USC`}
            checked={campus.value}
            checkbox
            onPress={() => campus.onChange(!campus.value)}
          />
        </>
      )}
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
}: {
  control: Control<PublishFormValues>;
  index: number;
}) {
  const { field } = useController({ control, name: `stops.${index}.access` });
  return (
    <View style={{ gap: 8 }}>
      {(Object.keys(accessLabel) as StopAccess[]).map((access) => (
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

function coordinate(value: string, limit: number): number {
  if (
    !value.trim() ||
    !Number.isFinite(Number(value)) ||
    Math.abs(Number(value)) > limit
  )
    throw new Error(
      'Completa las coordenadas con números dentro del rango válido.',
    );
  return Number(value);
}
export function pointInput(value: PointValue): MeetingPointInput {
  const instructions = value.instructions.trim() || undefined;
  if (value.campusPointId)
    return { campusPointId: value.campusPointId, instructions };
  const latitude = coordinate(value.latitude, 90);
  const longitude = coordinate(value.longitude, 180);
  if (value.label.trim().length < 2 || !instructions)
    throw new Error(
      'Indica un nombre público e instrucciones para cada punto personalizado.',
    );
  return {
    label: value.label.trim(),
    latitude,
    longitude,
    instructions,
    ...(value.campusReference ? { campusReference: 'USC' } : {}),
  };
}

const geometrySchema = z.strictObject({
  type: z.literal('LineString'),
  coordinates: z
    .array(
      z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    )
    .min(2)
    .max(500),
});
export function parseGeometry(value: string): RouteGeometry | undefined {
  if (!value.trim()) return undefined;
  try {
    return geometrySchema.parse(JSON.parse(value));
  } catch {
    throw new Error(
      'Adjunta una LineString GeoJSON válida de hasta 500 pares [longitud, latitud].',
    );
  }
}
