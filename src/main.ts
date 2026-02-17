import { WsAdapter } from '@nestjs/platform-ws';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { AppModule } from './app.module';

export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'https://marcus-hein-alpha.vercel.app',
      '*',
    ],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('University Management API')
    .setDescription('API documentation for the project')
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Paste token only. Do not add "Bearer " prefix.',
      },
      'token-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  return app;
}

async function bootstrap() {
  const app = await createNestApp();
  await app.listen(process.env.PORT || 3000);
}

if (require.main === module) {
  void bootstrap();
}
