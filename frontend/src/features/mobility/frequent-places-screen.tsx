import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CampusMeetingPoint,
  FrequentPlaceInput,
  FrequentPlaceKind,
  FrequentPlaceView,
} from '@ruteam/contracts';
import { PlaceSearch } from '../../components/forms/place-search';
import { accountStyles } from '../../components/ui/account-page';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Choice } from '../trips/itinerary-form';
import {
  MeetingMapPicker,
  type Coordinates,
} from '../trips/meeting-map-picker';
import { frequentPlacesPath, useFrequentPlaces } from './frequent-place-picker';

const labels: Record<FrequentPlaceKind, string> = {
  HOME_AREA: 'Zona cercana a casa',
  PICKUP: 'Recogida habitual',
  DROPOFF: 'Descenso frecuente',
  PUBLIC_REFERENCE: 'Referencia pública',
  FAVORITE: 'Lugar favorito',
};

function PlaceEditor({
  place,
  close,
}: {
  place?: FrequentPlaceView;
  close: () => void;
}) {
  const client = useQueryClient();
  const { user } = useSession();
  const [name, setName] = useState(place?.name ?? '');
  const [label, setLabel] = useState(place?.placeLabel ?? '');
  const [kind, setKind] = useState<FrequentPlaceKind>(
    place?.kind ?? 'PUBLIC_REFERENCE',
  );
  const [point, setPoint] = useState<Coordinates | undefined>(place);
  const [focus, setFocus] = useState<Coordinates | undefined>(place);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const campus = useQuery({
    queryKey: ['meeting-points'],
    enabled: !!user?.capabilities.passenger && !focus,
    queryFn: () => api<CampusMeetingPoint[]>('/campus/meeting-points'),
  });
  const fallback = campus.data?.find(
    ({ latitude, longitude }) => latitude != null && longitude != null,
  );
  const reference =
    focus ??
    (fallback?.latitude != null && fallback.longitude != null
      ? { latitude: fallback.latitude, longitude: fallback.longitude }
      : undefined);
  const path = place ? `${frequentPlacesPath}/${place.id}` : frequentPlacesPath;
  const mutation = useMutation({
    mutationFn: (data: FrequentPlaceInput | null) =>
      api(
        path,
        data
          ? { method: place ? 'PATCH' : 'POST', body: data }
          : { method: 'DELETE' },
      ),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ['frequent-places', user?.id],
      });
      close();
    },
  });
  return (
    <View style={s.section}>
      <Text style={s.title}>{place ? 'Editar lugar' : 'Nuevo lugar'}</Text>
      <Text style={accountStyles.label}>Nombre privado</Text>
      <TextInput
        accessibilityLabel="Nombre privado"
        style={accountStyles.input}
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Text style={accountStyles.label}>Tipo de lugar</Text>
      {(Object.keys(labels) as FrequentPlaceKind[]).map((item) => (
        <Choice
          key={item}
          label={labels[item]}
          checked={item === kind}
          onPress={() => setKind(item)}
        />
      ))}
      <PlaceSearch
        title="Buscar una referencia cercana"
        onSelect={({ label: value, latitude, longitude }) => {
          const position = { latitude, longitude };
          setLabel(value);
          setPoint(position);
          setFocus(position);
        }}
      />
      <Text style={accountStyles.label}>Referencia de ubicación</Text>
      <TextInput
        accessibilityLabel="Referencia de ubicación"
        style={accountStyles.input}
        value={label}
        onChangeText={setLabel}
        maxLength={160}
        placeholder="Parque del barrio"
      />
      {reference && (
        <MeetingMapPicker
          title="Lugar habitual"
          key={`${reference.latitude}:${reference.longitude}`}
          reference={reference}
          value={point}
          initiallyOpen={!!focus}
          onSelect={setPoint}
        />
      )}
      {campus.error && !focus && (
        <Text style={s.error} accessibilityRole="alert">
          {campus.error.message}
        </Text>
      )}
      {mutation.error && (
        <Text style={s.error} accessibilityRole="alert">
          {mutation.error.message}
        </Text>
      )}
      <Button
        title="Guardar lugar"
        disabled={
          !point ||
          name.trim().length < 2 ||
          label.trim().length < 2 ||
          mutation.isPending
        }
        onPress={() => {
          if (point)
            mutation.mutate({
              name,
              kind,
              placeLabel: label,
              latitude: point.latitude,
              longitude: point.longitude,
            });
        }}
      />
      <Button
        secondary
        title="Volver a mis lugares"
        disabled={mutation.isPending}
        onPress={close}
      />
      {place && (
        <Button
          secondary
          title={confirmDelete ? 'Confirmar eliminación' : 'Eliminar lugar'}
          disabled={mutation.isPending}
          onPress={() => {
            if (confirmDelete) mutation.mutate(null);
            else setConfirmDelete(true);
          }}
        />
      )}
    </View>
  );
}

export function FrequentPlacesScreen() {
  const places = useFrequentPlaces();
  const [editing, setEditing] = useState<string | null>(null);
  const current = places.data?.find(({ id }) => id === editing);
  return (
    <ProtectedPage title="Lugares habituales">
      <Link href="/mobility" style={s.link}>
        Volver a preferencias
      </Link>
      <Text style={s.text}>
        Tus lugares son privados. Puedes usar un parque, una estación o
        cualquier referencia pública cercana a casa.
      </Text>
      {places.isPending && <Text style={s.text}>Consultando lugares…</Text>}
      {places.error && (
        <Text style={s.error} accessibilityRole="alert">
          {places.error.message}
        </Text>
      )}
      {editing !== null ? (
        <PlaceEditor
          key={editing}
          place={current}
          close={() => setEditing(null)}
        />
      ) : (
        <>
          {places.data?.length === 0 && (
            <Text style={s.text}>Aún no has guardado lugares habituales.</Text>
          )}
          {places.data?.map((place) => (
            <View style={s.section} key={place.id}>
              <Text style={s.title}>{place.name}</Text>
              <Text style={s.text}>
                {labels[place.kind]} · {place.placeLabel}
              </Text>
              <Button
                secondary
                title="Editar lugar"
                onPress={() => setEditing(place.id)}
              />
            </View>
          ))}
          <Button
            title="Agregar lugar habitual"
            onPress={() => setEditing('new')}
          />
        </>
      )}
    </ProtectedPage>
  );
}
