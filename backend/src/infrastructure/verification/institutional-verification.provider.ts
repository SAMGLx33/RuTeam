export abstract class InstitutionalVerificationProvider {
  abstract verify(userId: string): Promise<boolean>;
}
