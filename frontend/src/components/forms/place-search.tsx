import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { GeocodedPlace, PlaceSearchResponse } from '@ruteam/contracts';
import { Button } from '../ui/button';
import { accountStyles } from '../ui/account-page';
import { formStyles as s } from '../ui/protected-page';
import { api } from '../../services/api/client';

type SearchState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; result: PlaceSearchResponse };

const idle = { status: 'idle' } as const;

export function PlaceSearch({
  title,
  onSelect,
}: {
  title: string;
  onSelect: (place: GeocodedPlace) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState>(idle);
  const request = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => request.current?.abort(), []);

  function cancel() {
    request.current?.abort();
    request.current = undefined;
    setSearch(idle);
  }

  async function submit() {
    const text = query.trim();
    if (text.length < 3 || search.status === 'loading') return;
    cancel();
    const current = new AbortController();
    request.current = current;
    setSearch({ status: 'loading' });
    try {
      const result = await api<PlaceSearchResponse>('/geocoding/search', {
        method: 'POST',
        body: { query: text },
        signal: current.signal,
      });
      if (!current.signal.aborted) setSearch({ status: 'done', result });
    } catch (error) {
      if (current.signal.aborted) return;
      setSearch({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'No pudimos buscar lugares.',
      });
    } finally {
      if (request.current === current) request.current = undefined;
    }
  }

  return (
    <View style={styles.search}>
      <Button
        secondary
        title={open ? `Cerrar búsqueda · ${title}` : `Buscar lugar · ${title}`}
        onPress={() => {
          if (open) cancel();
          setOpen(!open);
        }}
      />
      {open && (
        <>
          <Text style={s.text}>
            Escribe un barrio, dirección o referencia pública para consultar el
            proveedor cartográfico.
          </Text>
          <TextInput
            accessibilityLabel={`Lugar a buscar · ${title}`}
            placeholder="Barrio, dirección o lugar conocido"
            style={accountStyles.input}
            value={query}
            maxLength={120}
            returnKeyType="search"
            onChangeText={(value) => {
              cancel();
              setQuery(value);
            }}
            onSubmitEditing={() => void submit()}
          />
          <Button
            secondary
            title={
              search.status === 'loading'
                ? 'Buscando lugares…'
                : `Consultar lugares · ${title}`
            }
            disabled={query.trim().length < 3 || search.status === 'loading'}
            onPress={() => void submit()}
          />
          {search.status === 'error' && (
            <Text accessibilityRole="alert" style={s.error}>
              {search.message}
            </Text>
          )}
          {search.status === 'done' && (
            <>
              {search.result.items.length ? (
                <Text style={s.text} accessibilityLiveRegion="polite">
                  Elige el lugar que corresponde a tu búsqueda.
                </Text>
              ) : (
                <Text style={s.text} accessibilityLiveRegion="polite">
                  No encontramos el lugar. Intenta con otra referencia o elige
                  un punto en el mapa.
                </Text>
              )}
              {search.result.items.map((place) => (
                <Pressable
                  key={`${place.latitude}:${place.longitude}:${place.label}`}
                  accessibilityRole="button"
                  accessibilityLabel={[place.label, place.context]
                    .filter(Boolean)
                    .join(' · ')}
                  style={s.choice}
                  onPress={() => {
                    onSelect(place);
                    cancel();
                    setOpen(false);
                  }}
                >
                  <Text style={s.text}>{place.label}</Text>
                  {!!place.context && (
                    <Text style={s.text}>{place.context}</Text>
                  )}
                </Pressable>
              ))}
              <Text
                accessibilityRole="link"
                style={s.link}
                onPress={() =>
                  void Linking.openURL(
                    'https://www.openstreetmap.org/copyright',
                  )
                }
              >
                {search.result.attribution}
              </Text>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ search: { gap: 8 } });
