# 개선 38: KDC 하위 규칙을 '대출' 메뉴로 이동 + 자료별 대출/예약 권수 합계 검증

## 목표

두 가지를 고칩니다.

1. **KDC 하위 규칙 위치 이동**: '설정' → '자료 종류' 화면의 "도서" 항목에 있던 "KDC 하위 규칙" 버튼과 관리 기능은 대출 관련 설정이므로, '자료 종류' 화면에서는 없애고 '설정' → '대출' 화면의 "자료별 대출 설정" 표 안, "도서" 행으로 옮깁니다. (버튼을 누르면 여는 관리 화면 자체는 그대로이고, 어느 화면에서 여는지만 바뀝니다.)

2. **대출/예약 권수 합계 검증 추가**: '대출' → "자료별 대출 설정"에서 실물 자료 종류별로 정한 대출 가능 권수를 모두 더한 값이, "기본 대출 설정"에 있는 개인회원·단체회원·자료지원회원 중 **어느 한 곳의 최대 대출 권수보다도 커지면 안 됩니다.** (합계가 같은 것은 괜찮습니다.) 예약 가능 권수도 똑같은 방식으로, 합계가 어느 회원구분의 최대 예약 권수보다 커지면 안 됩니다.

   이 검증은 양방향으로 동작합니다.
   - "자료별 대출 설정"에서 어떤 자료의 대출 가능 권수를 올리다가, 그 합계가 회원구분의 최대 대출 권수를 넘어서면 저장이 막히고 어느 회원구분 때문에 막혔는지 안내합니다.
   - 반대로 "기본 대출 설정"에서 어떤 회원구분의 최대 대출 권수를 낮추다가, 그 값이 현재 자료별 대출 가능 권수 합계보다 작아지면 저장이 막힙니다.

> ⚠️ **먼저 확인해주세요**: 이 검증이 추가되면, 지금 이미 등록되어 있는 값들이 새 규칙에 어긋날 수 있습니다. 예를 들어 처음 자동으로 만들어지는 실물 자료 8종(도서 10권, DVD 2권, 보드게임 1권, 공구 1권, 장비 1권, 논문실물 2권, 자료집 2권, 스크랩 2권)의 대출 가능 권수를 모두 더하면 **21권**이고, 예약 가능 권수를 모두 더하면 **16권**입니다. 반면 '대출' 화면의 회원구분별 최대 대출 권수 기본값은 5권, 최대 예약 권수 기본값은 3권이라서, 지금 이대로는 새 규칙에 이미 어긋나 있는 상태입니다.
>
> 그래서 이번 가이드를 적용하고 나면, 코드를 고치기 전에 **먼저 '대출' 화면에서 각 회원구분(개인회원/단체회원/자료지원회원)의 최대 대출 권수와 최대 예약 권수를, 지금 자료별로 설정되어 있는 값들의 합계보다 크거나 같게** 올려두셔야 합니다. (직접 등록하신 자료 종류가 있다면 그것까지 포함해서 합계를 확인해주세요.) 이 작업을 먼저 하지 않으면, 이후 자료별 대출 설정을 수정하려고 할 때 계속 저장이 막힐 수 있습니다. 아래 "확인하기" 1번에 이 순서를 다시 안내해두었습니다.

---

## 1. 백엔드 수정하기: `material-types.service.ts`

`C:\projects\LibraryNearMe\backend\src\settings\material-types.service.ts` 파일을 여세요.

KDC 관련 함수들을 지우고, 자료별 대출/예약 권수 합계를 검사하는 기능을 추가하기 위해, **파일 전체 내용을 아래 내용으로 통째로 바꿔주세요.**

```ts
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
```

**바뀐 점 요약**

