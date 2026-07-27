# 22단계_1. 자료 종류를 관리자가 직접 추가·수정할 수 있게 만들기 (1) - 데이터베이스와 서버

## 🎯 목표

지금까지 "자료 종류"(도서, DVD, 기사...)는 `frontend/src/lib/material-types.ts`라는 파일에 코드로 딱 고정되어 있었어요. 이번엔 이걸 완전히 바꿔서, **관리자가 설정 화면에서 자료 종류를 직접 추가·수정·삭제**할 수 있게 만들 거예요.

정리하면 이런 구조예요.

- 자료 종류는 크게 **실물 자료** / **디지털 자료** 두 가지로 나뉩니다.
- **실물 자료**: 도서, DVD, 보드게임, 공구, 장비, 논문(실물), 자료집, 스크랩 — 이 8종류는 실물 등록이 가능하고, 종류마다 "대출 가능 권수"와 "대출 일수"를 정합니다.
- **디지털 자료**: 논문(디지털), 법령, 영상, 음악, 웹페이지, 사진, 기사 — 이 7종류는 실물이 없고, 대출 설정도 없습니다.
- 새로운 자료 종류를 나중에 추가할 수도 있는데, 그때 실물 자료로 만들면 대출 가능 권수·대출 일수를 그 자리에서 같이 입력하게 됩니다.
- '도서' 종류는 특별히, 그 안에서 KDC 분류기호별로 별도의(더 낮은) 대출 가능 권수를 정할 수 있어요. 예: 도서 전체는 10권인데, 만화(KDC 657)만 5권으로 제한. KDC "657"이라고 정하면 657.1, 657.9처럼 657로 시작하는 모든 번호가 포함되지만, 6570처럼 관계없는 번호는 포함되지 않도록 정확하게 매칭할게요. 이 하위 규칙의 권수는 상위(도서)의 권수보다 클 수 없고, 상위 권수를 하위 규칙보다 작게 낮추는 것도 막을 거예요.

이번 22단계_1에서는 **데이터베이스 구조와 서버(백엔드) API**까지 만들어요. 관리자가 실제로 자료 종류를 추가·수정하는 **화면**은 다음 가이드(22단계_2)에서, 자료 등록 화면의 "실물/디지털 선택 → 세부 종류 선택 → MARC/간단폼" 2단계 흐름 개편은 그다음 가이드(22단계_3)에서 이어서 만들게요.

> 💡 확인해주신 대로, 지금 시스템엔 "논문"으로 등록된 자료가 없어서 기존 데이터 이전 작업 없이 바로 진행해도 안전해요.

---

## 1단계. 데이터베이스 구조 만들기

**파일**: `backend/prisma/schema.prisma`

### 1) `Library` 모델에 새 관계 추가하기

**찾기:**

```prisma
  copyOptions  CopyOption[] // ← 추가 (상태/별치기호/소장처 목록)
}
```

**이렇게 바꿔주세요:**

```prisma
  copyOptions   CopyOption[]   // ← 추가 (상태/별치기호/소장처 목록)
  materialTypes MaterialType[] // ← 추가 (자료 종류 목록)
  bookKdcRules  BookKdcRule[]  // ← 추가 (도서 KDC 하위 규칙)
}
```

> 💡 지금 `Library` 모델을 직접 확인해보니 `memberTypes`(회원 구분 목록)는 아직 만들어진 적이 없는 항목이었어요. 이전 가이드 초안에서 잘못 들어가 있던 부분이라 이번에 바로잡았어요. 위 찾기/바꿔주기는 실제 파일 내용과 그대로 일치하니 안심하고 진행하시면 됩니다.

### 2) 새 모델 `MaterialType` 추가하기

파일 아래쪽, 다른 `model` 블록들 근처에 새로 추가해주세요.

```prisma
// 자료 종류(도서, DVD, 기사...)입니다. 관리자가 직접 추가·수정·삭제할 수 있습니다.
model MaterialType {
  id             Int      @id @default(autoincrement())

  libraryId      Int
  library        Library  @relation(fields: [libraryId], references: [id])

  code           String   // 내부적으로 쓰는 코드 (예: "book", "thesis_physical")
  nameKo         String
  nameEn         String
  category       String   // "PHYSICAL"(실물 자료) | "DIGITAL"(디지털 자료)
  usesMarc       Boolean  @default(false) // MARC 편집기를 쓸지, 간단한 입력폼을 쓸지
  order          Int      @default(0)

  maxLoanCount   Int?     // 실물 자료일 때만 사용: 대출 가능 권수
  loanPeriodDays Int?     // 실물 자료일 때만 사용: 대출 일수

  createdAt      DateTime @default(now())

  kdcRules       BookKdcRule[]

  @@unique([libraryId, code])
}

// '도서' 같은 특정 자료 종류 안에서, KDC 분류기호별로 더 세분화된 대출 규칙을 정합니다.
model BookKdcRule {
  id             Int          @id @default(autoincrement())

  libraryId      Int
  library        Library      @relation(fields: [libraryId], references: [id])

  materialTypeId Int
  materialType   MaterialType @relation(fields: [materialTypeId], references: [id])

  kdcPrefix      String       // 예: "657" → 657, 657.1, 657.9 등 포함
  label          String       // 예: "만화"
  maxLoanCount   Int          // 이 KDC의 대출 가능 권수 (상위 자료 종류의 권수를 넘을 수 없음)

  createdAt      DateTime     @default(now())

  @@unique([libraryId, materialTypeId, kdcPrefix])
}
```

