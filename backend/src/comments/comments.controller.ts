import { Controller, Get, Delete, Param, Query, Req, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  // ?postId=123 형태로 호출합니다.
  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any, @Query('postId') postId: string) {
    return this.commentsService.listByPost(req.user.libraryId, parseInt(postId, 10));
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.commentsService.remove(req.user.libraryId, parseInt(id, 10));
  }
}