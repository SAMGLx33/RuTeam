import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { VehicleEnergyUpdateDto } from '../../mobility/dto/energy.dto.js';
import { VehiculoService } from '../application/vehicles.service.js';
import {
  RegisterLicenseDto,
  RegisterVehicleDto,
  UpdateSoatDto,
} from '../dto/vehicles.dto.js';
@ApiTags('vehicles')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class VehiculoController {
  constructor(private readonly service: VehiculoService) {}
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
  @Put('vehicles/:id/energy') energy(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: VehicleEnergyUpdateDto,
  ) {
    return this.service.updateEnergy(req.principal.userId, id, data.profile);
  }
  @Get('driver-eligibility')
  async licencia(@Req() req: AuthenticatedRequest, @Res() response: Response) {
    response.json(await this.service.licencia(req.principal.userId));
  }
  @Post('driver-eligibility') registrarLicencia(
    @Req() req: AuthenticatedRequest,
    @Body() data: RegisterLicenseDto,
  ) {
    return this.service.registrarLicencia(req.principal.userId, data);
  }
  @Patch('vehicles/:id/soat') actualizarSoat(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateSoatDto,
  ) {
    return this.service.actualizarSoat(
      req.principal.userId,
      id,
      data.soatExpiresAt,
    );
  }
}