### 3) 마이그레이션 실행하기

```
cd C:\projects\LibraryNearMe\backend
npx prisma migrate dev --name add_material_types
```

---

## 2단계. 백엔드 - 자료 종류 추가/수정/삭제 + KDC 규칙 기능 만들기

### 1) 새 파일: `backend/src/settings/material-types.service.ts`

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// 처음 이 도서관이 자료 종류 관리 기능을 쓸 때 자동으로 채워지는 기본 15개 종류입니다.
const DEFAULT_MATERIAL_TYPES = [
  // 실물 자료 (대출 설정 있음)
  { code: 'book', nameKo: '도서', nameEn: 'Book', category: 'PHYSICAL', usesMarc: true, maxLoanCount: 10, loanPeriodDays: 14 },
  { code: 'dvd', nameKo: 'DVD', nameEn: 'DVD', category: 'PHYSICAL', usesMarc: true, maxLoanCount: 2, loanPeriodDays: 7 },
  { code: 'boardgame', nameKo: '보드게임', nameEn: 'Board Game', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 1, loanPeriodDays: 7 },
  { code: 'tool', nameKo: '공구', nameEn: 'Tool', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 1, loanPeriodDays: 7 },
  { code: 'equipment', nameKo: '장비', nameEn: 'Equipment', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 1, loanPeriodDays: 7 },
  { code: 'thesis_physical', nameKo: '논문(실물)', nameEn: 'Thesis (Physical)', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 2, loanPeriodDays: 14 },
  { code: 'collection', nameKo: '자료집', nameEn: 'Anthology', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 2, loanPeriodDays: 14 },
  { code: 'clipping', nameKo: '스크랩', nameEn: 'Clipping', category: 'PHYSICAL', usesMarc: false, maxLoanCount: 2, loanPeriodDays: 14 },
  // 디지털 자료 (대출 설정 없음)
  { code: 'thesis_digital', nameKo: '논문(디지털)', nameEn: 'Thesis (Digital)', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null },
  { code: 'law', nameKo: '법령', nameEn: 'Law', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null },
  { code: 'video', nameKo: '영상', nameEn: 'Video', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null },
  { code: 'music', nameKo: '음악', nameEn: 'Music', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null },
  { code: 'webpage', nameKo: '웹페이지', nameEn: 'Web Page', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null },
  { code: 'photo', nameKo: '사진', nameEn: 'Photo', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null },
  { code: 'article', nameKo: '기사', nameEn: 'Article', category: 'DIGITAL', usesMarc: false, maxLoanCount: null, loanPeriodDays: null },
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

  // 새 자료 종류 추가. 실물(PHYSICAL)이면 대출 가능 권수·대출 일수를 반드시 같이 받습니다.
  async create(libraryId: number, data: any) {
    const code = String(data.code || '').trim();
    const nameKo = String(data.nameKo || '').trim();
    const nameEn = String(data.nameEn || '').trim();
    const category = data.category === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL';
    const usesMarc = !!data.usesMarc;

    if (!code || !nameKo) {
      throw new BadRequestException('코드와 이름을 입력하세요.');
    }

    let maxLoanCount: number | null = null;
    let loanPeriodDays: number | null = null;
    if (category === 'PHYSICAL') {
      maxLoanCount = Number(data.maxLoanCount);
      loanPeriodDays = Number(data.loanPeriodDays);
      if (!Number.isFinite(maxLoanCount) || maxLoanCount < 1) {
        throw new BadRequestException('실물 자료는 대출 가능 권수를 입력해야 합니다.');
      }
      if (!Number.isFinite(loanPeriodDays) || loanPeriodDays < 1) {
        throw new BadRequestException('실물 자료는 대출 일수를 입력해야 합니다.');
      }
    }

    const count = await this.prisma.materialType.count({ where: { libraryId } });
    try {
      return await this.prisma.materialType.create({
        data: {
          libraryId, code, nameKo, nameEn: nameEn || nameKo,
          category, usesMarc, maxLoanCount, loanPeriodDays,
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

  // 자료 종류 수정. 실물 자료의 대출 가능 권수는, 그 아래 KDC 하위 규칙 중 가장 큰 값보다 작게 낮출 수 없습니다.
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

    return this.prisma.materialType.update({
      where: { id },
      data: { nameKo, nameEn: nameEn || nameKo, maxLoanCount, loanPeriodDays },
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

  // --- '도서' 등 특정 자료 종류 안의 KDC 하위 규칙 ---

  async createKdcRule(libraryId: number, materialTypeId: number, data: any) {
    const materialType = await this.prisma.materialType.findFirst({ where: { id: materialTypeId, libraryId } });
    if (!materialType) {
      throw new NotFoundException('자료 종류를 찾을 수 없습니다.');
    }
    if (materialType.category !== 'PHYSICAL' || materialType.maxLoanCount === null) {
      throw new BadRequestException('실물 자료에만 KDC 하위 규칙을 만들 수 있습니다.');
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

### 무슨 코드인가요?

- `list()`: 예전 `KormarcTagsService`, `CopyOptionsService`와 똑같은 패턴이에요. 이 도서관에 자료 종류가 하나도 없으면(=처음 쓰는 경우) 기본 15개를 자동으로 채워 넣어요.
- `create()`: 새 종류를 추가할 때, 실물(`PHYSICAL`)이면 대출 가능 권수·대출 일수가 **필수**예요. 디지털(`DIGITAL`)이면 이 두 값은 그냥 빈 값(`null`)으로 저장돼요.
- `update()`: 실물 자료의 대출 가능 권수를 낮추려고 할 때, 그 안에 있는 KDC 하위 규칙 중 가장 큰 값보다 작게는 못 낮추도록 막아요. (예: 만화가 5권으로 설정되어 있으면, 도서 전체 권수를 4권으로는 못 낮춰요.)
- `remove()`: 최소 1개는 남아있어야 하고, 이미 그 종류로 등록된 서지 자료가 있으면 삭제를 막아요.
- `createKdcRule()` / `updateKdcRule()`: KDC 하위 규칙을 새로 만들거나 수정할 때, 상위 자료 종류(도서)의 권수를 넘지 못하게 막아요.

---

### 2) 새 파일: `backend/src/settings/material-types.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { MaterialTypesService } from './material-types.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('material-types')
export class MaterialTypesController {
  constructor(private materialTypesService: MaterialTypesService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any) {
    return this.materialTypesService.list(req.user.libraryId);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.materialTypesService.create(req.user.libraryId, body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.materialTypesService.update(req.user.libraryId, parseInt(id, 10), body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.materialTypesService.remove(req.user.libraryId, parseInt(id, 10));
  }

  @Post(':id/kdc-rules')
  @UseGuards(AdminGuard)
  createKdcRule(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.materialTypesService.createKdcRule(req.user.libraryId, parseInt(id, 10), body);
  }

  @Patch('kdc-rules/:ruleId')
  @UseGuards(AdminGuard)
  updateKdcRule(@Req() req: any, @Param('ruleId') ruleId: string, @Body() body: any) {
    return this.materialTypesService.updateKdcRule(req.user.libraryId, parseInt(ruleId, 10), body);
  }

  @Delete('kdc-rules/:ruleId')
  @UseGuards(AdminGuard)
  removeKdcRule(@Req() req: any, @Param('ruleId') ruleId: string) {
    return this.materialTypesService.removeKdcRule(req.user.libraryId, parseInt(ruleId, 10));
  }
}
```

### 3) `backend/src/app.module.ts`에 등록하기

**찾기:**

```typescript
import { CopyOptionsController } from './settings/copy-options.controller';
import { CopyOptionsService } from './settings/copy-options.service';
```

**이렇게 바꿔주세요:**

```typescript
import { CopyOptionsController } from './settings/copy-options.controller';
import { CopyOptionsService } from './settings/copy-options.service';
import { MaterialTypesController } from './settings/material-types.controller';
import { MaterialTypesService } from './settings/material-types.service';
```

**찾기:**

```typescript
    KormarcTagsController,
    CopyOptionsController,
  ],
  providers: [
    AppService,
    PrismaService,
    LibraryService,
    UsersService,
    AuthService,
    MaterialsService,
    KormarcTagsService,
    CopyOptionsService,
  ],
```

**이렇게 바꿔주세요:**

```typescript
    KormarcTagsController,
    CopyOptionsController,
    MaterialTypesController,
  ],
  providers: [
    AppService,
    PrismaService,
    LibraryService,
    UsersService,
    AuthService,
    MaterialsService,
    KormarcTagsService,
    CopyOptionsService,
    MaterialTypesService,
  ],
```

> 💡 이 부분도 실제 파일을 다시 확인해보니, `MemberTypesController`/`Service`는 아직 존재하지 않았어요(위 회원 구분 관련 안내와 같은 원인이에요). 그래서 실제로 마지막에 등록되어 있는 `CopyOptionsController`/`CopyOptionsService` 바로 다음에 새 항목을 추가하는 것으로 바로잡았어요.

---

## 3단계. 자료 등록할 때, 하드코딩된 목록 대신 DB에서 종류를 확인하도록 수정하기

**파일**: `backend/src/materials/materials.service.ts`

이제 자료 종류는 더 이상 코드에 고정된 목록이 아니라 데이터베이스에서 관리되니, 자료를 새로 등록할 때도 DB를 보고 확인하도록 바꿔줄게요.

**찾기:**

```typescript
const ALLOWED_TYPES = [
  'book', 'dvd', 'article', 'thesis', 'law', 'video', 'music',
  'webpage', 'boardgame', 'tool', 'equipment', 'collection',
  'photo', 'clipping', 'etc',
];
```

**이 부분을 통째로 지워주세요.** (더 이상 안 쓰는 코드예요. 실제로 지금까지 이 목록은 어디서도 검사에 쓰이고 있지 않았어요.)

이번엔 `createBibliographic` 함수를 찾아주세요.

**찾기:**

```typescript
  async createBibliographic(userId: number, libraryId: number, data: any) {
    const { type, marc } = data;
    if (!type) {
      throw new BadRequestException("자료 종류를 선택하세요.");
    }
```

**이렇게 바꿔주세요:**

```typescript
  async createBibliographic(userId: number, libraryId: number, data: any) {
    const { type, marc } = data;
    if (!type) {
      throw new BadRequestException("자료 종류를 선택하세요.");
    }
    const materialType = await this.prisma.materialType.findFirst({ where: { libraryId, code: type } });
    if (!materialType) {
      throw new BadRequestException("올바르지 않은 자료 종류입니다.");
    }
```

### 무슨 코드인가요?

- 예전엔 `ALLOWED_TYPES`라는 배열이 코드에 있긴 했지만, 실제로는 아무 곳에서도 쓰이지 않던 죽은 코드였어요. (자료 종류를 검사하는 로직이 사실 없었던 거예요.)
- 이제는 자료를 등록할 때, 보낸 `type`(예: `"book"`) 값이 실제로 이 도서관의 `MaterialType` 목록에 있는 코드인지 데이터베이스에서 확인해요. 없는 코드면 등록이 거부돼요.

---

## ✅ 확인하기

1. `npx prisma migrate dev --name add_material_types`를 실행했는지 확인해주세요.
2. 백엔드를 재시작해주세요.
3. 관리자 페이지에 로그인한 상태에서, 브라우저 주소창이나 Postman 같은 도구로 `GET http://localhost:3001/material-types`를 호출해보세요. (토큰이 필요해서 브라우저 주소창만으로는 안 될 수 있어요 — 이 단계는 건너뛰셔도 괜찮아요. 다음 가이드에서 화면으로 직접 확인하실 수 있어요.)
4. 자료 등록 화면에서 지금까지 하던 대로 자료를 하나 등록해보고, 오류 없이 잘 등록되는지 확인해주세요. (아직 화면 자체는 예전 15개 종류 목록을 그대로 쓰고 있어서, 자료 종류 선택 화면은 아직 안 바뀌어 보일 수 있어요 — 이건 다음 가이드에서 바꿔요.)

---

## 📌 GitHub에 저장하기

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "22단계_1: 자료 종류 DB화 및 KDC 하위 규칙 기능 추가 (백엔드)"
git push
```

---

## 📋 최종 점검표

- [ ] `schema.prisma`에 `MaterialType`, `BookKdcRule` 모델을 추가하고 마이그레이션을 실행했다
- [ ] `backend/src/settings/material-types.service.ts`, `.controller.ts`를 새로 만들었다
- [ ] `app.module.ts`에 등록했다
- [ ] `materials.service.ts`에서 하드코딩된 `ALLOWED_TYPES`를 지우고 DB 확인 로직으로 바꿨다
- [ ] 자료 등록이 여전히 잘 작동한다
- [ ] GitHub에 커밋 & 푸시를 완료했다

수고하셨습니다! 이제 자료 종류가 데이터베이스에서 관리되는 구조가 갖춰졌어요. 다음 가이드(22단계_2)에서는 관리자 설정에 자료 종류를 직접 추가·수정·삭제하고, 도서 종류 안에 KDC 하위 규칙을 만드는 화면을 만들게요.
