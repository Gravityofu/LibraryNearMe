import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// 처음 이 도서관이 자료 종류 관리 기능을 쓸 때 자동으로 채워지는 기본 15개 종류입니다.
// 대출 가능 권수·대출 일수·예약 가능 권수는 '설정 > 대출' 화면에서 다시 확인·조정할 수 있습니다.
const DEFAULT_MATERIAL_TYPES = [
  // 실물 자료 (대출 설정 있음)
  { code: 'book', nameKo: '도서', nameEn: 'Book', category: 'PHYSICAL', usesMarc: true, maxLoanCount: 10, loanPeriodDays: 14, maxReservationCount: 5 },
  { code: 'dvd', nameKo: 'DVD', nameEn: 'DVD', category: 'PHYSICAL', usesMarc: true, maxLoanCount: 2, loanPeriodDays: 7, maxReservationCount: 2 },
  { code: 'boardgame', nameKo: '보드게임', nameEn: 'Board Game', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 1, loanPeriodDays: 7, maxReservationCount: 1 },
  { code: 'tool', nameKo: '공구', nameEn: 'Tool', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 1, loanPeriodDays: 7, maxReservationCount: 1 },
  { code: 'equipment', nameKo: '장비', nameEn: 'Equipment', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 1, loanPeriodDays: 7, maxReservationCount: 1 },
  { code: 'thesis_physical', nameKo: '논문(실물)', nameEn: 'Thesis (Physical)', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 2, loanPeriodDays: 14, maxReservationCount: 2 },
  { code: 'collection', nameKo: '자료집', nameEn: 'Anthology', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 2, loanPeriodDays: 14, maxReservationCount: 2 },
  { code: 'clipping', nameKo: '스크랩', nameEn: 'Clipping', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 2, loanPeriodDays: 14, maxReservationCount: 2 },
  // 디지털 자료 (대출 설정 없음)
  { code: 'thesis_digital', nameKo: '논문(디지털)', nameEn: 'Thesis (Digital)', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null, maxReservationCount: null },
  { code: 'law', nameKo: '법령', nameEn: 'Law', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null, maxReservationCount: null },
  { code: 'video', nameKo: '영상', nameEn: 'Video', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null, maxReservationCount: null },
  { code: 'music', nameKo: '음악', nameEn: 'Music', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null, maxReservationCount: null },
  { code: 'webpage', nameKo: '웹페이지', nameEn: 'Web Page', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null, maxReservationCount: null },
  { code: 'photo', nameKo: '사진', nameEn: 'Photo', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null, maxReservationCount: null },
  { code: 'article', nameKo: '기사', nameEn: 'Article', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null, maxReservationCount: null },
];

@Injectable()
export class MaterialTypesService {
  constructor(private prisma: PrismaService) {}