- `checkAgainstMemberLimits()`라는 새 함수가, 실물 자료 종류들의 대출/예약 가능 권수 합계를 각 회원구분의 최대 대출/예약 권수와 비교합니다. 하나라도 넘으면 저장을 막고, 어느 회원구분 때문에 막혔는지 안내합니다.
- `update()`에서 대출 가능 권수나 예약 가능 권수를 바꿀 때마다 이 검증을 실행합니다.
- KDC 관련 함수(`createKdcRule`/`updateKdcRule`/`removeKdcRule`)는 그대로 남아있습니다. (주소/API는 그대로이고, 이 기능을 여는 화면 버튼만 옮깁니다.)

---

## 2. 백엔드 수정하기: `loan-settings.service.ts`

`C:\projects\LibraryNearMe\backend\src\settings\loan-settings.service.ts` 파일을 여세요.

아래 부분을 찾으세요.

```ts
    // 최대 대출 제한 일수는 비워두면 "상한 없음"(연체한 일수만큼 그대로 적용)을 뜻합니다.
    let maxSuspensionDays: number | null = null;
    if (data.maxSuspensionDays !== '' && data.maxSuspensionDays !== null && data.maxSuspensionDays !== undefined) {
      const n = Number(data.maxSuspensionDays);
      if (!Number.isFinite(n) || n < 0) {
        throw new BadRequestException('최대 대출 제한 일수를 올바르게 입력하세요.');
      }
      maxSuspensionDays = n;
    }

    const existing = await this.prisma.loanSetting.findFirst({ where: { libraryId, memberTypeId } });
```

이렇게 바꿔주세요. (실물 자료별 합계와 비교하는 검증이 추가됩니다.)

```ts
    // 최대 대출 제한 일수는 비워두면 "상한 없음"(연체한 일수만큼 그대로 적용)을 뜻합니다.
    let maxSuspensionDays: number | null = null;
    if (data.maxSuspensionDays !== '' && data.maxSuspensionDays !== null && data.maxSuspensionDays !== undefined) {
      const n = Number(data.maxSuspensionDays);
      if (!Number.isFinite(n) || n < 0) {
        throw new BadRequestException('최대 대출 제한 일수를 올바르게 입력하세요.');
      }
      maxSuspensionDays = n;
    }

    // 실물 자료별로 정한 대출/예약 가능 권수의 합계보다 작게 설정할 수 없습니다.
    const physicalTypes = await this.prisma.materialType.findMany({
      where: { libraryId, category: 'PHYSICAL' },
      select: { maxLoanCount: true, maxReservationCount: true },
    });
    const totalLoanCount = physicalTypes.reduce((sum, m) => sum + (m.maxLoanCount || 0), 0);
    const totalReservationCount = physicalTypes.reduce((sum, m) => sum + (m.maxReservationCount || 0), 0);

    if (maxLoanCount < totalLoanCount) {
      throw new BadRequestException(
        `실물 자료별 대출 가능 권수의 합(${totalLoanCount}권)보다 최대 대출 권수를 작게 설정할 수 없습니다.`,
      );
    }
    if (maxReservationCount < totalReservationCount) {
      throw new BadRequestException(
        `실물 자료별 예약 가능 권수의 합(${totalReservationCount}권)보다 최대 예약 권수를 작게 설정할 수 없습니다.`,
      );
    }

    const existing = await this.prisma.loanSetting.findFirst({ where: { libraryId, memberTypeId } });
```

파일을 저장하세요.

---

## 3. 프런트엔드 수정하기: `material-types-settings-form.tsx` (KDC 버튼/모달 제거)

`C:\projects\LibraryNearMe\frontend\src\components\material-types-settings-form.tsx` 파일을 여세요.

KDC 관련 상태·함수·버튼·모달을 모두 제거하기 위해, **파일 전체 내용을 아래 내용으로 통째로 바꿔주세요.**

