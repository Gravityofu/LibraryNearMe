import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  // 특정 글에 달린 댓글 목록 (오래된 순으로 정렬)
  async listByPost(libraryId: number, postId: number) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, libraryId } });
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    return this.prisma.comment.findMany({
      where: { postId },
      include: { authorUser: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // 댓글 삭제 (관리자는 어떤 댓글이든 지울 수 있습니다)
  async remove(libraryId: number, id: number) {
    const existing = await this.prisma.comment.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }
    await this.prisma.comment.delete({ where: { id } });
    return { success: true };
  }
}