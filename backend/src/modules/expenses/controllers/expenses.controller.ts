import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { TripExpenseDto } from '../dto/expense.dto.js';

@ApiTags('expenses')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('trips/:tripId/expense-estimate')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  detail(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.detail(tripId, request.principal.userId);
  }

  @Post()
  @HttpCode(200)
  save(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: TripExpenseDto,
  ) {
    return this.service.save(tripId, request.principal.userId, input);
  }
}
