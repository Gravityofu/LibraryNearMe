import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// 처음 이 도서관이 '회원 구분' 기능을 쓸 때 자동으로 채워지는 기본값입니다.
const DEFAULT_MEMBER_TYPES = ['개인회원', '단체회원', '자료지원회원'];

@Injectable()
export class MemberTypesService {
  constructor(private prisma: PrismaService) {}

  // 목록 조회. 이 도서관에 회원 구분이 하나도 없으면, 기본 3개를 자동으로 채워 넣습니다.
  async list(libraryId: number) {
    const count = await this.prisma.memberType.count({ where: { libraryId } });
    if (count === 0) {
      await this.prisma.memberType.createMany({
        data: DEFAULT_MEMBER_TYPES.map((name, i) => ({ libraryId, name, order: i })),
      });
    }
    return this.prisma.memberType.findMany({
      where: { libraryId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  // 값 추가
  async create(libraryId: number, data: any) {
    const name = String(data.name || '').trim();
    if (!name) {
      throw new BadRequestException('이름을 입력하세요.');
    }
    const count = await this.prisma.memberType.count({ where: { libraryId } });
    try {
      return await this.prisma.memberType.create({
        data: { libraryId, name, order: count },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 이름입니다.');
      }
      throw e;
    }
  }

  // 값 수정 - User.memberTypeId가 실제 관계(FK)로 연결되어 있어서,
  // 이름만 바꾸면 이 구분을 쓰는 회원들에게도 자동으로 새 이름이 반영됩니다. (따로 손댈 것이 없습니다.)
  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.memberType.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('회원 구분을 찾을 수 없습니다.');
    }
    const name = String(data.name || '').trim();
    if (!name) {
      throw new BadRequestException('이름을 입력하세요.');
    }
    if (name === existing.name) {
      return existing;
    }
    try {
      return await this.prisma.memberType.update({ where: { id }, data: { name } });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 이름입니다.');
      }
      throw e;
    }
  }

  // 삭제 - 최소 1개는 남아있어야 하고, 이 구분을 쓰는 회원이 있으면 삭제할 수 없습니다.
  async remove(libraryId: number, id: number) {
    const existing = await this.prisma.memberType.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('회원 구분을 찾을 수 없습니다.');
    }

    const siblingCount = await this.prisma.memberType.count({ where: { libraryId } });
    if (siblingCount <= 1) {
      throw new BadRequestException('최소 1개의 회원 구분은 남아있어야 합니다.');
    }

    const usedUsers = await this.prisma.user.findMany({
      where: { libraryId, memberTypeId: id },
      select: { name: true },
      orderBy: { name: 'asc' },
      take: 6, // 5명까지만 보여주고, 6번째가 있으면 "더 있다"는 표시만 합니다.
    });

    if (usedUsers.length > 0) {
      const totalCount = await this.prisma.user.count({ where: { libraryId, memberTypeId: id } });
      const shown = usedUsers.slice(0, 5).map((u) => u.name);
      const shownText = usedUsers.length > 5 ? `${shown.join(', ')}, ...` : shown.join(', ');
      throw new BadRequestException(
        `이 구분을 사용 중인 회원이 있어 삭제할 수 없습니다. (이름: ${shownText}) (총 ${totalCount}명)`,
      );
    }

    await this.prisma.memberType.delete({ where: { id } });
    return { success: true };
  }
}