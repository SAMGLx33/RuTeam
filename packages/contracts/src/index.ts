/** API v1. Tipos públicos; ninguna regla de negocio vive en este paquete. */
export type InstitutionalGroup =
  'STUDENT' | 'TEACHER' | 'ADMINISTRATIVE' | 'WORKER' | 'OTHER';
export interface CurrentUser {
  id: string;
  email: string;
  role: 'MEMBER' | 'ADMIN';
  capabilities: { passenger: true; driver: boolean };
  profile: { displayName: string };
  membership: {
    status: 'ACTIVE';
    group: InstitutionalGroup;
    verifiedBy: 'DEMO';
    validUntil: string;
  };
  demo: true;
}
export interface DemoLoginInput {
  identity: 'ana' | 'diego' | 'laura' | 'admin';
}
export interface DemoLoginResponse {
  user: CurrentUser;
  expiresAt: string;
  token?: string;
}
export interface CampusDestination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  demo: boolean;
}
