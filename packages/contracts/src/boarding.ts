export interface BoardingPass {
  code: string;
  expiresAt: string;
}

export interface RedeemBoardingPassInput {
  code: string;
}
