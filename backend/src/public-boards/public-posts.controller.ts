import { Controller, ForbiddenException, Get, NotFoundException, BadRequestException, Param, Post, Patch, Delete, Body, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { PostsService } from '../posts/posts.service';

// 로그인 없이 누구나 볼 수 있는 글 상세 API + 회원/비회원 글쓰기·수정·삭제 API입니다.
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

  // 로그인한 사용자면 { userId, role }을, 로그인하지 않았거나 토큰이 잘못됐으면 null을 돌려줍니다.
  private async getOptionalAuthUser(req: any): Promise<{ userId: number; role: string } | null> {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
      return { userId: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }

  // 관리자(ADMIN/SUPER) 계정은 홈페이지에서 글쓰기·수정·삭제를 할 수 없습니다.
  // 관리자는 관리자 페이지에서만 글을 관리해야 합니다.
  private assertNotAdmin(authUser: { userId: number; role: string } | null) {
    if (authUser && (authUser.role === 'ADMIN' || authUser.role === 'SUPER')) {
      throw new ForbiddenException('관리자 계정은 홈페이지에서 글을 작성·수정·삭제할 수 없습니다. 관리자 페이지를 이용해 주세요.');
    }
  }

  // 글을 수정·삭제해도 되는지 확인합니다. (댓글과 똑같은 방식입니다.)
  // 회원 글이면 로그인한 회원 본인인지, 비회원 글이면 비밀번호가 맞는지 확인합니다.
  private async assertPostOwnership(post: any, userId: number | null, guestPassword?: string) {
    if (post.authorUserId) {
      if (!userId || post.authorUserId !== userId) {
        throw new ForbiddenException('본인이 작성한 글만 수정·삭제할 수 있습니다.');
      }
    } else {
      if (!guestPassword || !post.guestPasswordHash) {
        throw new ForbiddenException('비밀번호를 입력하세요.');
      }
      const match = await bcrypt.compare(guestPassword, post.guestPasswordHash);
      if (!match) {
        throw new ForbiddenException('비밀번호가 일치하지 않습니다.');
      }
    }
  }

  @Get(':id')
  async getPost(@Req() req: any, @Param('id') id: string) {
    const libraryId = await this.getLibraryId();
    const authUser = await this.getOptionalAuthUser(req);
    return this.postsService.findOnePublic(libraryId, parseInt(id, 10), authUser?.userId ?? null);
  }

  // 홈페이지에서 글쓰기. 게시판이 회원 글쓰기를 허용해야 하고, 비회원이라면 그 게시판이
  // 비회원 글쓰기까지 허용해야만 저장됩니다. 관리자 계정은 이용할 수 없습니다.
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

    const authUser = await this.getOptionalAuthUser(req);
    this.assertNotAdmin(authUser);
    if (!authUser && !board.allowGuestWrite) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    return this.postsService.create(libraryId, authUser?.userId ?? null, body);
  }

  // 비회원 글을 수정하기 전에, 입력한 비밀번호가 맞는지만 먼저 확인합니다.
  // (수정 화면을 열기 전에, 여기서 통과해야만 화면을 보여줍니다.)
  @Post(':id/verify-password')
  async verifyPassword(@Param('id') id: string, @Body() body: any) {
    const libraryId = await this.getLibraryId();
    const post = await this.prisma.post.findFirst({ where: { id: parseInt(id, 10), libraryId } });
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    if (post.authorUserId) {
      throw new BadRequestException('회원 글은 비밀번호로 확인하지 않습니다.');
    }
    const guestPassword = String(body?.guestPassword || '');
    const match = post.guestPasswordHash
      ? await bcrypt.compare(guestPassword, post.guestPasswordHash)
      : false;
    if (!match) {
      throw new ForbiddenException('비밀번호가 일치하지 않습니다.');
    }
    return { valid: true };
  }

  // 홈페이지에서 글 수정. 회원 글이면 로그인 토큰으로, 비회원 글이면 body의 guestPassword로 확인합니다.
  // 관리자 계정은 이용할 수 없습니다.
  @Patch(':id')
  async updatePost(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const libraryId = await this.getLibraryId();
    const post = await this.prisma.post.findFirst({ where: { id: parseInt(id, 10), libraryId } });
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    if (post.answeredAt) {
      throw new ForbiddenException('답변이 등록된 글은 수정할 수 없습니다.');
    }
    const authUser = await this.getOptionalAuthUser(req);
    this.assertNotAdmin(authUser);
    await this.assertPostOwnership(post, authUser?.userId ?? null, body?.guestPassword);
    return this.postsService.update(libraryId, post.id, body);
  }

  // 홈페이지에서 글 삭제. 비회원 글이면 body에 { guestPassword } 를 실어서 호출합니다.
  // 관리자 계정은 이용할 수 없습니다.
  @Delete(':id')
  async removePost(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const libraryId = await this.getLibraryId();
    const post = await this.prisma.post.findFirst({ where: { id: parseInt(id, 10), libraryId } });
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    if (post.answeredAt) {
      throw new ForbiddenException('답변이 등록된 글은 삭제할 수 없습니다.');
    }
    const authUser = await this.getOptionalAuthUser(req);
    this.assertNotAdmin(authUser);
    await this.assertPostOwnership(post, authUser?.userId ?? null, body?.guestPassword);
    return this.postsService.remove(libraryId, post.id);
  }
}