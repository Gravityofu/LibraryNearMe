import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { MaterialRequestTypesService } from '../settings/material-request-types.service';

// 자료신청 처리 상태 목록입니다.
export const MATERIAL_REQUEST_STATUSES = ['REQUESTED', 'PURCHASING', 'PURCHASED', 'NOT_PURCHASED'];

const PAGE_SIZE = 15; // 목록형 게시판 한 페이지당 글 개수
const THUMBNAIL_PAGE_SIZE_WIDE = 9; // 썸네일형(가로형) 한 페이지당 글 개수 (3개씩 3줄)
const THUMBNAIL_PAGE_SIZE_TALL = 8; // 썸네일형(세로형) 한 페이지당 글 개수 (4개씩 2줄)

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

  // 홈페이지에서 글쓴이 자리에 보여줄 이름을 정합니다.
  // 글쓴이가 관리자(ADMIN/SUPER) 계정이면 "도서관 이름"을, 그 외(회원/비회원)면 실제 이름을 돌려줍니다.
  // 관리자 페이지 화면은 이 함수를 쓰지 않고 항상 실제 이름을 그대로 보여줍니다.
  private async getDisplayAuthorName(libraryId: number, authorRole: string | null, realName: string): Promise<string> {
    if (authorRole !== 'ADMIN' && authorRole !== 'SUPER') {
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

  // 참고자료 등록 모달의 '게시판' 탭 검색입니다. 제목·작성자·내용·키워드로 각각 검색할 수 있고,
  // 지금 참고자료를 등록하려는 그 글 자신(excludePostId)은 검색 결과에서 뺍니다.
  // 아무것도 입력하지 않으면 등록순(오래된 것부터)으로 모든 게시판의 모든 글이 나옵니다.
  async searchForReference(
    libraryId: number,
    excludePostId: number,
    filters: { title?: string; author?: string; content?: string; subject?: string },
    page: number,
  ) {
    const pageSize = 10;
    const AND: any[] = [{ id: { not: excludePostId } }];
    if (filters.title) AND.push({ title: { contains: filters.title, mode: 'insensitive' } });
    if (filters.content) AND.push({ content: { contains: filters.content, mode: 'insensitive' } });
    if (filters.subject) AND.push({ keywords: { contains: filters.subject, mode: 'insensitive' } });
    if (filters.author) {
      AND.push({
        OR: [
          { authorUser: { name: { contains: filters.author, mode: 'insensitive' } } },
          { guestName: { contains: filters.author, mode: 'insensitive' } },
        ],
      });
    }

    const where = { libraryId, AND };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        include: { board: true, authorUser: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        boardName: p.board.name,
        authorName: p.authorUser?.name || p.guestName || '',
        title: p.title,
      })),
      total,
      page,
      pageSize,
    };
  }

  // '자료를 신청합니다' 게시판 글쓰기 화면의 드롭다운에 쓸 목록을 내려줍니다. (자료 종류는 설정 > 자료 메뉴에서 관리합니다.)
  async getMaterialRequestOptions(libraryId: number) {
    const types = await this.materialRequestTypesService.list(libraryId);
    return { types: types.map((t) => t.value), statuses: MATERIAL_REQUEST_STATUSES };
  }

  // 글 목록 조회 (페이지 단위). 최신 글이 위로 오도록 정렬합니다. (관리자용 - 항상 실제 이름을 보여줍니다)
  async list(libraryId: number, boardId: number, page: number) {
    const board = await this.prisma.board.findFirst({ where: { id: boardId, libraryId } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }
    const library = await this.prisma.library.findUnique({ where: { id: libraryId } });

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: { libraryId, boardId },
        include: {
          authorUser: { select: { name: true } },
          materialRequest: true,
          _count: { select: { references: true } },
        },
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
        referenceCount: p._count.references,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  // 글 목록 조회 - 누구나 볼 수 있는 홈페이지용입니다. 게시판 코드(예: "notice")로 찾습니다.
  // 썸네일형 게시판은 한 페이지에 9개, 목록형 게시판은 15개씩 보여줍니다.
  async listPublic(libraryId: number, boardCode: string, page: number, viewerUserId: number | null) {
    const board = await this.prisma.board.findFirst({ where: { code: boardCode, libraryId } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }

    // '1:1 상담' 게시판은 로그인한 회원만 볼 수 있고, 그중에서도 본인이 쓴 글만 보입니다.
    if (board.code === 'counsel' && !viewerUserId) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }
    const ownerFilter = board.code === 'counsel' ? { authorUserId: viewerUserId! } : {};

    const pageSize =
      board.listStyle === 'THUMBNAIL'
        ? board.thumbnailRatio === 'TALL'
          ? THUMBNAIL_PAGE_SIZE_TALL
          : THUMBNAIL_PAGE_SIZE_WIDE
        : PAGE_SIZE;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: { libraryId, boardId: board.id, ...ownerFilter },
        include: { authorUser: { select: { name: true, role: true } }, materialRequest: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.post.count({ where: { libraryId, boardId: board.id, ...ownerFilter } }),
    ]);

    const library = await this.prisma.library.findUnique({ where: { id: libraryId } });

    return {
      board,
      items: items.map((p) => {
        const isAdminAuthor = p.authorUser?.role === 'ADMIN' || p.authorUser?.role === 'SUPER';
        return {
          id: p.id,
          title: p.title,
          thumbnailUrl: this.resolveThumbnailUrl(p.thumbnailUrl, board.defaultThumbnailUrl, library?.defaultThumbnailUrl),
          contentExcerpt: this.stripHtmlExcerpt(p.content),
          keywords: this.parseKeywords(p.keywords),
          authorName: isAdminAuthor ? library?.name || '' : p.authorUser?.name || p.guestName || '',
          viewCount: p.viewCount,
          createdAt: p.createdAt,
          materialRequestStatus: p.materialRequest?.status || null,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  // 글 하나 상세 조회. (관리자용 - 조회수가 올라가지 않고, 항상 실제 이름을 보여줍니다)
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

  // 글 하나 상세 조회 - 홈페이지용입니다. 볼 때마다 조회수가 1 올라갑니다.
  // ('1:1 상담' 게시판 글은 아무나 볼 수 있는 게 아니라, 글쓴이 본인만 볼 수 있습니다.)
  async findOnePublic(libraryId: number, id: number, viewerUserId: number | null) {
    const post = await this.prisma.post.findFirst({
      where: { id, libraryId },
      include: { board: true, authorUser: { select: { name: true, role: true } }, materialRequest: true },
    });
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    if (post.board.code === 'counsel' && post.authorUserId !== viewerUserId) {
      // 다른 사람의 상담 글이라는 사실 자체를 알려주지 않기 위해, 없는 글과 똑같은 오류로 처리합니다.
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    await this.prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    const realName = post.authorUser?.name || post.guestName || '';
    const authorName = await this.getDisplayAuthorName(libraryId, post.authorUser?.role ?? null, realName);

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

    const thumbnailUrl =
      data.scrapThumbnailUrl !== undefined
        ? String(data.scrapThumbnailUrl).trim() || null
        : this.extractFirstImage(content);

    // '스크랩' 게시판일 때만 쓰는 정보입니다. (기사 원문 주소·매체·기자·날짜)
    const scrapSourceUrl = data.scrapSourceUrl ? String(data.scrapSourceUrl).trim() : null;
    const scrapMedia = data.scrapMedia ? String(data.scrapMedia).trim() : null;
    const scrapReporter = data.scrapReporter ? String(data.scrapReporter).trim() : null;
    const scrapDate = data.scrapDate ? String(data.scrapDate).trim() : null;

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
        scrapSourceUrl,
        scrapMedia,
        scrapReporter,
        scrapDate,
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
    const thumbnailUrl =
      data.scrapThumbnailUrl !== undefined
        ? String(data.scrapThumbnailUrl).trim() || null
        : this.extractFirstImage(content);

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

    const scrapSourceUrl =
      data.scrapSourceUrl !== undefined ? String(data.scrapSourceUrl).trim() || null : existing.scrapSourceUrl;
    const scrapMedia = data.scrapMedia !== undefined ? String(data.scrapMedia).trim() || null : existing.scrapMedia;
    const scrapReporter =
      data.scrapReporter !== undefined ? String(data.scrapReporter).trim() || null : existing.scrapReporter;
    const scrapDate = data.scrapDate !== undefined ? String(data.scrapDate).trim() || null : existing.scrapDate;

    return this.prisma.post.update({
      where: { id },
      data: {
        title,
        content,
        keywords: keywords || null,
        thumbnailUrl,
        scrapSourceUrl,
        scrapMedia,
        scrapReporter,
        scrapDate,
      },
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