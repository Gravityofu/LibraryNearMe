import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { LibraryController } from './library/library.controller';
import { LibraryService } from './library/library.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { MaterialsController } from './materials/materials.controller';
import { MaterialsService } from './materials/materials.service';
import { CopiesController } from './materials/copies.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    AppController,
    LibraryController,
    UsersController,
    AuthController,
    MaterialsController,
    CopiesController,
  ],
  providers: [
    AppService,
    PrismaService,
    LibraryService,
    UsersService,
    AuthService,
    MaterialsService,
  ],
})
export class AppModule {}