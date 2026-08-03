import 'dotenv/config';

// 서버가 실행되는 컴퓨터의 시간대 설정과 상관없이, 이 시스템은 항상 한국 시간(Asia/Seoul)을 기준으로
// "오늘 날짜"와 "지금 시각"을 계산합니다. (예: 클라우드 서버는 보통 UTC로 동작하는데, 이 줄이 없으면
// 한국 시간 새벽 0시~9시 사이에는 "오늘 날짜"가 실제로는 어제 날짜로 잘못 계산될 수 있습니다.)
process.env.TZ = 'Asia/Seoul';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors(); // 브라우저(3000)가 주방(3001)을 부를 수 있게 허용

  // backend/uploads 폴더 안의 파일을 "http://서버주소/uploads/..." 로 브라우저에서 바로 볼 수 있게 합니다.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();