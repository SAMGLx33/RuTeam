import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useController, type Control } from 'react-hook-form';
import type {
  CampusMeetingPoint,
  MeetingPointInput,
  TripDirection,
  StopAccess,
} from '@ruteam/contracts';
import { Field } from '../../components/forms/field';
import { PlaceSearch } from '../../components/forms/place-search';
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
  const { field: label } = useController({
    control,
    name: `${name}.label`,
  });
  const [searchFocus, setSearchFocus] = useState<Coordinates>();
  const selected = catalog.find(({ id }) => id === point.value);
  const external =
    institutional === false || (institutional === undefined && !selected);
  const groups = new Map<string | null, CampusMeetingPoint[]>();
  for (const item of catalog) {
    const site = item.campusSiteId ?? null;
    const group = groups.get(site) ?? [];
    group.push(item);
    groups.set(site, group);
  }
  const reference =
    searchFocus ??
    catalog.find(
      ({ latitude, longitude }) => latitude !== null && longitude !== null,
    );
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
          {[...groups].map(([site, items]) => (
            <View key={site ?? 'legacy'} style={{ gap: 8 }}>
              {site && (
                <Text style={s.text}>
                  {items.find(({ kind }) => kind === 'CAMPUS')?.name ??
                    'Sede USC'}
                </Text>
              )}
              {items.map((item) =>
                item.latitude !== null && item.longitude !== null ? (
                  <Choice
                    key={item.id}
                    label={`${title} · ${item.name}`}
                    checked={point.value === item.id}
                    onPress={() => point.onChange(item.id)}
                  />
                ) : item.kind === 'CAMPUS' && site ? (
                  <Text key={item.id} style={s.text}>
                    {item.name} · ubicación aún por configurar
                  </Text>
                ) : null,
              )}
            </View>
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
      {external && (
        <>
          <PlaceSearch
            title={title}
            onSelect={({ latitude, longitude, label: name }) => {
              const position = { latitude, longitude };
              coordinates.onChange(position);
              label.onChange(name);
              setSearchFocus(position);
            }}
          />
          {reference?.latitude != null && reference.longitude != null ? (
            <MeetingMapPicker
              title={title}
              key={
                searchFocus
                  ? `${searchFocus.latitude}:${searchFocus.longitude}`
                  : 'default'
              }
              reference={{
                latitude: reference.latitude,
                longitude: reference.longitude,
              }}
              value={coordinates.value}
              initiallyOpen={!!searchFocus}
              onSelect={coordinates.onChange}
            />
          ) : (
            <Text style={s.text}>
              El mapa se puede centrar al elegir un resultado.
            </Text>
          )}
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
      'Busca o marca en el mapa una ubicación para cada punto externo.',
    );
  if (label.length < 2 || !instructions)
    throw new Error(
      'Indica un nombre público e instrucciones para cada punto externo.',
    );
  return { label, ...value.coordinates, instructions };
}
