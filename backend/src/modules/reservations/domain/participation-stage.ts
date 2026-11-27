import type {
  ParticipationStage,
  ReservationStatus,
  TripSummary,
} from '@ruteam/contracts';

export function participationStage(
  row: {
    status: ReservationStatus;
    boardedAt: Date | null;
    droppedOffAt: Date | null;
    noShowAt: Date | null;
  },
  status: TripSummary['status'],
): ParticipationStage {
  if (row.noShowAt) return 'ABSENT';
  if (row.droppedOffAt)
    return status === 'COMPLETADO' ? 'COMPLETED' : 'DROPPED_OFF';
  if (
    status === 'INTERRUMPIDO' &&
    (row.boardedAt || row.status === 'CANCELLED')
  )
    return 'INTERRUPTED';
  if (row.status === 'CANCELLED') return 'CANCELLED';
  if (row.status !== 'CONFIRMED') return 'UNCONFIRMED';
  if (row.boardedAt) return status === 'COMPLETADO' ? 'COMPLETED' : 'ABOARD';
  return 'AWAITING_PICKUP';
}
