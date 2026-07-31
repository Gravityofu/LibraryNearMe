import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
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
import { KormarcTagsController } from './settings/kormarc-tags.controller';
import { KormarcTagsService } from './settings/kormarc-tags.service';
import { CopyOptionsController } from './settings/copy-options.controller';
import { CopyOptionsService } from './settings/copy-options.service';
import { MaterialTypesController } from './settings/material-types.controller';
import { MaterialTypesService } from './settings/material-types.service';
import { MemberTypesController } from './settings/member-types.controller';
import { MemberTypesService } from './settings/member-types.service';
import { LoanSettingsController } from './settings/loan-settings.controller';
import { LoanSettingsService } from './settings/loan-settings.service';
import { LoansController } from './loans/loans.controller';
import { LoansService } from './loans/loans.service';
import { LoanRestrictionsController } from './loan-restrictions/loan-restrictions.controller';
import { LoanRestrictionsService } from './loan-restrictions/loan-restrictions.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    LibraryController,
    UsersController,
    AuthController,
    MaterialsController,
    CopiesController,
    KormarcTagsController,
    CopyOptionsController,
    MaterialTypesController,
    MemberTypesController,
    LoanSettingsController,
    LoansController,
    LoanRestrictionsController,
  ],
  providers: [
    AppService,
    PrismaService,
    LibraryService,
    UsersService,
    AuthService,
    MaterialsService,
    KormarcTagsService,
    CopyOptionsService,
    MaterialTypesService,
    MemberTypesService,
    LoanSettingsService,
    LoansService,
    LoanRestrictionsService,
  ],
})
export class AppModule {}