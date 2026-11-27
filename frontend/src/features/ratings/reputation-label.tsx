import { Text } from 'react-native';
import type { ReputationSummary } from '@ruteam/contracts';
import { formStyles as s } from '../../components/ui/protected-page';

export function ReputationLabel({ summary }: { summary: ReputationSummary }) {
  const label = summary.capacity === 'DRIVER' ? 'Conducción' : 'Como pasajero';
  const text =
    summary.average === null
      ? 'Sin calificaciones'
      : `${summary.average.toLocaleString('es-CO', { maximumFractionDigits: 2 })} / 5 (${summary.count} ${summary.count === 1 ? 'calificación' : 'calificaciones'})`;
  return (
    <Text style={s.text}>
      {label} · {text}
    </Text>
  );
}
