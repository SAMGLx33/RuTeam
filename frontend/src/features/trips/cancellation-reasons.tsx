import { Text, View } from '../../theme/primitives';
import type { CancellationReason } from '@ruteam/contracts';

import { Choice } from './itinerary-form';
import { formStyles as s } from '../../components/ui/protected-page';

export const cancellationLabel: Record<CancellationReason, string> = {
  DRIVER_UNAVAILABLE: 'Conductor indisponible',
  VEHICLE_ISSUE: 'Problema con el vehículo',
  SAFETY: 'Seguridad',
  CHANGE_OF_PLANS: 'Cambio de planes',
  ACCOUNT_CLOSED: 'Desactivación de la cuenta',
  OTHER: 'Otro motivo',
};

type SelectableReason = Exclude<CancellationReason, 'ACCOUNT_CLOSED'>;
export function CancellationReasons({
  reason,
  choose,
  asDriver = false,
}: {
  reason?: SelectableReason;
  choose: (reason?: SelectableReason) => void;
  asDriver?: boolean;
}) {
  const options: SelectableReason[] = asDriver
    ? [
        'DRIVER_UNAVAILABLE',
        'VEHICLE_ISSUE',
        'SAFETY',
        'CHANGE_OF_PLANS',
        'OTHER',
      ]
    : ['CHANGE_OF_PLANS', 'SAFETY', 'OTHER'];
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.text}>Motivo</Text>
      {options.map((option) => (
        <Choice
          key={option}
          label={cancellationLabel[option]}
          checked={option === reason}
          onPress={() => choose(option === reason ? undefined : option)}
        />
      ))}
    </View>
  );
}
