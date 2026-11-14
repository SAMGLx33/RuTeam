import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DomainPolicyError } from '../errors/domain-policy.error.js';
import type { Response } from 'express';
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof DomainPolicyError
        ? HttpStatus.BAD_REQUEST
        : exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500)
      this.logger.error(
        `Error HTTP ${status}; tipo ${exception instanceof Error ? exception.name : 'unknown'}`,
      );
    const detail =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof DomainPolicyError
          ? exception.message
          : 'Error interno';
    response.status(status).json({
      statusCode: status,
      ...(typeof detail === 'object' ? detail : { message: detail }),
    });
  }
}
