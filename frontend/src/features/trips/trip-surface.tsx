import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import type { TripSummary } from '@ruteam/contracts';
import { Text, View } from '../../theme/primitives';
import { colors } from '../../theme/tokens';
import { tripStatusLabel } from './route-preview';

export function TripColumns({
  main,
  side,
}: {
  main: ReactNode;
  side: ReactNode;
}) {
  return (
    <View style={styles.columns}>
      <View style={[styles.column, styles.main]}>{main}</View>
      <View style={[styles.column, styles.side]}>{side}</View>
    </View>
  );
}

export function TripStatus({ status }: { status: TripSummary['status'] }) {
  return (
    <Text
      style={[
        styles.status,
        status === 'COMPLETADO' && styles.complete,
        (status === 'CANCELADO' || status === 'INTERRUMPIDO') &&
          styles.terminated,
      ]}
    >
      Viaje {tripStatusLabel[status]}
    </Text>
  );
}

export function TripSectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text role="heading" aria-level={2} style={tripSurfaceStyles.heading}>
      {children}
    </Text>
  );
}

export const tripSurfaceStyles = StyleSheet.create({
  panel: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  heading: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  facts: { gap: 6 },
  separated: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 },
  subdued: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  emphasized: { color: colors.ink, fontWeight: '700' },
});

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  column: { gap: 16, flexGrow: 1, flexShrink: 1, minWidth: 0 },
  main: { flexBasis: 470 },
  side: { flexBasis: 300 },
  status: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.selected,
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  complete: { color: colors.success, backgroundColor: colors.background },
  terminated: { color: colors.danger, backgroundColor: colors.background },
});
