import { Link, Text, TextInput, View } from '../../theme/primitives';
import { FrequentPlacePicker } from './frequent-place-picker';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Switch } from 'react-native';
import type {
  CampusMeetingPoint,
  MobilityPreferenceInput,
  MobilityPreferenceView,
  TripDirection,
  VehicleType,
} from '@ruteam/contracts';
import { PlaceSearch } from '../../components/forms/place-search';
import { accountStyles } from '../../components/ui/account-page';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { api } from '../../services/api/client';
import { useSession } from '../../providers/session-provider';
import { colors } from '../../theme/tokens';
import { Choice } from '../trips/itinerary-form';
import {
  MeetingMapPicker,
  type Coordinates,
} from '../trips/meeting-map-picker';
import { directionLabel } from '../trips/trip-feed';
import { pesos } from '../expenses/economic-terms';

const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const radii = [0.25, 0.5, 1, 2];
function minutes(value: string) {
  const [hours, minute] = value.split(':').map(Number);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? hours * 60 + minute : null;
}
function clock(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function PreferenceEditor({
  entry,
  campuses,
  reference,
  onClose,
}: {
  entry?: MobilityPreferenceView;
  campuses: CampusMeetingPoint[];
  reference: Coordinates | undefined;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [label, setLabel] = useState(entry?.label ?? '');
  const [place, setPlace] = useState(entry?.placeLabel ?? '');
  const [campusId, setCampus] = useState(
    entry?.campusPointId ?? campuses[0]?.id ?? '',
  );
  const [direction, setDirection] = useState<TripDirection>(
    entry?.direction ?? 'HACIA_USC',
  );
  const [start, setStart] = useState(
    entry ? clock(entry.startMinute) : '07:00',
  );
  const [end, setEnd] = useState(entry ? clock(entry.endMinute) : '09:00');
  const [days, setDays] = useState(entry?.days ?? [1, 2, 3, 4, 5]);
  const [radiusKm, setRadius] = useState(entry?.radiusKm ?? 0.5);
  const [vehicles, setVehicles] = useState<VehicleType[]>(
    entry?.vehicleTypes ?? ['CAR', 'MOTORCYCLE'],
  );
  const [maxContribution, setMaxContribution] = useState(
    entry?.maxContributionCop?.toString() ?? '',
  );
  const normalizedContribution = maxContribution.trim();
  const contributionIsValid =
    !normalizedContribution ||
    (/^\d+$/.test(normalizedContribution) &&
      Number(normalizedContribution) <= 2_147_483_647);
  const [notificationsEnabled, setNotices] = useState(
    entry?.notificationsEnabled ?? true,
  );
  const [active, setActive] = useState(entry?.active ?? true);
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>(
    entry && entry.latitude !== null && entry.longitude !== null
      ? { latitude: entry.latitude, longitude: entry.longitude }
      : undefined,
  );
  const [mapOpen, setMapOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState<Coordinates>();
  const mapReference = searchFocus ?? reference;
  const [remove, setRemove] = useState(false);
  const startMinute = minutes(start);
  const endMinute = minutes(end);
  const valid =
    label.trim().length >= 2 &&
    place.trim().length >= 2 &&
    !!campusId &&
    days.length > 0 &&
    startMinute !== null &&
    endMinute !== null &&
    startMinute <= endMinute &&
    vehicles.length > 0 &&
    contributionIsValid;
  const base = '/mobility/preferences';
  const path = entry ? `${base}/${entry.id}` : base;
  const mutation = useMutation({
    mutationFn: (body: MobilityPreferenceInput | null) =>
      body
        ? api(path, { method: entry ? 'PATCH' : 'POST', body })
        : api(path, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['mobility'] });
      void client.invalidateQueries({ queryKey: ['trip-feed'] });
      onClose();
    },
  });

  function save() {
    if (!valid || startMinute === null || endMinute === null) return;
    mutation.mutate({
      label: label.trim(),
      placeLabel: place.trim(),
      campusPointId: campusId,
      direction,
      days,
      startMinute,
      endMinute,
      radiusKm,
      vehicleTypes: vehicles,
      maxContributionCop: normalizedContribution
        ? Number(normalizedContribution)
        : null,
      notificationsEnabled,
      active,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    });
  }

  return (
    <View style={s.section}>
      <Text style={s.title}>
        {entry ? 'Editar preferencia' : 'Nueva preferencia'}
      </Text>
      <Text style={accountStyles.label}>Nombre de la preferencia</Text>
      <TextInput
        accessibilityLabel="Nombre de la preferencia"
        style={accountStyles.input}
        value={label}
        maxLength={80}
        onChangeText={setLabel}
        placeholder="Ida a clase"
      />
      <Text style={accountStyles.label}>Zona habitual</Text>
      <TextInput
        accessibilityLabel="Zona habitual"
        style={accountStyles.input}
        value={place}
        maxLength={160}
        onChangeText={(value) => {
          setPlace(value);
          setCoordinates(undefined);
        }}
        placeholder="Barrio o lugar frecuente"
      />
      <Text style={s.text}>
        {coordinates
          ? 'Zona aproximada marcada.'
          : 'Marca una zona aproximada para recibir coincidencias por cercanía.'}
      </Text>
      <FrequentPlacePicker
        onSelect={({ latitude, longitude, placeLabel }) => {
          setPlace(placeLabel);
          setCoordinates({ latitude, longitude });
          setSearchFocus({ latitude, longitude });
        }}
      />
      <PlaceSearch
        title="Zona habitual"
        onSelect={({ latitude, longitude, label: name }) => {
          const position = { latitude, longitude };
          setPlace(name);
          setCoordinates(position);
          setSearchFocus(position);
          setMapOpen(true);
        }}
      />
      <Button
        title={mapOpen ? 'Ocultar mapa' : 'Elegir zona en el mapa'}
        secondary
        onPress={() => setMapOpen(!mapOpen)}
      />
      {mapOpen &&
        (mapReference ? (
          <MeetingMapPicker
            title="Zona habitual"
            key={
              searchFocus
                ? `${searchFocus.latitude}:${searchFocus.longitude}`
                : 'default'
            }
            reference={mapReference}
            value={coordinates}
            initiallyOpen={!!searchFocus}
            onSelect={setCoordinates}
          />
        ) : (
          <Text style={s.text}>El mapa no está disponible para esta zona.</Text>
        ))}
      {!!coordinates && (
        <Button
          title="Quitar marcador"
          secondary
          onPress={() => setCoordinates(undefined)}
        />
      )}
      <Text style={accountStyles.label}>Campus habitual</Text>
      <View style={styles.choices}>
        {campuses.map((campus) => (
          <Choice
            key={campus.id}
            label={campus.name}
            checked={campus.id === campusId}
            onPress={() => setCampus(campus.id)}
          />
        ))}
      </View>
      <Text style={accountStyles.label}>Sentido</Text>
      <View style={styles.choices}>
        {(['HACIA_USC', 'DESDE_USC'] as const).map((value) => (
          <Choice
            key={value}
            label={directionLabel[value]}
            checked={direction === value}
            onPress={() => setDirection(value)}
          />
        ))}
      </View>
      <Text style={accountStyles.label}>Días</Text>
      <View style={styles.choices}>
        {dayLabels.map((day, i) => (
          <Choice
            key={day}
            label={day}
            checked={days.includes(i + 1)}
            onPress={() =>
              setDays(
                days.includes(i + 1)
                  ? days.filter((item) => item !== i + 1)
                  : [...days, i + 1],
              )
            }
          />
        ))}
      </View>
      <Text style={accountStyles.label}>Hora de salida en Colombia</Text>
      <View style={styles.choices}>
        <TextInput
          accessibilityLabel="Hora desde"
          style={[accountStyles.input, styles.time]}
          value={start}
          maxLength={5}
          onChangeText={setStart}
          placeholder="Desde HH:mm"
        />
        <TextInput
          accessibilityLabel="Hora hasta"
          style={[accountStyles.input, styles.time]}
          value={end}
          maxLength={5}
          onChangeText={setEnd}
          placeholder="Hasta HH:mm"
        />
      </View>
      {(startMinute === null ||
        endMinute === null ||
        startMinute > endMinute) && (
        <Text style={s.error}>
          Indica una franja válida en formato HH:mm. Si cruza medianoche, crea
          dos preferencias.
        </Text>
      )}
      <Text style={accountStyles.label}>
        Distancia hasta un punto de encuentro
      </Text>
      <View style={styles.choices}>
        {radii.map((radius) => (
          <Choice
            key={radius}
            label={radius >= 1 ? `${radius} km` : `${radius * 1000} m`}
            checked={radius === radiusKm}
            onPress={() => setRadius(radius)}
          />
        ))}
      </View>
      <Text style={accountStyles.label}>Tipo de vehículo</Text>
      <View style={styles.choices}>
        {(['CAR', 'MOTORCYCLE'] as const).map((type) => (
          <Choice
            key={type}
            label={type === 'CAR' ? 'Auto' : 'Moto'}
            checked={vehicles.includes(type)}
            onPress={() =>
              setVehicles(
                vehicles.includes(type)
                  ? vehicles.filter((value) => type !== value)
                  : [...vehicles, type],
              )
            }
          />
        ))}
      </View>
      <Text style={accountStyles.label}>
        Aporte máximo sugerido en COP (opcional)
      </Text>
      <TextInput
        accessibilityLabel="Aporte máximo sugerido en COP"
        style={accountStyles.input}
        keyboardType="number-pad"
        value={maxContribution}
        onChangeText={setMaxContribution}
        maxLength={10}
      />
      {!contributionIsValid && (
        <Text style={s.error}>Indica un valor entero válido en pesos.</Text>
      )}
      <View style={styles.toggle}>
        <Text style={s.text}>Recibir avisos de viajes compatibles</Text>
        <Switch
          accessibilityLabel="Recibir avisos de viajes compatibles"
          value={notificationsEnabled}
          onValueChange={setNotices}
          trackColor={{ true: colors.primary }}
        />
      </View>
      <View style={styles.toggle}>
        <Text style={s.text}>Preferencia activa</Text>
        <Switch
          accessibilityLabel="Preferencia activa"
          value={active}
          onValueChange={setActive}
          trackColor={{ true: colors.primary }}
        />
      </View>
      {mutation.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {mutation.error.message}
        </Text>
      )}
      <Button
        title="Guardar preferencia"
        disabled={!valid || mutation.isPending}
        onPress={save}
      />
      <Button
        title="Volver a mis preferencias"
        secondary
        disabled={mutation.isPending}
        onPress={onClose}
      />
      {entry && (
        <Button
          title={remove ? 'Confirmar eliminación' : 'Eliminar preferencia'}
          secondary
          disabled={mutation.isPending}
          onPress={() => {
            if (remove) mutation.mutate(null);
            else setRemove(true);
          }}
        />
      )}
    </View>
  );
}

