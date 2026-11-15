import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { ENVIRONMENT, type Environment } from '../../config/environment.js';
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly db: PrismaService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  @Get()
  async check() {
    try {
      await this.db.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('PostgreSQL no disponible');
    }
    return { status: 'ok', database: 'up', demo: this.env.demo };
  }
}