  // 목록 조회. 이 도서관에 자료 종류가 하나도 없으면, 기본 15개를 자동으로 채워 넣습니다.
  async list(libraryId: number) {
    const count = await this.prisma.materialType.count({ where: { libraryId } });
    if (count === 0) {
      await this.prisma.materialType.createMany({
        data: DEFAULT_MATERIAL_TYPES.map((m, i) => ({ ...m, libraryId, order: i })),
      });
    }
    return this.prisma.materialType.findMany({
      where: { libraryId },
      include: { kdcRules: { orderBy: { kdcPrefix: 'asc' } } },
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { id: 'asc' }],
    });
  }

  // 새 자료 종류 추가. 대출 가능 권수·대출 일수·예약 가능 권수는 여기서 받지 않습니다.
  // (자료 종류를 새로 만들고 나서, '설정 > 대출' 화면에서 값을 채워 넣습니다.)
  async create(libraryId: number, data: any) {
    const code = String(data.code || '').trim();
    const nameKo = String(data.nameKo || '').trim();
    const nameEn = String(data.nameEn || '').trim();
    const category = data.category === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL';
    const usesMarc = !!data.usesMarc;

    if (!code || !nameKo) {
      throw new BadRequestException('코드와 이름을 입력하세요.');
    }

    const count = await this.prisma.materialType.count({ where: { libraryId } });
    try {
      return await this.prisma.materialType.create({
        data: {
          libraryId, code, nameKo, nameEn: nameEn || nameKo,
          category, usesMarc,
          maxLoanCount: null,
          loanPeriodDays: null,
          maxReservationCount: null,
          order: count,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 코드입니다.');
      }
      throw e;
    }
  }

  // 실물 자료별로 정한 대출 가능 권수/예약 가능 권수를 모두 더한 값이,
  // 어떤 회원구분의 최대 대출 권수/최대 예약 권수보다 많아지면 안 됩니다. (같은 값은 괜찮습니다.)
  // excludeId: 지금 수정 중인 자료(기존 값 대신 새 값으로 계산에 넣기 위해 합계에서는 빼고 새 값을 따로 더함)
  private async checkAgainstMemberLimits(
    libraryId: number,
    excludeId: number,
    newMaxLoanCount: number | null,
    newMaxReservationCount: number | null,
  ) {
    const others = await this.prisma.materialType.findMany({
      where: { libraryId, category: 'PHYSICAL', id: { not: excludeId } },
      select: { maxLoanCount: true, maxReservationCount: true },
    });

    const totalLoanCount = others.reduce((sum, m) => sum + (m.maxLoanCount || 0), 0) + (newMaxLoanCount || 0);
    const totalReservationCount =
      others.reduce((sum, m) => sum + (m.maxReservationCount || 0), 0) + (newMaxReservationCount || 0);

    const memberTypes = await this.prisma.memberType.findMany({ where: { libraryId } });
    const settings = await this.prisma.loanSetting.findMany({ where: { libraryId } });
    const settingByType = new Map(settings.map((s) => [s.memberTypeId, s]));

    for (const mt of memberTypes) {
      const s = settingByType.get(mt.id);
      // 아직 '대출' 화면에서 한 번도 설정을 열어보지 않은 회원구분은, LoanSetting의 기본값(대출 5권/예약 3권)을 기준으로 봅니다.
      const memberMaxLoanCount = s ? s.maxLoanCount : 5;
      const memberMaxReservationCount = s ? s.maxReservationCount : 3;

      if (totalLoanCount > memberMaxLoanCount) {
        throw new BadRequestException(
          `실물 자료별 대출 가능 권수의 합(${totalLoanCount}권)이 '${mt.name}'의 최대 대출 권수(${memberMaxLoanCount}권)보다 많습니다.`,
        );
      }
      if (totalReservationCount > memberMaxReservationCount) {
        throw new BadRequestException(
          `실물 자료별 예약 가능 권수의 합(${totalReservationCount}권)이 '${mt.name}'의 최대 예약 권수(${memberMaxReservationCount}권)보다 많습니다.`,
        );
      }
    }
  }

  // 자료 종류 수정.
  // - 이름(nameKo/nameEn) 수정은 '자료 종류' 화면에서 옵니다.
  // - 대출 가능 권수/대출 일수/예약 가능 권수 수정은 '대출' 화면에서 옵니다. (같은 API를 함께 씁니다.)
  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.materialType.findFirst({
      where: { id, libraryId },
      include: { kdcRules: true },
    });
    if (!existing) {
      throw new NotFoundException('자료 종류를 찾을 수 없습니다.');
    }

    const nameKo = data.nameKo !== undefined ? String(data.nameKo).trim() : existing.nameKo;
    const nameEn = data.nameEn !== undefined ? String(data.nameEn).trim() : existing.nameEn;
    if (!nameKo) {
      throw new BadRequestException('이름을 입력하세요.');
    }

    let maxLoanCount = existing.maxLoanCount;
    let loanPeriodDays = existing.loanPeriodDays;
    let maxReservationCount = existing.maxReservationCount;

    if (existing.category === 'PHYSICAL' && data.maxLoanCount !== undefined) {
      const next = Number(data.maxLoanCount);
      if (!Number.isFinite(next) || next < 1) {
        throw new BadRequestException('대출 가능 권수를 올바르게 입력하세요.');
      }
      const maxChildLimit = existing.kdcRules.reduce((m, r) => Math.max(m, r.maxLoanCount), 0);
      if (next < maxChildLimit) {
        throw new BadRequestException(
          `하위 KDC 규칙 중 ${maxChildLimit}권으로 설정된 항목이 있어, 그보다 작게 설정할 수 없습니다.`,
        );
      }
      maxLoanCount = next;
    }

    if (existing.category === 'PHYSICAL' && data.loanPeriodDays !== undefined) {
      const next = Number(data.loanPeriodDays);
      if (!Number.isFinite(next) || next < 1) {
        throw new BadRequestException('대출 일수를 올바르게 입력하세요.');
      }
      loanPeriodDays = next;
    }

    if (existing.category === 'PHYSICAL' && data.maxReservationCount !== undefined) {
      const next = Number(data.maxReservationCount);
      if (!Number.isFinite(next) || next < 0) {
        throw new BadRequestException('예약 가능 권수를 올바르게 입력하세요.');
      }
      maxReservationCount = next;
    }

    // 대출/예약 가능 권수가 바뀔 때만, 회원구분 최대치와 비교합니다.
    if (data.maxLoanCount !== undefined || data.maxReservationCount !== undefined) {
      await this.checkAgainstMemberLimits(libraryId, id, maxLoanCount, maxReservationCount);
    }

    return this.prisma.materialType.update({
      where: { id },
      data: { nameKo, nameEn: nameEn || nameKo, maxLoanCount, loanPeriodDays, maxReservationCount },
    });
  }

  // 삭제 - 최소 1개는 남아있어야 하고, 이 종류로 등록된 서지 자료가 있으면 삭제할 수 없습니다.
  async remove(libraryId: number, id: number) {
    const existing = await this.prisma.materialType.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('자료 종류를 찾을 수 없습니다.');
    }
    const siblingCount = await this.prisma.materialType.count({ where: { libraryId } });
    if (siblingCount <= 1) {
      throw new BadRequestException('최소 1개의 자료 종류는 남아있어야 합니다.');
    }
    const usedCount = await this.prisma.material.count({ where: { libraryId, type: existing.code } });
    if (usedCount > 0) {
      throw new BadRequestException(`이 종류로 등록된 자료가 ${usedCount}건 있어 삭제할 수 없습니다.`);
    }
    await this.prisma.materialType.delete({ where: { id } });
    return { success: true };
  }

  // --- '도서' 등 특정 자료 종류 안의 KDC 하위 규칙 (관리 화면은 '설정 > 대출'에 있습니다) ---

  async createKdcRule(libraryId: number, materialTypeId: number, data: any) {
    const materialType = await this.prisma.materialType.findFirst({ where: { id: materialTypeId, libraryId } });
    if (!materialType) {
      throw new NotFoundException('자료 종류를 찾을 수 없습니다.');
    }
    if (materialType.category !== 'PHYSICAL' || materialType.maxLoanCount === null) {
      throw new BadRequestException('실물 자료에만 KDC 하위 규칙을 만들 수 있습니다. (먼저 대출 화면에서 대출 가능 권수를 설정해주세요.)');
    }
    const kdcPrefix = String(data.kdcPrefix || '').trim();
    const label = String(data.label || '').trim();
    const maxLoanCount = Number(data.maxLoanCount);
    if (!kdcPrefix || !label) {
      throw new BadRequestException('KDC 번호와 이름을 입력하세요.');
    }
    if (!Number.isFinite(maxLoanCount) || maxLoanCount < 1) {
      throw new BadRequestException('대출 가능 권수를 올바르게 입력하세요.');
    }
    if (maxLoanCount > materialType.maxLoanCount) {
      throw new BadRequestException(
        `상위 자료(${materialType.nameKo})의 대출 가능 권수(${materialType.maxLoanCount}권)보다 크게 설정할 수 없습니다.`,
      );
    }
    try {
      return await this.prisma.bookKdcRule.create({
        data: { libraryId, materialTypeId, kdcPrefix, label, maxLoanCount },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 KDC 번호입니다.');
      }
      throw e;
    }
  }

  async updateKdcRule(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.bookKdcRule.findFirst({
      where: { id, libraryId },
      include: { materialType: true },
    });
    if (!existing) {
      throw new NotFoundException('KDC 규칙을 찾을 수 없습니다.');
    }
    const kdcPrefix = data.kdcPrefix !== undefined ? String(data.kdcPrefix).trim() : existing.kdcPrefix;
    const label = data.label !== undefined ? String(data.label).trim() : existing.label;
    let maxLoanCount = existing.maxLoanCount;
    if (data.maxLoanCount !== undefined) {
      const next = Number(data.maxLoanCount);
      if (!Number.isFinite(next) || next < 1) {
        throw new BadRequestException('대출 가능 권수를 올바르게 입력하세요.');
      }
      if (existing.materialType.maxLoanCount !== null && next > existing.materialType.maxLoanCount) {
        throw new BadRequestException(
          `상위 자료(${existing.materialType.nameKo})의 대출 가능 권수(${existing.materialType.maxLoanCount}권)보다 크게 설정할 수 없습니다.`,
        );
      }
      maxLoanCount = next;
    }
    try {
      return await this.prisma.bookKdcRule.update({
        where: { id },
        data: { kdcPrefix, label, maxLoanCount },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 KDC 번호입니다.');
      }
      throw e;
    }
  }

  async removeKdcRule(libraryId: number, id: number) {
    const existing = await this.prisma.bookKdcRule.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('KDC 규칙을 찾을 수 없습니다.');
    }
    await this.prisma.bookKdcRule.delete({ where: { id } });
    return { success: true };
  }
}