export interface TripExpenseInput {
  fuelCop: number;
  tollsCop: number;
  parkingCop: number;
}

export interface TripExpenseEstimate extends TripExpenseInput {
  totalCop: number;
  updatedAt: string;
}

export interface TripExpenseDetails {
  estimate: TripExpenseEstimate | null;
  editable: boolean;
}

export type CompensationMethod = 'NEQUI' | 'DAVIPLATA' | 'CASH';

export interface TripEconomicTerms {
  suggestedContributionCop: number;
  compensationMethods: CompensationMethod[];
}

export interface TripEconomicsInput {
  estimate?: TripExpenseInput;
  compensationMethods: CompensationMethod[];
}

export interface TripEconomicsPreview extends TripEconomicTerms {
  estimate: TripExpenseInput | null;
  totalCop: number;
  offeredSeats: number;
  source: 'DRIVER_DECLARED' | null;
}

export type CompensationAction = 'ACKNOWLEDGE' | 'DISPUTE' | 'CANCEL';

export interface TripCompensationView {
  method: CompensationMethod;
  amountCop: number;
  status: 'DECLARED' | 'ACKNOWLEDGED' | 'DISPUTED' | 'CANCELLED';
  declaredAt: string;
  resolvedAt: string | null;
}

export interface CompensationDetails {
  terms: TripEconomicTerms | null;
  record: TripCompensationView | null;
  canDeclare: boolean;
  actions: CompensationAction[];
}

export type EconomicHistoryRole = 'PASSENGER' | 'DRIVER';
export type EconomicHistoryFilter =
  'FREE' | 'SUGGESTED' | TripCompensationView['status'];

export interface EconomicHistoryEntry {
  tripId: string;
  participationId: string | null;
  participationStatus:
    import('./routes.js').ReservationStatus | 'NO_SHOW' | null;
  departureAt: string;
  tripStatus: import('./index.js').TripSummary['status'];
  route: string;
  suggestedCop: number | null;
  expenseCop: number | null;
  traveled: boolean;
  canOpenCompensation: boolean;
  records: Record<TripCompensationView['status'], number>;
  declaredCop: number;
  acknowledgedCop: number;
  disputedCop: number;
}

export interface EconomicHistory {
  role: EconomicHistoryRole;
  entries: EconomicHistoryEntry[];
  totalEntries: number;
  nextOffset: number | null;
  totals: {
    suggestedForTraveledCop: number;
    expenseCop: number;
    expenseTrips: number;
    declaredCop: number;
    acknowledgedCop: number;
    disputedCop: number;
  };
}
