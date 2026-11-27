import {
  Body,
  Controller,
  Get,
  HttpCode,
  Header,
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
import { ExpensesService } from '../application/expenses.service.js';
import { CompensationsService } from '../application/compensations.service.js';
import {
  DeclareCompensationDto,
  ResolveCompensationDto,
  TripEconomicsPreviewDto,
  TripExpenseDto,
} from '../dto/expense.dto.js';

@ApiTags('expenses')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class ExpensesController {
  constructor(
    private readonly service: ExpensesService,
    private readonly compensations: CompensationsService,
  ) {}

  @Post('trips/economics-preview')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(200)
  preview(
    @Req() request: AuthenticatedRequest,
    @Body() input: TripEconomicsPreviewDto,
  ) {
    return this.service.preview(request.principal.userId, input);
  }

  @Get('participations/:id/compensation')
  @Header('Cache-Control', 'private, no-store')
  compensation(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.compensations.view(id, request.principal.userId);
  }

  @Post('participations/:id/compensation')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(200)
  declare(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: DeclareCompensationDto,
  ) {
    return this.compensations.declare(
      id,
      request.principal.userId,
      input.method,
    );
  }

  @Post('participations/:id/compensation/resolution')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(200)
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: ResolveCompensationDto,
  ) {
    return this.compensations.resolve(
      id,
      request.principal.userId,
      input.action,
    );
  }

  @Get('trips/:tripId/expense-estimate')
  @Header('Cache-Control', 'private, no-store')
  detail(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.detail(tripId, request.principal.userId);
  }

  @Post('trips/:tripId/expense-estimate')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(200)
  save(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: TripExpenseDto,
  ) {
    return this.service.save(tripId, request.principal.userId, input);
  }
}
