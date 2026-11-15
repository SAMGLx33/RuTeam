import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module.js';
import { ENVIRONMENT, type Environment } from './config/environment.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
export async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
    bodyParser: false,
  });
  const env = app.get<Environment>(ENVIRONMENT);
  app.use(helmet());
  app.use(json({ limit: '32kb' }));
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: env.origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-ruteam-client'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('RuTeam DEMO')
    .setDescription('Vinculación simulada. Sólo rutas implementadas.')
    .setVersion('0.1.0')
    .addCookieAuth('ruteam_session')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/v1/docs',
    app,
    SwaggerModule.createDocument(app, config),
  );
  app.enableShutdownHooks();
  return app;
}
