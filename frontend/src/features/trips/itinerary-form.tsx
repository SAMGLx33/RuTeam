import { useState, type KeyboardEvent } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { TripDirection, StopAccess } from '@ruteam/contracts';
import type { Coordinates } from '../../components/maps/mercator';
import { formStyles as s } from '../../components/ui/protected-page';
import { Pressable, Text } from '../../theme/primitives';
import { colors } from '../../theme/tokens';

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
  recurrenceName: string;
  startsOn: string;
  endsOn: string;
  time: string;
  estimatedDurationMinutes: string;
  offeredSeats: string;
  fuelCop: string;
  tollsCop: string;
  parkingCop: string;
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
  const [focused, setFocused] = useState(false);
  const keyboard =
    Platform.OS === 'web'
      ? {
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (event.key !== ' ') return;
            event.preventDefault();
            if (!event.repeat) onPress();
          },
        }
      : undefined;
  return (
    <Pressable
      {...keyboard}
      accessibilityRole={checkbox ? 'checkbox' : 'radio'}
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[s.choice, checked && s.selected, focused && styles.choiceFocus]}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choiceFocus: { borderColor: colors.ink },
});
