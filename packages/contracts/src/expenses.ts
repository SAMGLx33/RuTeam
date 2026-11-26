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
