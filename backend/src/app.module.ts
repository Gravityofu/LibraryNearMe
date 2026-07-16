import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { LibraryController } from './library/library.controller';
import { LibraryService } from './library/library.service';

@Module({
  imports: [],
  controllers: [AppController, LibraryController],
  providers: [AppService, PrismaService, LibraryService],
})
export class AppModule {}