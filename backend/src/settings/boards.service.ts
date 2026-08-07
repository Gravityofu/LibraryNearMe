import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// 처음 이 도서관이 게시판 기능을 쓸 때 자동으로 채워지는 기본 10개 게시판입니다.
// order(순서)가 곧 관리자 페이지·홈페이지에 보이는 순서입니다.
const DEFAULT_BOARDS = [
  { code: 'newArrivals', name: '새로 들어온 자료', listStyle: 'THUMBNAIL', allowMemberWrite: false, isMaterialRequest: false },
  { code: 'collection', name: '컬렉션', listStyle: 'THUMBNAIL', allowMemberWrite: false, isMaterialRequest: false },
  { code: 'refService', name: '참고서비스', listStyle: 'LIST', allowMemberWrite: false, isMaterialRequest: false },
  { code: 'scrap', name: '스크랩', listStyle: 'THUMBNAIL', allowMemberWrite: false, isMaterialRequest: false },
  { code: 'dailyQuote', name: '오늘 마주친 한 구절', listStyle: 'THUMBNAIL', allowMemberWrite: false, isMaterialRequest: false },
  { code: 'notice', name: '공지', listStyle: 'THUMBNAIL', allowMemberWrite: false, isMaterialRequest: false },
  { code: 'news', name: '소식', listStyle: 'THUMBNAIL', allowMemberWrite: false, isMaterialRequest: false },
  { code: 'openBoard', name: '열린 게시판', listStyle: 'THUMBNAIL', allowMemberWrite: true, isMaterialRequest: false },
  { code: 'faq', name: '자주 묻는 질문', listStyle: 'LIST', allowMemberWrite: false, isMaterialRequest: false },
  { code: 'materialRequest', name: '자료를 신청합니다', listStyle: 'LIST', allowMemberWrite: true, isMaterialRequest: true },
  { code: 'counsel', name: '1:1 상담', listStyle: 'LIST', allowMemberWrite: true, isMaterialRequest: false },
];

@Injectable()
export class BoardsService {
  constructor(private prisma: PrismaService) {}

  // 목록 조회. 이 도서관에 게시판이 하나도 없으면, 기본 게시판들을 자동으로 채워 넣습니다.
  // 이미 게시판이 있는 도서관이라도, DEFAULT_BOARDS에 새로 추가된 게시판(예: '1:1 상담')이
  // 아직 없다면 그것만 추가로 채워 넣습니다. (나중에 새 기본 게시판을 추가할 때마다
  // 이 방식으로 기존 도서관에도 자동으로 반영됩니다.)
  async list(libraryId: number) {
    const existingBoards = await this.prisma.board.findMany({ where: { libraryId } });

    if (existingBoards.length === 0) {
      await this.prisma.board.createMany({
        data: DEFAULT_BOARDS.map((b, i) => ({ ...b, libraryId, order: i })),
      });
    } else {
      const existingCodes = existingBoards.map((b) => b.code);
      const missingBoards = DEFAULT_BOARDS.filter((b) => !existingCodes.includes(b.code));
      if (missingBoards.length > 0) {
        const maxOrder = existingBoards.reduce((max, b) => Math.max(max, b.order), -1);
        await this.prisma.board.createMany({
          data: missingBoards.map((b, i) => ({ ...b, libraryId, order: maxOrder + 1 + i })),
        });
      }
    }

    return this.prisma.board.findMany({
      where: { libraryId },
      orderBy: { order: 'asc' },
    });
  }

  // 게시판 설정 수정. '회원 글쓰기', '비회원 글쓰기', '회원 댓글', '비회원 댓글' 허용 여부와
  // 이 게시판의 기본 썸네일을 바꿀 수 있습니다.
  // (게시판 이름/목록 스타일 수정, 게시판 추가·삭제는 나중에 만들 '게시판 관리' 기능에서 다룹니다.)
  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.board.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }

    const updateData: any = {};

    if (data.listStyle === 'LIST' || data.listStyle === 'THUMBNAIL') {
      updateData.listStyle = data.listStyle;
    }

    if (data.thumbnailRatio === 'WIDE' || data.thumbnailRatio === 'TALL') {
      updateData.thumbnailRatio = data.thumbnailRatio;
    }

    if (data.allowMemberWrite !== undefined) {
      updateData.allowMemberWrite = !!data.allowMemberWrite;
    }

    // 같은 저장 요청 안에서 '회원 글쓰기'도 함께 바뀔 수 있으므로, 방금 막 들어온 값이 있으면
    // 그 값을, 없으면 기존 DB 값을 기준으로 '비회원 글쓰기' 허용 여부를 계산합니다.
    const effectiveAllowMemberWrite =
      data.allowMemberWrite !== undefined ? !!data.allowMemberWrite : existing.allowMemberWrite;

    if (data.allowGuestWrite !== undefined) {
      // 회원만 글을 쓸 수 있는 게시판(=allowMemberWrite가 false인 게시판)은
      // 비회원 글쓰기 설정 자체가 의미가 없으므로 항상 false로 저장합니다.
      updateData.allowGuestWrite = effectiveAllowMemberWrite ? !!data.allowGuestWrite : false;
    }

    if (data.allowMemberComment !== undefined) {
      updateData.allowMemberComment = !!data.allowMemberComment;
    }

    if (data.allowGuestComment !== undefined) {
      updateData.allowGuestComment = !!data.allowGuestComment;
    }

    if (data.defaultThumbnailUrl !== undefined) {
      updateData.defaultThumbnailUrl = data.defaultThumbnailUrl || null;
    }

    return this.prisma.board.update({ where: { id }, data: updateData });
  }
}