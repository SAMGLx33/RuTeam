import type { RatingCapacity } from '@ruteam/contracts';

export function ratingTargetRole(
  driverId: string,
  boarded: ReadonlySet<string>,
  raterId: string,
  rateeId: string,
): RatingCapacity | null {
  if (raterId === rateeId) return null;
  if (raterId === driverId && boarded.has(rateeId)) return 'PASSENGER';
  if (rateeId === driverId && boarded.has(raterId)) return 'DRIVER';
  return null;
}
