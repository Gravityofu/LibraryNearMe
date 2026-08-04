import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Post, Body, Query, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

// 로그인 없이도 볼 수 있는 댓글 목록 + 회원/비회원 댓글 작성 API입니다. (홈페이지에서 씁니다)
@Controller('public/comments')
export class PublicCommentsController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async getLibraryId() {
    const library = await this.prisma.library.findFirst();
    if (!library) {
      throw new NotFoundException('도서관 정보를 찾을 수 없습니다.');
    }
    return library.id;
  }

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

  // ?postId=123 형태로 호출합니다. 오래된 순으로 보여줍니다.
  @Get()
  async list(@Query('postId') postId: string) {
    const libraryId = await this.getLibraryId();
    const post = await this.prisma.post.findFirst({ where: { id: parseInt(postId, 10), libraryId } });
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    return this.prisma.comment.findMany({
      where: { postId: post.id },
      include: { authorUser: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // 댓글 작성. 로그인한 회원이면 그 회원 이름으로, 비회원이면 그 게시판이 '비회원 댓글'을
  // 허용할 때만 이름·비밀번호를 받아서 저장합니다.
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const libraryId = await this.getLibraryId();
    const post = await this.prisma.post.findFirst({
      where: { id: Number(body.postId), libraryId },
      include: { board: true },
    });
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    const content = String(body.content || '').trim();
    if (!content) {
      throw new BadRequestException('댓글 내용을 입력하세요.');
    }

    const authorUserId = await this.getOptionalUserId(req);

    let guestName: string | null = null;
    let guestPasswordHash: string | null = null;
    if (!authorUserId) {
      if (!post.board.allowGuestComment) {
        throw new ForbiddenException('로그인이 필요합니다.');
      }
      guestName = String(body.guestName || '').trim();
      if (!guestName) {
        throw new BadRequestException('작성자 이름을 입력하세요.');
      }
      const guestPassword = String(body.guestPassword || '');
      if (guestPassword.length < 4) {
        throw new BadRequestException('비밀번호는 4자 이상 입력하세요.');
      }
      guestPasswordHash = await bcrypt.hash(guestPassword, 10);
    }

    return this.prisma.comment.create({
      data: {
        libraryId,
        postId: post.id,
        content,
        authorUserId: authorUserId || undefined,
        guestName,
        guestPasswordHash,
      },
      include: { authorUser: { select: { name: true } } },
    });
  }
}