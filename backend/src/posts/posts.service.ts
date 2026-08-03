import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MaterialRequestTypesService } from '../settings/material-request-types.service';

// 자료신청 처리 상태 목록입니다.
export const MATERIAL_REQUEST_STATUSES = ['REQUESTED', 'PURCHASING', 'PURCHASED', 'NOT_PURCHASED'];

const PAGE_SIZE = 15;

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private materialRequestTypesService: MaterialRequestTypesService,
  ) {}

  // 본문(HTML) 안에서 가장 처음 나오는 <img> 태그의 src 값을 찾아냅니다. 썸네일형 게시판의 목록 대표 이미지로 씁니다.
  private extractFirstImage(content: string): string | null {
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  // '자료를 신청합니다' 게시판 글쓰기 화면의 드롭다운에 쓸 목록을 내려줍니다. (자료 종류는 설정 > 자료 메뉴에서 관리합니다.)
  async getMaterialRequestOptions(libraryId: number) {
    const types = await this.materialRequestTypesService.list(libraryId);
    return { types: types.map((t) => t.value), statuses: MATERIAL_REQUEST_STATUSES };
  }

  // 글 목록 조회 (페이지 단위). 최신 글이 위로 오도록 정렬합니다.
  async list(libraryId: number, boardId: number, page: number) {
    const board = await this.prisma.board.findFirst({ where: { id: boardId, libraryId } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: { libraryId, boardId },
        include: { authorUser: { select: { name: true } }, materialRequest: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.post.count({ where: { libraryId, boardId } }),
    ]);

    return {
      board,
      items: items.map((p) => ({
        id: p.id,
        title: p.title,
        thumbnailUrl: p.thumbnailUrl,
        authorName: p.authorUser?.name || p.guestName || '',
        viewCount: p.viewCount,
        createdAt: p.createdAt,
        materialRequestStatus: p.materialRequest?.status || null,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  // 글 하나 상세 조회.
  async findOne(libraryId: number, id: number) {
    const post = await this.prisma.post.findFirst({
      where: { id, libraryId },
      include: { board: true, authorUser: { select: { name: true } }, materialRequest: true },
    });
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    return post;
  }

  // 글 작성. 지금은 관리자만 쓸 수 있으므로, 작성자는 항상 로그인한 관리자(authorUserId)로 저장됩니다.
  async create(libraryId: number, authorUserId: number, data: any) {
    const boardId = Number(data.boardId);
    const board = await this.prisma.board.findFirst({ where: { id: boardId, libraryId } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }

    const title = String(data.title || '').trim();
    const content = String(data.content || '').trim();
    if (!title) {
      throw new BadRequestException('제목을 입력하세요.');
    }
    if (!content) {
      throw new BadRequestException('내용을 입력하세요.');
    }

    let materialRequestData: any = null;
    if (board.isMaterialRequest) {
      const requestType = String(data.requestType || '').trim();
      const validTypes = (await this.materialRequestTypesService.list(libraryId)).map((t) => t.value);
      if (!validTypes.includes(requestType)) {
        throw new BadRequestException('신청 자료 종류를 올바르게 선택하세요.');
      }
      materialRequestData = {
        requestType,
        author: data.requestAuthor ? String(data.requestAuthor).trim() : null,
      };
    }

    const thumbnailUrl = this.extractFirstImage(content);

    return this.prisma.post.create({
      data: {
        libraryId,
        boardId,
        title,
        content,
        thumbnailUrl,
        authorUserId,
        ...(materialRequestData
          ? { materialRequest: { create: materialRequestData } }
          : {}),
      },
      include: { materialRequest: true },
    });
  }

  // 글 수정. 제목/내용과 (자료신청 게시판이면) 신청 자료 종류·저자·처리 상태를 바꿀 수 있습니다.
  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.post.findFirst({
      where: { id, libraryId },
      include: { board: true, materialRequest: true },
    });
    if (!existing) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    const title = data.title !== undefined ? String(data.title).trim() : existing.title;
    const content = data.content !== undefined ? String(data.content).trim() : existing.content;
    if (!title) {
      throw new BadRequestException('제목을 입력하세요.');
    }
    if (!content) {
      throw new BadRequestException('내용을 입력하세요.');
    }
    const thumbnailUrl = this.extractFirstImage(content);

    if (existing.board.isMaterialRequest) {
      const requestType =
        data.requestType !== undefined ? String(data.requestType).trim() : existing.materialRequest?.requestType;
      const validTypes = (await this.materialRequestTypesService.list(libraryId)).map((t) => t.value);
      if (!validTypes.includes(String(requestType))) {
        throw new BadRequestException('신청 자료 종류를 올바르게 선택하세요.');
      }
      const requestAuthor =
        data.requestAuthor !== undefined ? String(data.requestAuthor).trim() : existing.materialRequest?.author;
      const status =
        data.status !== undefined ? String(data.status).trim() : existing.materialRequest?.status;
      if (!MATERIAL_REQUEST_STATUSES.includes(String(status))) {
        throw new BadRequestException('처리 상태를 올바르게 선택하세요.');
      }

      await this.prisma.materialRequest.upsert({
        where: { postId: id },
        create: { postId: id, requestType: String(requestType), author: requestAuthor || null, status: String(status) },
        update: { requestType: String(requestType), author: requestAuthor || null, status: String(status) },
      });
    }

    return this.prisma.post.update({
      where: { id },
      data: { title, content, thumbnailUrl },
      include: { materialRequest: true },
    });
  }

  // 글 삭제. 댓글, 자료신청 추가정보가 있으면 함께 지웁니다.
  async remove(libraryId: number, id: number) {
    const existing = await this.prisma.post.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({ where: { postId: id } }),
      this.prisma.materialRequest.deleteMany({ where: { postId: id } }),
      this.prisma.post.delete({ where: { id } }),
    ]);

    return { success: true };
  }
}