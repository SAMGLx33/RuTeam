export type RatingCapacity = 'DRIVER' | 'PASSENGER';

export interface ReputationSummary {
  capacity: RatingCapacity;
  average: number | null;
  count: number;
}

export interface SubmitRatingInput {
  rateeId: string;
  stars: number;
  comment?: string;
}

export interface SubmittedRating {
  stars: number;
  comment: string | null;
  createdAt: string;
}

export interface RatingTarget {
  rateeId: string;
  name: string | null;
  capacity: RatingCapacity;
  submitted: SubmittedRating | null;
}

export interface TripRatingsView {
  tripId: string;
  origin: string;
  destination: string;
  completedAt: string | null;
  targets: RatingTarget[];
}

export interface TripRatingsPage {
  items: TripRatingsView[];
  nextCursor: string | null;
  reputations: ReputationSummary[];
}

export interface TripRatingDetail extends TripRatingsView {
  reputations: ReputationSummary[];
}
