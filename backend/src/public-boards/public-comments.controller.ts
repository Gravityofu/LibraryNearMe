import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

// 로그인 없이도 볼 수 있는 댓글 목록 + 회원/비회원 댓글 작성·수정·삭제 API입니다. (홈페이지에서 씁니다)
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

  // 댓글을 수정하거나 삭제해도 되는지 확인합니다.
  // 회원 댓글이면 로그인한 회원 본인인지, 비회원 댓글이면 비밀번호가 맞는지 확인합니다.
  private async assertCommentOwnership(comment: any, userId: number | null, guestPassword?: string) {
    if (comment.authorUserId) {
      if (!userId || comment.authorUserId !== userId) {
        throw new ForbiddenException('본인이 작성한 댓글만 수정·삭제할 수 있습니다.');
      }
    } else {
      if (!guestPassword || !comment.guestPasswordHash) {
        throw new ForbiddenException('비밀번호를 입력하세요.');
      }
      const match = await bcrypt.compare(guestPassword, comment.guestPasswordHash);
      if (!match) {
        throw new ForbiddenException('비밀번호가 일치하지 않습니다.');
      }
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

    // 로그인한 회원이면 그 게시판이 '회원 댓글'을 허용하는지, 비회원이면 '비회원 댓글'을 허용하는지 확인합니다.
    if (authorUserId && !post.board.allowMemberComment) {
      throw new ForbiddenException('이 게시판은 회원 댓글을 허용하지 않습니다.');
    }

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

  // 댓글 수정. body에 { content, guestPassword? } 를 실어서 호출합니다.
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const libraryId = await this.getLibraryId();
    const comment = await this.prisma.comment.findFirst({ where: { id: parseInt(id, 10), libraryId } });
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    const content = String(body.content || '').trim();
    if (!content) {
      throw new BadRequestException('댓글 내용을 입력하세요.');
    }

    const userId = await this.getOptionalUserId(req);
    await this.assertCommentOwnership(comment, userId, body.guestPassword);

    return this.prisma.comment.update({
      where: { id: comment.id },
      data: { content },
      include: { authorUser: { select: { name: true } } },
    });
  }

  // 댓글 삭제. 비회원 댓글이면 body에 { guestPassword } 를 실어서 호출합니다.
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const libraryId = await this.getLibraryId();
    const comment = await this.prisma.comment.findFirst({ where: { id: parseInt(id, 10), libraryId } });
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    const userId = await this.getOptionalUserId(req);
    await this.assertCommentOwnership(comment, userId, body?.guestPassword);

    await this.prisma.comment.delete({ where: { id: comment.id } });
    return { success: true };
  }
}