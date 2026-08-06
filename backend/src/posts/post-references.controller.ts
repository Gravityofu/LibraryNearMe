import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PostReferencesService } from './post-references.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('post-references')
export class PostReferencesController {
  constructor(private postReferencesService: PostReferencesService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any, @Query('postId') postId: string) {
    return this.postReferencesService.list(req.user.libraryId, parseInt(postId, 10));
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.postReferencesService.create(req.user.libraryId, body);
  }

  @Patch('reorder')
  @UseGuards(AdminGuard)
  reorder(@Req() req: any, @Body() body: any) {
    const postId = Number(body.postId);
    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.map((v: any) => Number(v)) : [];
    if (!postId || orderedIds.length === 0) {
      throw new BadRequestException('postId와 orderedIds가 필요합니다.');
    }
    return this.postReferencesService.reorder(req.user.libraryId, postId, orderedIds);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.postReferencesService.remove(req.user.libraryId, parseInt(id, 10));
  }
}