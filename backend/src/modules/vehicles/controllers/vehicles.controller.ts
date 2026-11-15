import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { VehiculoService } from '../application/vehicles.service.js';
import {
  RegisterLicenseDto,
  RegisterVehicleDto,
  ReviewDocumentDto,
} from '../dto/vehicles.dto.js';
@ApiTags('vehicles-demo')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class VehiculoController {
  constructor(private readonly service: VehiculoService) {}
  @Get('admin/demo/document-reviews') pendientes(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.pendientes(req.principal.userId);
  }
  @Get('vehicles/catalog') catalogo() {
    return this.service.catalogo();
  }
  @Get('vehicles') listar(@Req() req: AuthenticatedRequest) {
    return this.service.listarPropios(req.principal.userId);
  }
  @Post('vehicles') registrar(
    @Req() req: AuthenticatedRequest,
    @Body() data: RegisterVehicleDto,
  ) {
    return this.service.registrarVehiculo(req.principal.userId, data);
  }
  @Get('driver-eligibility') licencia(@Req() req: AuthenticatedRequest) {
    return this.service.licencia(req.principal.userId);
  }
  @Post('driver-eligibility') registrarLicencia(
    @Req() req: AuthenticatedRequest,
    @Body() data: RegisterLicenseDto,
  ) {
    return this.service.registrarLicencia(req.principal.userId, data);
  }
  @Post('admin/demo/vehicles/:id/review') revisarVehiculo(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: ReviewDocumentDto,
  ) {
    return this.service.revisarVehiculo(
      req.principal.userId,
      id,
      data.decision,
      data.revision,
    );
  }
  @Post('admin/demo/driver-eligibility/:id/review') revisarLicencia(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: ReviewDocumentDto,
  ) {
    return this.service.revisarLicencia(
      req.principal.userId,
      id,
      data.decision,
      data.revision,
    );
  }
}
