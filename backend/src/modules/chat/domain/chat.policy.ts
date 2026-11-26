export const chatRetentionMs = 24 * 60 * 60 * 1000;

type ChatAccess = 'WRITE' | 'READ' | 'DENIED';
interface ChatTrip {
  driverId: string;
  status: 'PROGRAMADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
  finishedAt: Date | null;
}

interface ChatParticipation {
  boardedAt: Date | null;
  noShowAt?: Date | null;
}

export function chatAccess(
  trip: ChatTrip,
  actorId: string,
  participation: ChatParticipation | null,
  now: Date,
): ChatAccess {
  const isDriver = trip.driverId === actorId;
  const isParticipant = !!participation && !participation.noShowAt;
  if (trip.status === 'CANCELADO' || (!isDriver && !isParticipant))
    return 'DENIED';
  if (trip.status !== 'COMPLETADO') return 'WRITE';
  if (
    !trip.finishedAt ||
    trip.finishedAt.getTime() + chatRetentionMs <= now.getTime()
  )
    return 'DENIED';
  return isDriver || participation?.boardedAt ? 'READ' : 'DENIED';
}

export interface ChatMarker {
  at: Date;
  id: string;
}

export function isAfterChatMarker(
  current: ChatMarker,
  marker: ChatMarker,
): boolean {
  const difference = current.at.getTime() - marker.at.getTime();
  return difference > 0 || (difference === 0 && current.id > marker.id);
}
