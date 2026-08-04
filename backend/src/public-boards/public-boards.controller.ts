import { Controller, ForbiddenException, Get, NotFoundException, Param, Post, Body, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { PostsService } from '../posts/posts.service';

// 로그인 없이 누구나 볼 수 있는 글 상세 API + 회원/비회원 글쓰기 API입니다.
@Controller('public/posts')
export class PublicPostsController {
  constructor(
    private prisma: PrismaService,
    private postsService: PostsService,
    private jwt: JwtService,
  ) {}

  private async getLibraryId() {
    const library = await this.prisma.library.findFirst();
    if (!library) {
      throw new NotFoundException('도서관 정보를 찾을 수 없습니다.');
    }
    return library.id;
  }

  // 로그인한 회원이면 그 회원의 id를, 로그인하지 않았거나 토큰이 잘못됐으면 null을 돌려줍니다.
  // (관리자 전용 AdminGuard와 달리, 이 API는 로그인 안 해도 일단 통과시키고 회원인지만 구분합니다.)
  private async getOptionalUserId(req: any): Promise<number | null> {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
      return payload.sub;
    } catch {
      return null;
    }
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    const libraryId = await this.getLibraryId();
    return this.postsService.findOnePublic(libraryId, parseInt(id, 10));
  }

  // 홈페이지에서 글쓰기. 게시판이 회원 글쓰기를 허용해야 하고, 비회원이라면 그 게시판이
  // 비회원 글쓰기까지 허용해야만 저장됩니다.
  @Post()
  async createPost(@Req() req: any, @Body() body: any) {
    const libraryId = await this.getLibraryId();
    const board = await this.prisma.board.findFirst({ where: { id: Number(body.boardId), libraryId } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }
    if (!board.allowMemberWrite) {
      throw new ForbiddenException('이 게시판은 글쓰기를 지원하지 않습니다.');
    }

    const authorUserId = await this.getOptionalUserId(req);
    if (!authorUserId && !board.allowGuestWrite) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    return this.postsService.create(libraryId, authorUserId, body);
  }
}