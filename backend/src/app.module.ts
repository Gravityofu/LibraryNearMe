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
import { ReservationsController } from './reservations/reservations.controller';
import { ReservationsService } from './reservations/reservations.service';
import { BoardsController } from './settings/boards.controller';
import { BoardsService } from './settings/boards.service';
import { UploadsController } from './uploads/uploads.controller';
import { UploadsService } from './uploads/uploads.service';
import { PostsController } from './posts/posts.controller';
import { PostsService } from './posts/posts.service';
import { PostReferencesController } from './posts/post-references.controller';
import { PostReferencesService } from './posts/post-references.service';
import { MaterialRequestTypesController } from './settings/material-request-types.controller';
import { MaterialRequestTypesService } from './settings/material-request-types.service';
import { BoardFontsController } from './settings/board-fonts.controller';
import { BoardFontsService } from './settings/board-fonts.service';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { PublicBoardsController } from './public-boards/public-boards.controller';
import { PublicPostsController } from './public-boards/public-posts.controller';
import { PublicCommentsController } from './public-boards/public-comments.controller';

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
    ReservationsController,
    BoardsController,
    UploadsController,
    PostsController,
    PostReferencesController,
    MaterialRequestTypesController,
    BoardFontsController,
    CommentsController,
    PublicBoardsController,
    PublicPostsController,
    PublicCommentsController,
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
    ReservationsService,
    BoardsService,
    UploadsService,
    PostsService,
    PostReferencesService,
    MaterialRequestTypesService,
    BoardFontsService,
    CommentsService,
  ],
})
export class AppModule {}