export function MobilityScreen() {
  const { user } = useSession();
  const eligible = !!user?.capabilities.passenger;
  const [editing, setEditing] = useState<string | null>(null);
  const preferences = useQuery({
    queryKey: ['mobility', user?.id],
    enabled: eligible,
    queryFn: () => api<MobilityPreferenceView[]>('/mobility/preferences'),
  });
  const campus = useQuery({
    queryKey: ['meeting-points'],
    enabled: eligible,
    queryFn: () => api<CampusMeetingPoint[]>('/campus/meeting-points'),
  });
  const campuses =
    campus.data?.filter((point) => point.kind === 'CAMPUS') ?? [];
  const reference = campus.data?.find(
    (point) => point.latitude !== null && point.longitude !== null,
  );
  const entry = preferences.data?.find(({ id }) => id === editing);

  return (
    <ProtectedPage title="Preferencias de movilidad" allowOnboarding>
      <Link href="/frequent-places" style={s.link}>
        Mis lugares habituales
      </Link>
      <Link href="/saved-trips" style={s.link}>
        Mis viajes guardados
      </Link>
      <Text style={s.text}>
        Guarda tus zonas y horarios habituales para recibir recomendaciones. Tus
        preferencias son privadas.
      </Text>
      {(campus.error || preferences.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {campus.error?.message ?? preferences.error?.message}
        </Text>
      )}
      {editing !== null ? (
        <PreferenceEditor
          key={editing}
          entry={entry}
          campuses={campuses}
          reference={
            reference?.latitude != null && reference.longitude != null
              ? { latitude: reference.latitude, longitude: reference.longitude }
              : undefined
          }
          onClose={() => setEditing(null)}
        />
      ) : (
        <>
          {preferences.isPending && (
            <Text style={s.text}>Consultando preferencias…</Text>
          )}
          {preferences.data?.length === 0 && (
            <Text style={s.text}>
              Aún no has guardado horarios ni zonas habituales.
            </Text>
          )}
          {preferences.data?.map((item) => (
            <View key={item.id} style={s.section}>
              <Text style={s.title}>{item.label}</Text>
              <Text style={s.text}>
                {directionLabel[item.direction]} · {item.placeLabel} ·{' '}
                {item.active ? 'Activa' : 'En pausa'}
              </Text>
              <Text style={s.text}>
                {item.days.map((day) => dayLabels[day - 1]).join(', ')} ·{' '}
                {clock(item.startMinute)} a {clock(item.endMinute)}
              </Text>
              {item.maxContributionCop != null && (
                <Text style={s.text}>
                  Aporte máximo · {pesos(item.maxContributionCop)} COP
                </Text>
              )}
              <Button
                title="Editar preferencia"
                secondary
                onPress={() => setEditing(item.id)}
              />
            </View>
          ))}
          <Button
            title="Agregar preferencia"
            disabled={!campuses.length}
            onPress={() => setEditing('new')}
          />
        </>
      )}
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  time: { flex: 1, minWidth: 112 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
});
