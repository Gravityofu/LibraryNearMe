import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { MaterialRequestTypesService } from '../settings/material-request-types.service';

// 자료신청 처리 상태 목록입니다.
export const MATERIAL_REQUEST_STATUSES = ['REQUESTED', 'PURCHASING', 'PURCHASED', 'NOT_PURCHASED'];

const PAGE_SIZE = 15; // 목록형 게시판 한 페이지당 글 개수
const THUMBNAIL_PAGE_SIZE = 9; // 썸네일형 게시판 한 페이지당 글 개수 (3개씩 3줄)

// 글쓴이의 "실제 이름"을 그대로 보여줘도 되는 게시판 코드입니다. (회원/비회원이 직접 쓰는 게시판)
// 그 외의 게시판은 전부 관리자가 작성하므로, 글쓴이 자리에 관리자 이름 대신 도서관 이름을 보여줍니다.
const AUTHOR_REAL_NAME_BOARD_CODES = ['openBoard', 'materialRequest'];

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

  // 본문(HTML)에서 태그를 지우고 일정 길이로 잘라서, 목록에 보여줄 짧은 미리보기 글을 만듭니다.
  private stripHtmlExcerpt(content: string, max = 80): string {
    const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, max) + '...' : text;
  }

  // 키워드 문자열("도서관,여름,독서")을 배열로 바꿉니다.
  private parseKeywords(keywords: string | null): string[] {
    if (!keywords) return [];
    return keywords.split(',').map((k) => k.trim()).filter(Boolean);
  }

  // 글쓴이 자리에 보여줄 이름을 정합니다.
  // openBoard/materialRequest는 실제 작성자 이름을, 그 외의 게시판은 도서관 이름을 돌려줍니다.
  private async getDisplayAuthorName(libraryId: number, boardCode: string, realName: string): Promise<string> {
    if (AUTHOR_REAL_NAME_BOARD_CODES.includes(boardCode)) {
      return realName;
    }
    const library = await this.prisma.library.findUnique({ where: { id: libraryId } });
    return library?.name || realName;
  }

  // 글에 썸네일(첨부 사진)이 없을 때 대신 쓸 사진을 정합니다.
  // 우선순위: 글 자체의 썸네일 → 게시판 기본 썸네일 → 도서관 기본 썸네일 → 없음
  private resolveThumbnailUrl(postThumbnailUrl: string | null, boardDefault: string | null, libraryDefault: string | null | undefined): string | null {
    return postThumbnailUrl || boardDefault || libraryDefault || null;
  }

  // '자료를 신청합니다' 게시판 글쓰기 화면의 드롭다운에 쓸 목록을 내려줍니다. (자료 종류는 설정 > 자료 메뉴에서 관리합니다.)
  async getMaterialRequestOptions(libraryId: number) {
    const types = await this.materialRequestTypesService.list(libraryId);
    return { types: types.map((t) => t.value), statuses: MATERIAL_REQUEST_STATUSES };
  }

  // 글 목록 조회 (페이지 단위). 최신 글이 위로 오도록 정렬합니다. (관리자용)
  async list(libraryId: number, boardId: number, page: number) {
    const board = await this.prisma.board.findFirst({ where: { id: boardId, libraryId } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }
    const library = await this.prisma.library.findUnique({ where: { id: libraryId } });

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
        thumbnailUrl: this.resolveThumbnailUrl(p.thumbnailUrl, board.defaultThumbnailUrl, library?.defaultThumbnailUrl),
        authorName: p.authorUser?.name || p.guestName || '',
        viewCount: p.viewCount,
        createdAt: p.createdAt,
        materialRequestTitle: p.materialRequest?.title || null,
        materialRequestStatus: p.materialRequest?.status || null,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  // 글 목록 조회 - 누구나 볼 수 있는 홈페이지용입니다. 게시판 코드(예: "notice")로 찾습니다.
  // 썸네일형 게시판은 한 페이지에 9개, 목록형 게시판은 15개씩 보여줍니다.
  async listPublic(libraryId: number, boardCode: string, page: number) {
    const board = await this.prisma.board.findFirst({ where: { code: boardCode, libraryId } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }

    const pageSize = board.listStyle === 'THUMBNAIL' ? THUMBNAIL_PAGE_SIZE : PAGE_SIZE;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: { libraryId, boardId: board.id },
        include: { authorUser: { select: { name: true } }, materialRequest: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.post.count({ where: { libraryId, boardId: board.id } }),
    ]);

    const isRealNameBoard = AUTHOR_REAL_NAME_BOARD_CODES.includes(board.code);
    const library = await this.prisma.library.findUnique({ where: { id: libraryId } });

    return {
      board,
      items: items.map((p) => ({
        id: p.id,
        title: p.title,
        thumbnailUrl: this.resolveThumbnailUrl(p.thumbnailUrl, board.defaultThumbnailUrl, library?.defaultThumbnailUrl),
        contentExcerpt: this.stripHtmlExcerpt(p.content),
        keywords: this.parseKeywords(p.keywords),
        authorName: isRealNameBoard ? p.authorUser?.name || p.guestName || '' : library?.name || '',
        viewCount: p.viewCount,
        createdAt: p.createdAt,
        materialRequestStatus: p.materialRequest?.status || null,
      })),
      total,
      page,
      pageSize,
    };
  }

  // 글 하나 상세 조회. (관리자용 - 조회수가 올라가지 않습니다)
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

  // 글 하나 상세 조회 - 누구나 볼 수 있는 홈페이지용입니다. 볼 때마다 조회수가 1 올라갑니다.
  async findOnePublic(libraryId: number, id: number) {
    const post = await this.prisma.post.findFirst({
      where: { id, libraryId },
      include: { board: true, authorUser: { select: { name: true } }, materialRequest: true },
    });
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    await this.prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    const realName = post.authorUser?.name || post.guestName || '';
    const authorName = await this.getDisplayAuthorName(libraryId, post.board.code, realName);

    return {
      ...post,
      viewCount: post.viewCount + 1,
      keywords: this.parseKeywords(post.keywords),
      authorName,
    };
  }

  // 글 작성. 관리자는 항상 로그인한 관리자(authorUserId)로 저장됩니다.
  // 홈페이지에서는 로그인한 회원이면 그 회원으로, 비회원(비로그인)이면 authorUserId가 null로 넘어오고
  // 이름·비밀번호(guestName/guestPassword)를 받아서 비밀번호는 암호화해 저장합니다.
  async create(libraryId: number, authorUserId: number | null, data: any) {
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
    const keywords = data.keywords !== undefined ? String(data.keywords).trim() : '';

    // 비회원(비로그인) 글쓰기라면 이름과 비밀번호(4자 이상)를 받습니다. 비밀번호는 로그인 비밀번호와
    // 같은 방식(bcrypt)으로 암호화해서 저장합니다.
    let guestName: string | null = null;
    let guestPasswordHash: string | null = null;
    if (!authorUserId) {
      guestName = String(data.guestName || '').trim();
      if (!guestName) {
        throw new BadRequestException('작성자 이름을 입력하세요.');
      }
      const guestPassword = String(data.guestPassword || '');
      if (guestPassword.length < 4) {
        throw new BadRequestException('비밀번호는 4자 이상 입력하세요.');
      }
      guestPasswordHash = await bcrypt.hash(guestPassword, 10);
    }

    let materialRequestData: any = null;
    if (board.isMaterialRequest) {
      const materialTitle = String(data.materialTitle || '').trim();
      if (!materialTitle) {
        throw new BadRequestException('타이틀을 입력하세요.');
      }
      const requestType = String(data.requestType || '').trim();
      const validTypes = (await this.materialRequestTypesService.list(libraryId)).map((t) => t.value);
      if (!validTypes.includes(requestType)) {
        throw new BadRequestException('신청 자료 종류를 올바르게 선택하세요.');
      }
      materialRequestData = {
        title: materialTitle,
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
        keywords: keywords || null,
        thumbnailUrl,
        authorUserId: authorUserId || undefined,
        guestName,
        guestPasswordHash,
        ...(materialRequestData
          ? { materialRequest: { create: materialRequestData } }
          : {}),
      },
      include: { materialRequest: true },
    });
  }

  // 글 수정. 제목/내용/키워드와 (자료신청 게시판이면) 타이틀·신청 자료 종류·저자·처리 상태를 바꿀 수 있습니다.
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
    const keywords = data.keywords !== undefined ? String(data.keywords).trim() : existing.keywords;
    const thumbnailUrl = this.extractFirstImage(content);

    if (existing.board.isMaterialRequest) {
      const materialTitle =
        data.materialTitle !== undefined ? String(data.materialTitle).trim() : existing.materialRequest?.title;
      if (!materialTitle) {
        throw new BadRequestException('타이틀을 입력하세요.');
      }
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
        create: {
          postId: id,
          title: String(materialTitle),
          requestType: String(requestType),
          author: requestAuthor || null,
          status: String(status),
        },
        update: {
          title: String(materialTitle),
          requestType: String(requestType),
          author: requestAuthor || null,
          status: String(status),
        },
      });
    }

    return this.prisma.post.update({
      where: { id },
      data: { title, content, keywords: keywords || null, thumbnailUrl },
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