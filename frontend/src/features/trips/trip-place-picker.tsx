import { useState } from 'react';
import type { TripPoint } from '@ruteam/contracts';
import { MobilityMap, hasMapTiles } from '../../components/maps/mobility-map';
import { caliCenter, type Coordinates } from '../../components/maps/mercator';
import { accountStyles } from '../../components/ui/account-page';
import { PlaceSearch } from '../../components/forms/place-search';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { Text, TextInput, View } from '../../theme/primitives';
import { FrequentPlacePicker } from '../mobility/frequent-place-picker';

export function TripPlacePicker({
  title,
  value,
  initiallyOpen = false,
  onChange,
}: {
  title: string;
  value?: TripPoint;
  initiallyOpen?: boolean;
  onChange: (place: TripPoint) => void;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [map, setMap] = useState(false);
  const [pin, setPin] = useState<Coordinates>();
  const [label, setLabel] = useState('');
  const [privatePoint, setPrivatePoint] = useState<Coordinates>();
  function commit(place: TripPoint) {
    onChange({
      label: place.label.trim(),
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setOpen(false);
  }
  return (
    <View style={s.section}>
      <Text style={s.title}>{title}</Text>
      {value && <Text style={s.text}>{value.label}</Text>}
      <Button
        secondary
        icon="map-pin"
        title={
          open
            ? 'Cerrar selector · ' + title
            : (value ? 'Cambiar lugar · ' : 'Elegir lugar · ') + title
        }
        onPress={() => {
          if (!open) {
            setPin(value);
            setLabel(value?.label ?? '');
            setPrivatePoint(undefined);
            setMap(false);
          }
          setOpen(!open);
        }}
      />
      {open && (
        <>
          <PlaceSearch title={title} onSelect={commit} inline />
          <FrequentPlacePicker
            onSelect={(place) => {
              if (place.kind === 'PUBLIC_REFERENCE')
                commit({ ...place, label: place.placeLabel });
              else {
                setPrivatePoint(place);
                setMap(true);
              }
            }}
          />
          <Button
            secondary
            title={map ? 'Cerrar mapa · ' + title : 'Elegir en mapa · ' + title}
            onPress={() => setMap(!map)}
          />
          {map &&
            (privatePoint ? (
              <>
                <MobilityMap
                  label={'Vista privada · ' + title}
                  height={240}
                  reference={privatePoint}
                  allowTiles={false}
                  markers={[
                    {
                      ...privatePoint,
                      id: 'local',
                      label: 'Lugar habitual',
                      kind: 'current',
                    },
                  ]}
                />
                <Button
                  secondary
                  title="Abrir mapa público"
                  onPress={() => setPrivatePoint(undefined)}
                />
              </>
            ) : hasMapTiles() ? (
              <>
                <Text style={s.text}>
                  Toca el mapa para marcar un lugar público y confirma el punto.
                </Text>
                <MobilityMap
                  label={'Mapa para seleccionar · ' + title}
                  height={270}
                  reference={value ?? caliCenter}
                  locate
                  markers={
                    pin
                      ? [
                          {
                            ...pin,
                            id: 'pending',
                            label: 'Punto marcado',
                            kind: 'destination',
                          },
                        ]
                      : []
                  }
                  onPick={setPin}
                />
                {pin && (
                  <>
                    <TextInput
                      accessibilityLabel={'Referencia pública · ' + title}
                      placeholder="Nombre breve del lugar"
                      value={label}
                      onChangeText={setLabel}
                      maxLength={100}
                      style={accountStyles.input}
                    />
                    <Button
                      title={'Confirmar ubicación · ' + title}
                      disabled={label.trim().length < 2}
                      onPress={() => commit({ ...pin, label })}
                    />
                  </>
                )}
              </>
            ) : (
              <Text style={s.text}>
                Mapa base sin configurar. Puedes buscar el lugar.
              </Text>
            ))}
        </>
      )}
    </View>
  );
}
