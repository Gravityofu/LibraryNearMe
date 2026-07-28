import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// 처음 이 도서관이 '목록' 기능을 쓸 때 자동으로 채워지는 기본값입니다.
const DEFAULT_OPTIONS: Record<string, string[]> = {
  STATUS: ['이용가능', '대출중', '예약됨', '수선중', '분실', '제적'],
  SPECIAL_CODE: ['아동'],
  FLOOR: ['1층', '2층', '지하1층'],
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
// FLOOR는 Copy 테이블에 직접 연결된 칸이 없어서(소장처를 통해서만 간접적으로 연결) 여기 없습니다.
const CATEGORY_FIELD: Record<string, 'status' | 'specialCode' | 'location'> = {
  STATUS: 'status',
  SPECIAL_CODE: 'specialCode',
  LOCATION: 'location',
};

const VALID_CATEGORIES = ['STATUS', 'SPECIAL_CODE', 'FLOOR', 'LOCATION'];

@Injectable()
export class CopyOptionsService {
  constructor(private prisma: PrismaService) {}

  // 아직 floor/detail이 채워지지 않은 소장처들을 찾아서,
  // '층' 목록과 값을 비교해 자동으로 채워주는 함수입니다. (한 번 채워지면 다시 안 건드립니다.)
  private async backfillLocationFloors(libraryId: number) {
    const unfilled = await this.prisma.copyOption.findMany({
      where: { libraryId, category: 'LOCATION', floor: null },
    });
    if (unfilled.length === 0) return;

    const floors = await this.prisma.copyOption.findMany({
      where: { libraryId, category: 'FLOOR' },
    });
    if (floors.length === 0) return;

    // 값이 긴 층 이름부터 비교해야 "1층"과 "11층"을 혼동하지 않습니다.
    const sortedFloors = [...floors].sort((a, b) => b.value.length - a.value.length);

    for (const loc of unfilled) {
      const matched = sortedFloors.find((f) => loc.value.startsWith(f.value));
      if (matched) {
        const detail = loc.value.slice(matched.value.length).trim();
        await this.prisma.copyOption.update({
          where: { id: loc.id },
          data: { floor: matched.value, detail: detail || null },
        });
      }
    }
  }

  // 전체 목록(상태/별치기호/층/소장처)을 한 번에 가져옵니다.
  // 이 도서관에 어떤 목록 종류가 하나도 없으면(=처음 쓰는 경우), 그 종류만 기본값을 자동으로 채워 넣습니다.
  async listAll(libraryId: number) {
    for (const category of Object.keys(DEFAULT_OPTIONS)) {
      const count = await this.prisma.copyOption.count({ where: { libraryId, category } });
      if (count === 0) {
        const data = DEFAULT_OPTIONS[category].map((value, i) => ({
          libraryId,
          category,
          value,
          order: i,
        }));
        await this.prisma.copyOption.createMany({ data });

        if (category === 'STATUS') {
          // 기존 실물 자료 중 예전 영문 상태값을 쓰고 있는 게 있으면, 새 한글 값으로 딱 한 번 바꿔줍니다.
          for (const [oldCode, newValue] of Object.entries(LEGACY_STATUS_MAP)) {
            await this.prisma.copy.updateMany({
              where: { libraryId, status: oldCode },
              data: { status: newValue },
            });
          }
        }
      }
    }

    // 층 정보가 비어있는 예전 소장처들을 자동으로 채워줍니다.
    await this.backfillLocationFloors(libraryId);

    const options = await this.prisma.copyOption.findMany({
      where: { libraryId },
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { id: 'asc' }],
    });

    return {
      STATUS: options.filter((o) => o.category === 'STATUS'),
      SPECIAL_CODE: options.filter((o) => o.category === 'SPECIAL_CODE'),
      FLOOR: options.filter((o) => o.category === 'FLOOR'),
      LOCATION: options.filter((o) => o.category === 'LOCATION'),
    };
  }

  // 값 추가
  async create(libraryId: number, data: any) {
    const category = data.category;
    if (!VALID_CATEGORIES.includes(category)) {
      throw new BadRequestException('알 수 없는 목록 종류입니다.');
    }

    let value: string;
    let floor: string | null = null;
    let detail: string | null = null;

    if (category === 'LOCATION' && data.floor) {
      // 층 + 세부위치를 조합해서 저장하는 방식
      floor = String(data.floor).trim();
      detail = String(data.detail || '').trim() || null;
      value = `${floor} ${detail || ''}`.replace(/\s+/g, ' ').trim();
    } else {
      value = String(data.value || '').trim();
    }

    if (!value) {
      throw new BadRequestException('값을 입력하세요.');
    }

    const count = await this.prisma.copyOption.count({ where: { libraryId, category } });
    try {
      return await this.prisma.copyOption.create({
        data: { libraryId, category, value, floor, detail, order: count },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 값입니다.');
      }
      throw e;
    }
  }

  // 값 수정 - 이 값을 쓰고 있던 실물 자료들도 함께 수정된 값으로 바꿔줍니다.
  // '층'을 수정하면, 그 층을 쓰는 모든 소장처와 그 소장처를 쓰는 실물 자료까지 함께 바뀝니다.
  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.copyOption.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('값을 찾을 수 없습니다.');
    }

    // 1) '층'을 수정하는 경우: 이 층을 쓰는 소장처들도 연쇄로 값이 바뀝니다.
    if (existing.category === 'FLOOR') {
      const newFloorValue = String(data.value || '').trim();
      if (!newFloorValue) {
        throw new BadRequestException('값을 입력하세요.');
      }
      if (newFloorValue === existing.value) {
        return existing;
      }

      const affectedLocations = await this.prisma.copyOption.findMany({
        where: { libraryId, category: 'LOCATION', floor: existing.value },
      });

      try {
        const ops: any[] = [
          this.prisma.copyOption.update({ where: { id }, data: { value: newFloorValue } }),
        ];

        for (const loc of affectedLocations) {
          const newLocationValue = `${newFloorValue} ${loc.detail || ''}`.replace(/\s+/g, ' ').trim();
          ops.push(
            this.prisma.copyOption.update({
              where: { id: loc.id },
              data: { value: newLocationValue, floor: newFloorValue },
            }),
          );
          ops.push(
            this.prisma.copy.updateMany({
              where: { libraryId, location: loc.value },
              data: { location: newLocationValue },
            }),
          );
        }

        const [updatedOption] = await this.prisma.$transaction(ops);
        return updatedOption;
      } catch (e: any) {
        if (e.code === 'P2002') {
          throw new BadRequestException('이미 있는 값입니다.');
        }
        throw e;
      }
    }

    // 2) '소장처'를 층+세부위치 방식으로 수정하는 경우
    if (existing.category === 'LOCATION' && data.floor) {
      const floor = String(data.floor).trim();
      const detail = String(data.detail || '').trim() || null;
      const newValue = `${floor} ${detail || ''}`.replace(/\s+/g, ' ').trim();
      if (!newValue) {
        throw new BadRequestException('값을 입력하세요.');
      }
      if (newValue === existing.value) {
        return existing;
      }

      try {
        const [updatedOption] = await this.prisma.$transaction([
          this.prisma.copyOption.update({ where: { id }, data: { value: newValue, floor, detail } }),
          this.prisma.copy.updateMany({
            where: { libraryId, location: existing.value },
            data: { location: newValue },
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

    // 3) 그 외 (상태 / 별치기호 / 층 없는 예전 소장처): 기존 방식 그대로
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

  // 값 삭제 - 최소 1개는 남아있어야 하고, 이 값을 쓰는 자료(또는 '층'인 경우 소장처)가 있으면 삭제할 수 없습니다.
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

    // '층'을 삭제하려는 경우: 이 층을 쓰는 소장처가 있는지 먼저 확인합니다.
    if (existing.category === 'FLOOR') {
      const usedLocations = await this.prisma.copyOption.findMany({
        where: { libraryId, category: 'LOCATION', floor: existing.value },
        select: { value: true },
        orderBy: { value: 'asc' },
      });

      if (usedLocations.length > 0) {
        const totalCopies = await this.prisma.copy.count({
          where: { libraryId, location: { in: usedLocations.map((l) => l.value) } },
        });
        const shown = usedLocations.slice(0, 5).map((l) => l.value);
        const shownText = usedLocations.length > 5 ? `${shown.join(', ')}, ...` : shown.join(', ');
        throw new BadRequestException(
          `이 층을 사용 중인 소장처가 있어 삭제할 수 없습니다. (소장처: ${shownText}) (실물 자료 ${totalCopies}권)`,
        );
      }

      await this.prisma.copyOption.delete({ where: { id } });
      return { success: true };
    }

    // 그 외 (상태 / 별치기호 / 소장처): 기존 방식 그대로
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