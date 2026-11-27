import { Text, View } from '../../theme/primitives';

import type {
  CompensationMethod,
  TripEconomicTerms,
  TripEconomicsPreview,
} from '@ruteam/contracts';
import { formStyles as s } from '../../components/ui/protected-page';

export const methodLabel: Record<CompensationMethod, string> = {
  NEQUI: 'Nequi',
  DAVIPLATA: 'DaviPlata',
  CASH: 'Efectivo',
};

export const expenseConcepts = [
  ['fuelCop', 'Combustible'],
  ['tollsCop', 'Peajes'],
  ['parkingCop', 'Estacionamiento'],
] as const;

export const pesos = (amount: number) =>
  amount.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

export function EconomicTerms({ terms }: { terms: TripEconomicTerms | null }) {
  if (!terms)
    return (
      <Text style={s.text}>Publicación histórica sin aporte registrado.</Text>
    );
  if (!terms.suggestedContributionCop)
    return <Text style={s.text}>Viaje gratuito</Text>;
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.title}>
        Aporte sugerido por pasajero · {pesos(terms.suggestedContributionCop)}{' '}
        COP
      </Text>
      <Text style={s.text}>
        Métodos disponibles ·{' '}
        {terms.compensationMethods
          .map((method) => methodLabel[method])
          .join(' · ')}
      </Text>
      <Text style={s.text}>
        Contribución voluntaria. El aporte publicado se mantiene aunque queden
        plazas libres.
      </Text>
    </View>
  );
}

export function EconomicsPreview({
  preview,
}: {
  preview: TripEconomicsPreview;
}) {
  return (
    <View style={s.section}>
      <Text style={s.title}>Estimación privada en COP</Text>
      {expenseConcepts.map(([key, label]) => (
        <Text key={key} style={s.text}>
          {label} · {pesos(preview.estimate?.[key] ?? 0)}
        </Text>
      ))}
      <Text style={s.text}>
        Costo total estimado · {pesos(preview.totalCop)}
      </Text>
      <Text style={s.text}>Plazas ofertadas · {preview.offeredSeats}</Text>
      {preview.source && (
        <Text style={s.text}>Gastos estimados por el conductor</Text>
      )}
      <EconomicTerms terms={preview} />
    </View>
  );
}
