import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Log every HTTP request so Render logs are useful
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} +${Date.now() - start}ms  origin:${req.headers.origin ?? 'none'}`);
    });
    next();
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  // Only allow explicitly listed origins — set FRONTEND_URL on Render (comma-separated for multiple)
  const allowedOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean);

  const devOrigins = process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003']
    : [];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = [...allowedOrigins, ...devOrigins];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`CGPA API running — port ${port} — env:${process.env.NODE_ENV ?? 'development'}`);
}

bootstrap();
