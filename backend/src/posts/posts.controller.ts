import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  // '자료를 신청합니다' 게시판 글쓰기 화면에서 드롭다운에 쓸 목록을 내려줍니다.
  @Get('material-request-options')
  @UseGuards(AdminGuard)
  materialRequestOptions(@Req() req: any) {
    return this.postsService.getMaterialRequestOptions(req.user.libraryId);
  }

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any, @Query('boardId') boardId: string, @Query('page') page = '1') {
    return this.postsService.list(req.user.libraryId, parseInt(boardId, 10), parseInt(page, 10) || 1);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.postsService.findOne(req.user.libraryId, parseInt(id, 10));
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.postsService.create(req.user.libraryId, req.user.sub, body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.postsService.update(req.user.libraryId, parseInt(id, 10), body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.postsService.remove(req.user.libraryId, parseInt(id, 10));
  }
}