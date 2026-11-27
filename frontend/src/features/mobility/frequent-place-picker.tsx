import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { FrequentPlaceView } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';

export const frequentPlacesPath = '/mobility/frequent-places';
export function useFrequentPlaces(enabled = true) {
  const { user } = useSession();
  return useQuery({
    queryKey: ['frequent-places', user?.id],
    enabled: enabled && !!user?.capabilities.passenger,
    queryFn: () => api<FrequentPlaceView[]>(frequentPlacesPath),
  });
}

export function FrequentPlacePicker({
  onSelect,
  title = 'Usar un lugar habitual',
}: {
  onSelect: (place: FrequentPlaceView) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const places = useFrequentPlaces(open);
  return (
    <>
      <Button
        secondary
        title={open ? 'Ocultar lugares habituales' : title}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <View style={s.section}>
          {places.isPending && (
            <Text style={s.text}>Buscando tus lugares…</Text>
          )}
          {places.error && (
            <Text style={s.error} accessibilityRole="alert">
              {places.error.message}
            </Text>
          )}
          {places.data?.map((place) => (
            <Button
              key={place.id}
              secondary
              title={place.name}
              onPress={() => {
                onSelect(place);
                setOpen(false);
              }}
            />
          ))}
          <Link href="/frequent-places" style={s.link}>
            Gestionar mis lugares habituales
          </Link>
        </View>
      )}
    </>
  );
}
