import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // 브라우저(3000)가 주방(3001)을 부를 수 있게 허용
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
