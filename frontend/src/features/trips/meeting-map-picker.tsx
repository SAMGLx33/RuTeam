import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { MobilityMap, hasMapTiles } from '../../components/maps/mobility-map';
import type { Coordinates } from '../../components/maps/mercator';
import { Text, View } from '../../theme/primitives';
import { formStyles as s } from '../../components/ui/protected-page';

export type { Coordinates } from '../../components/maps/mercator';

export function MeetingMapPicker({
  title,
  reference,
  value,
  onSelect,
  initiallyOpen = false,
}: {
  title: string;
  reference: Coordinates;
  value?: Coordinates;
  onSelect: (coordinates: Coordinates) => void;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  if (!hasMapTiles())
    return (
      <Text style={s.text}>
        Mapa base no configurado. Puedes buscar el lugar por su nombre.
      </Text>
    );
  return (
    <View style={{ gap: 10 }}>
      <Button
        title={open ? `Cerrar mapa · ${title}` : `Elegir en mapa · ${title}`}
        secondary
        icon={open ? 'x' : 'map-pin'}
        onPress={() => setOpen(!open)}
      />
      {value && <Text style={s.text}>Ubicación seleccionada · {title}</Text>}
      {open && (
        <MobilityMap
          height={290}
          label={`Mapa para seleccionar · ${title}`}
          reference={value ?? reference}
          markers={
            value
              ? [
                  {
                    ...value,
                    id: 'selected',
                    label: 'Punto marcado',
                    kind: 'destination',
                  },
                ]
              : []
          }
          onPick={onSelect}
        />
      )}
    </View>
  );
}
