import { Global, Module } from '@nestjs/common';
import {
  ENVIRONMENT,
  readEnvironment,
  type Environment,
} from '../config/environment.js';
import { PrismaService } from './prisma/prisma.service.js';
import { InstitutionalVerificationProvider } from './verification/institutional-verification.provider.js';
import { DemoInstitutionalVerificationProvider } from './verification/demo-institutional-verification.provider.js';
import { OfficialUscVerificationProvider } from './verification/official-usc-verification.provider.js';
@Global()
@Module({
  providers: [
    { provide: ENVIRONMENT, useFactory: readEnvironment },
    PrismaService,
    {
      provide: InstitutionalVerificationProvider,
      inject: [ENVIRONMENT, PrismaService],
      useFactory: (env: Environment, db: PrismaService) =>
        env.demo && env.VERIFICATION_PROVIDER === 'demo'
          ? new DemoInstitutionalVerificationProvider(db)
          : new OfficialUscVerificationProvider(),
    },
  ],
  exports: [ENVIRONMENT, PrismaService, InstitutionalVerificationProvider],
})
export class InfrastructureModule {}
