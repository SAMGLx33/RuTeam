import type { PublishTripInput, TripSummary } from './index.js';

export interface RecurrenceInput {
  name: string;
  startsOn: string;
  endsOn: string;
  time: string;
  weekdays: number[];
}

export type RecurringTripTemplate = Omit<PublishTripInput, 'departureAt'>;

export interface RecurringTripInput extends RecurrenceInput {
  template: RecurringTripTemplate;
}

export interface RecurringTripView extends RecurringTripInput {
  id: string;
  state: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  occurrences: {
    date: string;
    departureAt: string;
    failure: string | null;
    trip: Pick<TripSummary, 'id' | 'status' | 'occupiedSeats'> | null;
  }[];
}