```tsx
"use client";

import { useEffect, useState } from "react";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type MaterialType = {
  id: number;
  code: string;
  nameKo: string;
  nameEn: string;
  category: "PHYSICAL" | "DIGITAL";
  usesMarc: boolean;
  maxLoanCount: number | null;
  loanPeriodDays: number | null;
  maxReservationCount: number | null;
};

const EMPTY_FORM = {
  category: "PHYSICAL" as "PHYSICAL" | "DIGITAL",
  code: "",
  nameKo: "",
  nameEn: "",
  usesMarc: false,
};

export default function MaterialTypesSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [types, setTypes] = useState<MaterialType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // 자료 등록 화면에서 주제어를 몇 개까지 입력할 수 있는지 정하는, 도서관 전체 공통 값이에요.
  const [maxSubjectKeywords, setMaxSubjectKeywords] = useState("10");

  async function loadTypes() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTypes(await res.json());
    } else {
      notify("❌ " + t("settings.materialTypes.loadFail"), "error");
    }
  }

  async function loadMaxSubjectKeywords() {
    const res = await fetch(`${API_URL}/library`);
    if (res.ok) {
      const data = await res.json();
      if (data?.maxSubjectKeywords) {
        setMaxSubjectKeywords(String(data.maxSubjectKeywords));
      }
    }
  }

  async function handleSaveMaxSubjectKeywords() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const value = Number(maxSubjectKeywords);
    if (!Number.isFinite(value) || value < 1) {
      notify("❌ " + t("settings.materialTypes.maxSubjectKeywords.invalid"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ maxSubjectKeywords: value }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.maxSubjectKeywords.saveSuccess"), "success");
    } else {
      notify("❌ " + t("settings.materialTypes.maxSubjectKeywords.saveFail"), "error");
    }
  }

  useEffect(() => {
    loadTypes();
    loadMaxSubjectKeywords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(item: MaterialType) {
    setEditingId(item.id);
    setForm({
      category: item.category,
      code: item.code,
      nameKo: item.nameKo,
      nameEn: item.nameEn,
      usesMarc: item.usesMarc,
    });
    setShowModal(true);
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!form.nameKo.trim() || (!editingId && !form.code.trim())) {
      notify("❌ " + t("settings.materialTypes.codeRequired"), "error");
      return;
    }

    const body: any = {
      nameKo: form.nameKo.trim(),
      nameEn: form.nameEn.trim(),
    };
    if (!editingId) {
      body.code = form.code.trim();
      body.category = form.category;
      body.usesMarc = form.usesMarc;
    }

    const url = editingId ? `${API_URL}/material-types/${editingId}` : `${API_URL}/material-types`;
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.saveSuccess"), "success");
      setShowModal(false);
      await loadTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.saveFail")), "error");
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    if (!window.confirm(t("settings.materialTypes.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types/${editingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.deleteSuccess"), "success");
      setShowModal(false);
      await loadTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.deleteFail")), "error");
    }
  }

  function renderTable(category: "PHYSICAL" | "DIGITAL") {
    const rows = types.filter((mt) => mt.category === category);
    return (
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500">
            <tr>
              <th className="px-3 py-2">{t("settings.materialTypes.col.nameKo")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.code")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.usesMarc")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{item.nameKo}</td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.code}</td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  {item.usesMarc ? t("settings.materialTypes.yes") : t("settings.materialTypes.no")}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="cursor-pointer rounded border px-2 py-1 text-xs"
                  >
                    {t("settings.materialTypes.editBtn")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.maxSubjectKeywords.label")}</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={maxSubjectKeywords}
            onChange={(e) => setMaxSubjectKeywords(e.target.value)}
            className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <ThemedButton preset="버튼1" onClick={handleSaveMaxSubjectKeywords}>
            {t("settings.materialTypes.maxSubjectKeywords.save")}
          </ThemedButton>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.sectionPhysical")}</p>
        {renderTable("PHYSICAL")}
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.sectionDigital")}</p>
        {renderTable("DIGITAL")}
      </div>

      <div className="flex justify-end">
        <ThemedButton preset="버튼1" onClick={openAddModal}>
          {t("settings.materialTypes.addBtn")}
        </ThemedButton>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <p className="mb-4 text-sm font-semibold">
                {editingId ? t("settings.materialTypes.modal.editTitle") : t("settings.materialTypes.modal.addTitle")}
              </p>

              <div className="space-y-3">
                {!editingId && (
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.category")}</span>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as "PHYSICAL" | "DIGITAL" })}
                      className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="PHYSICAL">{t("settings.materialTypes.field.categoryPhysical")}</option>
                      <option value="DIGITAL">{t("settings.materialTypes.field.categoryDigital")}</option>
                    </select>
                  </label>
                )}

                {!editingId && (
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.code")}</span>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.nameKo")} *</span>
                  <input
                    value={form.nameKo}
                    onChange={(e) => setForm({ ...form, nameKo: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.nameEn")}</span>
                  <input
                    value={form.nameEn}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>

                {!editingId && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.usesMarc}
                      onChange={(e) => setForm({ ...form, usesMarc: e.target.checked })}
                    />
                    <span className="text-sm text-neutral-500">{t("settings.materialTypes.field.usesMarc")}</span>
                  </label>
                )}

                {!editingId && form.category === "PHYSICAL" && (
                  <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                    {t("settings.materialTypes.loanHint")}
                  </p>
                )}
              </div>

              <ThemedButton preset="버튼1" onClick={handleSave} className="mt-5 w-full">
                {t("settings.materialTypes.save")}
              </ThemedButton>

              {editingId && (
                <button
                  onClick={handleDelete}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t("settings.materialTypes.deleteBtn")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 4. 프런트엔드 수정하기: `loan-settings-form.tsx` (KDC 버튼/모달 추가)

`C:\projects\LibraryNearMe\frontend\src\components\loan-settings-form.tsx` 파일을 여세요.

**파일 전체 내용을 아래 내용으로 통째로 바꿔주세요.** ("자료별 대출 설정" 표의 "도서" 행에 "KDC 하위 규칙" 버튼이 추가되고, 그 버튼을 누르면 여는 관리 모달이 새로 들어갑니다. 나머지 내용은 기존과 같습니다.)

```tsx
"use client";

