import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BoardsService } from '../settings/boards.service';
import { PostsService } from '../posts/posts.service';

// 로그인 없이 누구나 볼 수 있는 게시판 목록/글목록 API입니다. (홈페이지에서 씁니다)
@Controller('public/boards')
export class PublicBoardsController {
  constructor(
    private prisma: PrismaService,
    private boardsService: BoardsService,
    private postsService: PostsService,
  ) {}

  // 지금은 도서관이 하나뿐인 시스템이라, 로그인 정보 없이도 첫 번째 도서관을 그대로 씁니다.
  private async getLibraryId() {
    const library = await this.prisma.library.findFirst();
    if (!library) {
      throw new NotFoundException('도서관 정보를 찾을 수 없습니다.');
    }
    return library.id;
  }

  // 게시판 10개 목록
  @Get()
  async list() {
    const libraryId = await this.getLibraryId();
    return this.boardsService.list(libraryId);
  }

  // 특정 게시판의 글 목록 (예: /public/boards/notice/posts?page=1)
  @Get(':code/posts')
  async listPosts(@Param('code') code: string, @Query('page') page = '1') {
    const libraryId = await this.getLibraryId();
    return this.postsService.listPublic(libraryId, code, parseInt(page, 10) || 1);
  }
}