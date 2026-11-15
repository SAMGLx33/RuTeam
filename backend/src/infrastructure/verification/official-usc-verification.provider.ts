import { ServiceUnavailableException } from '@nestjs/common';
import { InstitutionalVerificationProvider } from './institutional-verification.provider.js';
/** No realiza peticiones USC ni valida imágenes QR. Requiere convenio y API autorizada. */
export class OfficialUscVerificationProvider extends InstitutionalVerificationProvider {
  async verify(_userId: string): Promise<boolean> {
    void _userId;
    throw new ServiceUnavailableException(
      'Verificación oficial USC deshabilitada: falta integración autorizada',
    );
  }
}