import { useEffect, useState } from "react";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type MemberLoanSetting = {
  memberTypeId: number;
  memberTypeName: string;
  maxLoanCount: number;
  maxReservationCount: number;
  maxSuspensionDays: number | null;
  reservationHoldDays: number;
};

type KdcRule = { id: number; kdcPrefix: string; label: string; maxLoanCount: number };
type MaterialType = {
  id: number;
  code: string;
  nameKo: string;
  category: "PHYSICAL" | "DIGITAL";
  maxLoanCount: number | null;
  loanPeriodDays: number | null;
  maxReservationCount: number | null;
  kdcRules: KdcRule[];
};

const EMPTY_MEMBER_FORM = {
  maxLoanCount: "",
  maxReservationCount: "",
  maxSuspensionDays: "",
  reservationHoldDays: "",
};

const EMPTY_MATERIAL_FORM = {
  maxLoanCount: "",
  loanPeriodDays: "",
  maxReservationCount: "",
};

const EMPTY_KDC_FORM = { kdcPrefix: "", label: "", maxLoanCount: "" };

export default function LoanSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [memberSettings, setMemberSettings] = useState<MemberLoanSetting[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMemberTypeId, setEditingMemberTypeId] = useState<number | null>(null);
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM);

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL_FORM);

  const [showKdcModal, setShowKdcModal] = useState(false);
  const [showKdcForm, setShowKdcForm] = useState(false);
  const [kdcEditingId, setKdcEditingId] = useState<number | null>(null);
  const [kdcForm, setKdcForm] = useState(EMPTY_KDC_FORM);

  async function loadMemberSettings() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/loan-settings/member-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMemberSettings(await res.json());
    } else {
      notify("❌ " + t("settings.loan.loadFail"), "error");
    }
  }

  async function loadMaterialTypes() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMaterialTypes(await res.json());
    }
  }

  useEffect(() => {
    loadMemberSettings();
    loadMaterialTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openMemberModal(item: MemberLoanSetting) {
    setEditingMemberTypeId(item.memberTypeId);
    setMemberForm({
      maxLoanCount: String(item.maxLoanCount),
      maxReservationCount: String(item.maxReservationCount),
      maxSuspensionDays: item.maxSuspensionDays !== null ? String(item.maxSuspensionDays) : "",
      reservationHoldDays: String(item.reservationHoldDays),
    });
    setShowMemberModal(true);
  }

  function closeMemberModal() {
    setShowMemberModal(false);
    setEditingMemberTypeId(null);
  }

  async function handleSaveMember() {
    if (!editingMemberTypeId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/loan-settings/member-types/${editingMemberTypeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        maxLoanCount: memberForm.maxLoanCount,
        maxReservationCount: memberForm.maxReservationCount,
        maxSuspensionDays: memberForm.maxSuspensionDays === "" ? null : memberForm.maxSuspensionDays,
        reservationHoldDays: memberForm.reservationHoldDays,
      }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.loan.saveSuccess"), "success");
      closeMemberModal();
      await loadMemberSettings();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.loan.saveFail")), "error");
    }
  }

  function openMaterialModal(item: MaterialType) {
    setEditingMaterialId(item.id);
    setMaterialForm({
      maxLoanCount: item.maxLoanCount !== null ? String(item.maxLoanCount) : "",
      loanPeriodDays: item.loanPeriodDays !== null ? String(item.loanPeriodDays) : "",
      maxReservationCount: item.maxReservationCount !== null ? String(item.maxReservationCount) : "",
    });
    setShowMaterialModal(true);
  }

  function closeMaterialModal() {
    setShowMaterialModal(false);
    setEditingMaterialId(null);
  }

  async function handleSaveMaterial() {
    if (!editingMaterialId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (
      !materialForm.maxLoanCount.trim() ||
      !materialForm.loanPeriodDays.trim() ||
      !materialForm.maxReservationCount.trim()
    ) {
      notify("❌ " + t("settings.loan.materialFieldsRequired"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/material-types/${editingMaterialId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        maxLoanCount: Number(materialForm.maxLoanCount),
        loanPeriodDays: Number(materialForm.loanPeriodDays),
        maxReservationCount: Number(materialForm.maxReservationCount),
      }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.loan.saveSuccess"), "success");
      closeMaterialModal();
      await loadMaterialTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.loan.saveFail")), "error");
    }
  }

  const physicalTypes = materialTypes.filter((mt) => mt.category === "PHYSICAL");
  const bookType = physicalTypes.find((mt) => mt.code === "book");

  function openKdcModal() {
    setShowKdcForm(false);
    setKdcEditingId(null);
    setKdcForm(EMPTY_KDC_FORM);
    setShowKdcModal(true);
  }

  function closeKdcModal() {
    setShowKdcModal(false);
    setShowKdcForm(false);
    setKdcEditingId(null);
    setKdcForm(EMPTY_KDC_FORM);
  }

  function openAddKdcForm() {
    setKdcEditingId(null);
    setKdcForm(EMPTY_KDC_FORM);
    setShowKdcForm(true);
  }

  function openEditKdcForm(rule: KdcRule) {
    setKdcEditingId(rule.id);
    setKdcForm({ kdcPrefix: rule.kdcPrefix, label: rule.label, maxLoanCount: String(rule.maxLoanCount) });
    setShowKdcForm(true);
  }

  async function handleSaveKdc() {
    if (!bookType) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!kdcForm.kdcPrefix.trim() || !kdcForm.label.trim() || !kdcForm.maxLoanCount.trim()) {
      notify("❌ " + t("settings.materialTypes.kdc.fieldsRequired"), "error");
      return;
    }
    const body = {
      kdcPrefix: kdcForm.kdcPrefix.trim(),
      label: kdcForm.label.trim(),
      maxLoanCount: Number(kdcForm.maxLoanCount),
    };
    const url = kdcEditingId
      ? `${API_URL}/material-types/kdc-rules/${kdcEditingId}`
      : `${API_URL}/material-types/${bookType.id}/kdc-rules`;
    const res = await fetch(url, {
      method: kdcEditingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.kdc.saveSuccess"), "success");
      setShowKdcForm(false);
      setKdcEditingId(null);
      setKdcForm(EMPTY_KDC_FORM);
      await loadMaterialTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.kdc.saveFail")), "error");
    }
  }

  async function handleDeleteKdc() {
    if (!kdcEditingId) return;
    if (!window.confirm(t("settings.materialTypes.kdc.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types/kdc-rules/${kdcEditingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.kdc.deleteSuccess"), "success");
      setShowKdcForm(false);
      setKdcEditingId(null);
      setKdcForm(EMPTY_KDC_FORM);
      await loadMaterialTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.kdc.deleteFail")), "error");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.loan.sectionPhysical")}</p>

        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-neutral-600">{t("settings.loan.defaultTitle")}</p>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-3 py-2">{t("settings.loan.col.memberType")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.maxLoanCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.maxReservationCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.maxSuspensionDays")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.reservationHoldDays")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {memberSettings.map((item) => (
                  <tr key={item.memberTypeId}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{item.memberTypeName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxLoanCount}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxReservationCount}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                      {item.maxSuspensionDays !== null ? item.maxSuspensionDays : t("settings.loan.noLimit")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.reservationHoldDays}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openMemberModal(item)}
                        className="cursor-pointer rounded border px-2 py-1 text-xs"
                      >
                        {t("settings.loan.editBtn")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-600">{t("settings.loan.materialTitle")}</p>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-3 py-2">{t("settings.loan.col.materialType")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.materialMaxLoanCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.loanPeriodDays")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.materialMaxReservationCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {physicalTypes.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{item.nameKo}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxLoanCount ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.loanPeriodDays ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxReservationCount ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openMaterialModal(item)}
                          className="cursor-pointer rounded border px-2 py-1 text-xs"
                        >
                          {t("settings.loan.editBtn")}
                        </button>
                        {item.code === "book" && (
                          <button
                            type="button"
                            onClick={openKdcModal}
                            className="cursor-pointer rounded border px-2 py-1 text-xs"
                          >
                            {t("settings.materialTypes.kdcBtn")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.loan.sectionDigital")}</p>
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
          {t("settings.loan.digitalNotice")}
        </p>
      </div>

      {showMemberModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeMemberModal}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <p className="mb-4 text-sm font-semibold">{t("settings.loan.member.modalTitle")}</p>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.maxLoanCount")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.maxLoanCount}
                    onChange={(e) => setMemberForm({ ...memberForm, maxLoanCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.maxReservationCount")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.maxReservationCount}
                    onChange={(e) => setMemberForm({ ...memberForm, maxReservationCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.maxSuspensionDays")}</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.maxSuspensionDays}
                    onChange={(e) => setMemberForm({ ...memberForm, maxSuspensionDays: e.target.value })}
                    placeholder={t("settings.loan.maxSuspensionDaysPlaceholder")}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs text-neutral-400">{t("settings.loan.maxSuspensionDaysHint")}</span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.reservationHoldDays")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.reservationHoldDays}
                    onChange={(e) => setMemberForm({ ...memberForm, reservationHoldDays: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <ThemedButton preset="버튼1" onClick={handleSaveMember} className="mt-5 w-full">
                {t("settings.loan.save")}
              </ThemedButton>
            </div>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeMaterialModal}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <p className="mb-4 text-sm font-semibold">{t("settings.loan.material.modalTitle")}</p>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.materialMaxLoanCount")} *</span>
                  <input
                    type="number"
                    min={1}
                    value={materialForm.maxLoanCount}
                    onChange={(e) => setMaterialForm({ ...materialForm, maxLoanCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.loanPeriodDays")} *</span>
                  <input
                    type="number"
                    min={1}
                    value={materialForm.loanPeriodDays}
                    onChange={(e) => setMaterialForm({ ...materialForm, loanPeriodDays: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.materialMaxReservationCount")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={materialForm.maxReservationCount}
                    onChange={(e) => setMaterialForm({ ...materialForm, maxReservationCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <ThemedButton preset="버튼1" onClick={handleSaveMaterial} className="mt-5 w-full">
                {t("settings.loan.save")}
              </ThemedButton>
            </div>
          </div>
        </div>
      )}

      {showKdcModal && bookType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeKdcModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <p className="mb-1 text-sm font-semibold">{t("settings.materialTypes.kdc.modalTitle")}</p>
              <p className="mb-4 text-xs text-neutral-400">
                {t("settings.materialTypes.kdc.parentMaxLoanCountLabel")}: {bookType.maxLoanCount ?? "-"}
                {bookType.maxLoanCount !== null ? t("settings.materialTypes.kdc.countUnit") : ""}
              </p>

              <div className="flex flex-col gap-2">
                {bookType.kdcRules.length === 0 && (
                  <p className="text-sm text-neutral-400">{t("settings.materialTypes.kdc.empty")}</p>
                )}
                {bookType.kdcRules.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => openEditKdcForm(rule)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                      kdcEditingId === rule.id ? "border-neutral-800" : "border-neutral-200"
                    }`}
                  >
                    <span>{rule.label} ({rule.kdcPrefix})</span>
                    <span className="text-neutral-500">{rule.maxLoanCount}권</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={openAddKdcForm}
                className="mt-3 w-full cursor-pointer rounded-lg border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
              >
                {t("settings.materialTypes.kdc.addBtn")}
              </button>

              {showKdcForm && (
                <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                  <p className="text-sm font-semibold">
                    {kdcEditingId ? t("settings.materialTypes.kdc.modal.editTitle") : t("settings.materialTypes.kdc.modal.addTitle")}
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.kdc.field.kdcPrefix")}</span>
                    <input
                      value={kdcForm.kdcPrefix}
                      onChange={(e) => setKdcForm({ ...kdcForm, kdcPrefix: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.kdc.field.label")}</span>
                    <input
                      value={kdcForm.label}
                      onChange={(e) => setKdcForm({ ...kdcForm, label: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.kdc.field.maxLoanCount")}</span>
                    <input
                      type="number"
                      min={1}
                      value={kdcForm.maxLoanCount}
                      onChange={(e) => setKdcForm({ ...kdcForm, maxLoanCount: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <ThemedButton preset="버튼1" onClick={handleSaveKdc} className="w-full">
                    {t("settings.materialTypes.kdc.save")}
                  </ThemedButton>

                  {kdcEditingId && (
                    <button
                      onClick={handleDeleteKdc}
                      className="w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      {t("settings.materialTypes.kdc.deleteBtn")}
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={closeKdcModal}
                className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
              >
                {t("settings.materialTypes.kdc.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

> 이 파일에서 쓰는 문구(`settings.materialTypes.kdc.*`, `settings.materialTypes.kdcBtn`)는 예전에 '자료 종류' 화면에서 쓰던 것과 완전히 같은 문구 키를 그대로 재사용합니다. `dictionary.ts`는 이미 그 문구들을 갖고 있으므로, 이번 가이드에서는 문구를 새로 추가할 필요가 없습니다.

---

## 확인하기

1. **가장 먼저**: 백엔드 서버(`npm run start:dev`)와 프런트엔드 서버(`npm run dev`)를 재시작한 뒤, '설정' → '대출' 화면으로 이동해서 "자료별 대출 설정" 표에 있는 실물 자료들의 대출 가능 권수를 모두 더해보세요. 그 합계보다 크거나 같은 값을, "기본 대출 설정" 표에서 개인회원·단체회원·자료지원회원 **각각의** 최대 대출 권수에 입력해서 저장하세요. 예약 가능 권수도 마찬가지로 합계를 확인해서, 그 합계보다 크거나 같은 값을 각 회원구분의 최대 예약 권수에 입력해서 저장하세요. (이 순서를 지키지 않으면 다음 단계에서 자료별 대출 설정 수정이 계속 막힐 수 있습니다.)
2. '설정' → '자료 종류' 화면으로 이동해서, "도서" 행에 더 이상 "KDC 하위 규칙" 버튼이 없는지 확인하세요.
3. '설정' → '대출' 화면의 "자료별 대출 설정" 표에서 "도서" 행에 "KDC 하위 규칙" 버튼이 새로 생겼는지 확인하세요. 눌러서 기존에 등록해둔 KDC 규칙들이 그대로 보이는지, 추가·수정·삭제가 잘 되는지 확인하세요.
4. "자료별 대출 설정"에서 "도서"의 대출 가능 권수를 아주 크게(예: 999권) 올려서 저장해보세요. 합계가 어떤 회원구분의 최대 대출 권수보다 커지면 "실물 자료별 대출 가능 권수의 합(...)이 '...'의 최대 대출 권수(...)보다 많습니다" 안내와 함께 저장이 막히는지 확인하세요. 다시 원래 값으로 되돌리면 정상 저장되는지 확인하세요.
5. "기본 대출 설정"에서 어떤 회원구분의 최대 대출 권수를 아주 작게(예: 0권) 낮춰서 저장해보세요. 지금 자료별 대출 가능 권수 합계보다 작으면 "실물 자료별 대출 가능 권수의 합(...)보다 최대 대출 권수를 작게 설정할 수 없습니다" 안내와 함께 저장이 막히는지 확인하세요.
6. 예약 가능 권수 쪽도 4번, 5번과 같은 방식으로 한 번씩 확인해보세요.
7. 합계와 정확히 같은 값으로 저장했을 때는(더 크지 않고 딱 같을 때) 정상적으로 저장되는지 확인하세요.

---

## GitHub 커밋

모든 확인이 끝났다면 아래 명령어로 변경 내용을 저장하세요.

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선38: KDC 하위 규칙을 대출 메뉴로 이동, 자료별 대출/예약 권수 합계 검증 추가"
git push
```

---

## 최종 점검표

- [ ] '대출' 화면에서 회원구분별 최대 대출/예약 권수를, 자료별 대출/예약 권수 합계보다 크거나 같게 먼저 조정했다.
- [ ] `backend/src/settings/material-types.service.ts` 파일 전체를 새 내용으로 바꿨다. (`checkAgainstMemberLimits` 함수 추가)
- [ ] `backend/src/settings/loan-settings.service.ts`에 합계 검증 코드를 추가했다.
- [ ] `frontend/src/components/material-types-settings-form.tsx` 파일 전체를 새 내용으로 바꿨다. (KDC 제거)
- [ ] `frontend/src/components/loan-settings-form.tsx` 파일 전체를 새 내용으로 바꿨다. (KDC 추가)
- [ ] '자료 종류' 화면에서 "KDC 하위 규칙" 버튼이 사라졌다.
- [ ] '대출' 화면의 "도서" 행에서 "KDC 하위 규칙" 버튼으로 기존 규칙을 그대로 관리할 수 있다.
- [ ] 자료별 대출/예약 권수 합계가 회원구분의 최대치를 넘으면 저장이 막힌다.
- [ ] 회원구분의 최대 대출/예약 권수를 자료별 합계보다 작게 낮추면 저장이 막힌다.
- [ ] 합계와 정확히 같은 값은 정상적으로 저장된다.
- [ ] 변경 내용을 GitHub에 커밋 및 푸시했다.
