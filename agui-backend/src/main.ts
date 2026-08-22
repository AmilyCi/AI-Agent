import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 允许跨域
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
