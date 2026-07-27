import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// 처음 이 도서관이 '목록' 기능을 쓸 때 자동으로 채워지는 기본값입니다.
const DEFAULT_OPTIONS: Record<string, string[]> = {
  STATUS: ['이용가능', '대출중', '예약됨', '수선중', '분실', '제적'],
  SPECIAL_CODE: ['아동'],
  LOCATION: ['2층 문학'],
};

// 예전에는 '상태'가 영문 코드(AVAILABLE 등)로 저장되어 있었어요.
// 새로 한글 값으로 바뀌면서, 기존 실물 자료들의 상태값도 딱 한 번 자동으로 바꿔줍니다.
const LEGACY_STATUS_MAP: Record<string, string> = {
  AVAILABLE: '이용가능',
  ON_LOAN: '대출중',
  RESERVED: '예약됨',
  REPAIR: '수선중',
  LOST: '분실',
  WITHDRAWN: '제적',
};

// 목록 종류(category)가 실제 Copy 테이블의 어느 칸(필드)과 연결되는지 알려주는 표입니다.
const CATEGORY_FIELD: Record<string, 'status' | 'specialCode' | 'location'> = {
  STATUS: 'status',
  SPECIAL_CODE: 'specialCode',
  LOCATION: 'location',
};

@Injectable()
export class CopyOptionsService {
  constructor(private prisma: PrismaService) {}

  // 전체 목록(상태/별치기호/소장처)을 한 번에 가져옵니다.
  // 이 도서관에 목록이 하나도 없으면(=처음 쓰는 경우), 기본값을 자동으로 채워 넣습니다.
  async listAll(libraryId: number) {
    const count = await this.prisma.copyOption.count({ where: { libraryId } });

    if (count === 0) {
      const data: { libraryId: number; category: string; value: string; order: number }[] = [];
      for (const category of Object.keys(DEFAULT_OPTIONS)) {
        DEFAULT_OPTIONS[category].forEach((value, i) => {
          data.push({ libraryId, category, value, order: i });
        });
      }
      await this.prisma.copyOption.createMany({ data });

      // 기존 실물 자료 중 예전 영문 상태값을 쓰고 있는 게 있으면, 새 한글 값으로 딱 한 번 바꿔줍니다.
      for (const [oldCode, newValue] of Object.entries(LEGACY_STATUS_MAP)) {
        await this.prisma.copy.updateMany({
          where: { libraryId, status: oldCode },
          data: { status: newValue },
        });
      }
    }

    const options = await this.prisma.copyOption.findMany({
      where: { libraryId },
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { id: 'asc' }],
    });

    return {
      STATUS: options.filter((o) => o.category === 'STATUS'),
      SPECIAL_CODE: options.filter((o) => o.category === 'SPECIAL_CODE'),
      LOCATION: options.filter((o) => o.category === 'LOCATION'),
    };
  }

  // 값 추가
  async create(libraryId: number, data: any) {
    const category = data.category;
    if (!CATEGORY_FIELD[category]) {
      throw new BadRequestException('알 수 없는 목록 종류입니다.');
    }
    const value = String(data.value || '').trim();
    if (!value) {
      throw new BadRequestException('값을 입력하세요.');
    }
    const count = await this.prisma.copyOption.count({ where: { libraryId, category } });
    try {
      return await this.prisma.copyOption.create({
        data: { libraryId, category, value, order: count },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 값입니다.');
      }
      throw e;
    }
  }

  // 값 수정 - 이 값을 쓰고 있던 실물 자료들도 함께 수정된 값으로 바꿔줍니다.
  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.copyOption.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('값을 찾을 수 없습니다.');
    }
    const newValue = String(data.value || '').trim();
    if (!newValue) {
      throw new BadRequestException('값을 입력하세요.');
    }
    if (newValue === existing.value) {
      return existing;
    }

    const field = CATEGORY_FIELD[existing.category];

    try {
      const [updatedOption] = await this.prisma.$transaction([
        this.prisma.copyOption.update({ where: { id }, data: { value: newValue } }),
        this.prisma.copy.updateMany({
          where: { libraryId, [field]: existing.value },
          data: { [field]: newValue },
        }),
      ]);
      return updatedOption;
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 값입니다.');
      }
      throw e;
    }
  }

  // 값 삭제 - 최소 1개는 남아있어야 하고, 이 값을 쓰는 자료가 있으면 삭제할 수 없습니다.
  async remove(libraryId: number, id: number) {
    const existing = await this.prisma.copyOption.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('값을 찾을 수 없습니다.');
    }

    const siblingCount = await this.prisma.copyOption.count({
      where: { libraryId, category: existing.category },
    });
    if (siblingCount <= 1) {
      throw new BadRequestException('최소 1개의 값은 남아있어야 합니다.');
    }

    const field = CATEGORY_FIELD[existing.category];
    const usedCopies = await this.prisma.copy.findMany({
      where: { libraryId, [field]: existing.value },
      select: { registrationNo: true },
      orderBy: { registrationNo: 'asc' },
      take: 6, // 5개까지만 보여주고, 6번째가 있으면 "더 있다"는 표시만 합니다.
    });

    if (usedCopies.length > 0) {
      const totalCount = await this.prisma.copy.count({
        where: { libraryId, [field]: existing.value },
      });
      const shown = usedCopies.slice(0, 5).map((c) => c.registrationNo);
      const shownText = usedCopies.length > 5 ? `${shown.join(', ')}, ...` : shown.join(', ');
      throw new BadRequestException(
        `이 값을 사용 중인 실물 자료가 있어 삭제할 수 없습니다. (등록번호: ${shownText}) (총 ${totalCount}권)`,
      );
    }

    await this.prisma.copyOption.delete({ where: { id } });
    return { success: true };
  }
}