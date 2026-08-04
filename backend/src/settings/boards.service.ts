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
];

@Injectable()
export class BoardsService {
  constructor(private prisma: PrismaService) {}

  // 목록 조회. 이 도서관에 게시판이 하나도 없으면, 기본 10개를 자동으로 채워 넣습니다.
  async list(libraryId: number) {
    const count = await this.prisma.board.count({ where: { libraryId } });
    if (count === 0) {
      await this.prisma.board.createMany({
        data: DEFAULT_BOARDS.map((b, i) => ({ ...b, libraryId, order: i })),
      });
    }
    return this.prisma.board.findMany({
      where: { libraryId },
      orderBy: { order: 'asc' },
    });
  }

  // 게시판 설정 수정. 지금 단계에서는 '비로그인 글쓰기', '회원 댓글', '비로그인 댓글' 허용 여부만 바꿀 수 있습니다.
  // (게시판 이름/목록 스타일 수정, 게시판 추가·삭제는 나중에 만들 '게시판 관리' 기능에서 다룹니다.)
  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.board.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }

    const updateData: any = {};

    if (data.allowGuestWrite !== undefined) {
      // 회원만 글을 쓸 수 있는 게시판(=allowMemberWrite가 false인 게시판)은
      // 비로그인 글쓰기 설정 자체가 의미가 없으므로 항상 false로 저장합니다.
      updateData.allowGuestWrite = existing.allowMemberWrite ? !!data.allowGuestWrite : false;
    }

    if (data.allowMemberComment !== undefined) {
      updateData.allowMemberComment = !!data.allowMemberComment;
    }

    if (data.allowGuestComment !== undefined) {
      updateData.allowGuestComment = !!data.allowGuestComment;
    }

    return this.prisma.board.update({ where: { id }, data: updateData });
  }
}