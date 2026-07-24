import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { extractColumns } from "./marc.util";
import { searchKolis, getKolisMarc } from "./kolis.util";

const ALLOWED_TYPES = [
  'book', 'dvd', 'article', 'thesis', 'law', 'video', 'music',
  'webpage', 'boardgame', 'tool', 'equipment', 'collection',
  'photo', 'clipping', 'etc',
];

type BibData = {
  type: string;
  title?: string;
  creator?: string;
  publisher?: string;
  pubYear?: string;
  isbn?: string;
  classNumber?: string;
  format?: string;
  subject?: string;
  language?: string;
  summary?: string;
  coverUrl?: string;
  onlineUrl?: string;
};

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async searchKolisNet(keyword: string, page = 1) {
    if (!keyword || !keyword.trim()) {
      throw new BadRequestException("검색어를 입력하세요.");
    }
    return searchKolis(keyword.trim(), page);
  }

  async importKolisMarc(recKey: string) {
    if (!recKey) {
      throw new BadRequestException("recKey가 없습니다.");
    }
    return getKolisMarc(recKey);
  }

  async createBibliographic(userId: number, libraryId: number, data: any) {
    const { type, marc } = data;
    if (!type) {
      throw new BadRequestException("자료 종류를 선택하세요.");
    }

    let fields: any;
    if (Array.isArray(marc) && marc.length > 0) {
      // 책·DVD: MARC에서 각 칸을 자동으로 뽑고, 원본도 함께 저장
      fields = extractColumns(marc);
      fields.marc = marc;
      if (data.marcRaw) fields.marcRaw = data.marcRaw; // KOLIS-NET에서 받은 원본 텍스트(있으면)
    } else {
      // 비도서: 폼에서 받은 값 그대로
      const { type: _t, marc: _m, ...rest } = data;
      fields = rest;
    }

    if (!fields.title || !String(fields.title).trim()) {
      throw new BadRequestException(
        "제목(서명)은 필수입니다. MARC라면 245 ▼a를 확인하세요.",
      );
    }

    return this.prisma.material.create({
      data: {
        libraryId,
        type,
        createdById: userId,
        ...fields,
      },
    });
  }

  // 우리 도서관에 이미 등록된 서지(Material)를 제목·저자로 검색 (KOLIS-NET 검색과는 다름!)
  async searchMaterials(libraryId: number, search?: string) {
    const keyword = search?.trim();
    return this.prisma.material.findMany({
      where: {
        libraryId,
        ...(keyword
          ? {
              OR: [
                { title: { contains: keyword, mode: "insensitive" } },
                { creator: { contains: keyword, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  // 자료 하나 + 그 자료의 소장 부수 목록을 함께 가져오기
  async getMaterialWithCopies(libraryId: number, id: number) {
    const material = await this.prisma.material.findFirst({
      where: { id, libraryId },
      include: { copies: { orderBy: { createdAt: "desc" } } },
    });
    if (!material) {
      throw new NotFoundException("자료를 찾을 수 없습니다.");
    }
    return material;
  }

  // 새 부수(실물) 추가
  async addCopy(userId: number, libraryId: number, materialId: number, data: any) {
    const material = await this.prisma.material.findFirst({
      where: { id: materialId, libraryId },
    });
    if (!material) {
      throw new BadRequestException("자료를 찾을 수 없습니다.");
    }
    if (!data.registrationNo || !String(data.registrationNo).trim()) {
      throw new BadRequestException("등록번호는 필수입니다.");
    }

    const ALLOWED_STATUS = ["AVAILABLE", "ON_LOAN", "RESERVED", "REPAIR", "LOST", "WITHDRAWN"];
    const status = ALLOWED_STATUS.includes(data.status) ? data.status : undefined;

    try {
      return await this.prisma.copy.create({
        data: {
          libraryId,
          materialId,
          registrationNo: String(data.registrationNo).trim(),
          callNumber: data.callNumber || undefined,
          authorCode: data.authorCode || undefined,
          specialCode: data.specialCode || undefined,
          shelfNo: data.shelfNo || undefined,
          location: data.location || undefined,
          memo: data.memo || undefined,
          volume: data.volume || undefined,
          copyNumber: data.copyNumber || undefined,
          ...(status ? { status } : {}), // 못 알아보는 값이면 표의 기본값(AVAILABLE)을 씀
          createdById: userId,
        },
      });
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new BadRequestException("이미 등록된 등록번호입니다.");
      }
      throw e;
    }
  }

  async listCopies(
    libraryId: number,
    options: {
      page: number;
      pageSize: number;
      type?: string;
      title?: string;
      creator?: string;
      subject?: string;
      registrationNos?: string[];
    },
  ) {
    const ALLOWED_SIZES = [10, 20, 30, 40, 50];
    const pageSize = ALLOWED_SIZES.includes(options.pageSize) ? options.pageSize : 10;
    const page = options.page && options.page > 0 ? options.page : 1;

    const hasRegNoFilter = !!(options.registrationNos && options.registrationNos.length > 0);

    // 등록번호로 찾을 때 — 실물(Copy) 기준 그대로 검색
    if (hasRegNoFilter) {
      const where: any = { libraryId, registrationNo: { in: options.registrationNos } };
      const [total, copies] = await Promise.all([
        this.prisma.copy.count({ where }),
        this.prisma.copy.findMany({
          where,
          include: { material: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return { total, page, pageSize, items: copies.map((c) => ({ ...c, hasCopy: true })) };
    }

    // 상세 검색(종류·제목·저자·주제) — 조건이 없으면 도서관 전체 서지를 대상으로 함,
    // 실물이 없는 서지는 빈 칸으로 함께 보여줍니다.
    const materialWhere: any = { libraryId };
    if (options.type) materialWhere.type = options.type;
    if (options.title) materialWhere.title = { contains: options.title, mode: 'insensitive' };
    if (options.creator) materialWhere.creator = { contains: options.creator, mode: 'insensitive' };
    if (options.subject) materialWhere.subject = { contains: options.subject, mode: 'insensitive' };

    const materials = await this.prisma.material.findMany({
      where: materialWhere,
      include: { copies: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const allRows: any[] = [];
    for (const m of materials) {
      const { copies, ...material } = m;
      if (copies.length > 0) {
        for (const c of copies) {
          allRows.push({ ...c, material, hasCopy: true });
        }
      } else {
        allRows.push({
          id: null,
          materialId: material.id,
          registrationNo: null,
          authorCode: null,
          specialCode: null,
          shelfNo: null,
          location: null,
          volume: null,
          copyNumber: null,
          status: null,
          material,
          hasCopy: false,
        });
      }
    }

    const total = allRows.length;
    const items = allRows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    return { total, page, pageSize, items };
  }

  // 실물(Copy) 수정
  async updateCopy(libraryId: number, copyId: number, data: any) {
    const copy = await this.prisma.copy.findFirst({ where: { id: copyId, libraryId } });
    if (!copy) {
      throw new BadRequestException("실물을 찾을 수 없습니다.");
    }
    if (!data.registrationNo || !String(data.registrationNo).trim()) {
      throw new BadRequestException("등록번호는 필수입니다.");
    }

    const ALLOWED_STATUS = ["AVAILABLE", "ON_LOAN", "RESERVED", "REPAIR", "LOST", "WITHDRAWN"];
    const status = ALLOWED_STATUS.includes(data.status) ? data.status : copy.status;

    try {
      return await this.prisma.copy.update({
        where: { id: copyId },
        data: {
          registrationNo: String(data.registrationNo).trim(),
          callNumber: data.callNumber || null,
          authorCode: data.authorCode || null,
          specialCode: data.specialCode || null,
          shelfNo: data.shelfNo || null,
          location: data.location || null,
          memo: data.memo || null,
          volume: data.volume || null,
          copyNumber: data.copyNumber || null,
          status,
        },
      });
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new BadRequestException("이미 등록된 등록번호입니다.");
      }
      throw e;
    }
  }

  async getLatestRegistrationNo(libraryId: number) {
    const latest = await this.prisma.copy.findFirst({
      where: { libraryId },
      orderBy: { createdAt: 'desc' },
      select: { registrationNo: true },
    });
    return { registrationNo: latest?.registrationNo ?? null };
  }

  // MARC 편집기에서 수정한 내용을 서지(Material)에 다시 저장 (칸 자동추출도 다시 실행)
  async updateMaterialMarc(libraryId: number, materialId: number, marc: any) {
    const material = await this.prisma.material.findFirst({ where: { id: materialId, libraryId } });
    if (!material) {
      throw new BadRequestException("자료를 찾을 수 없습니다.");
    }
    if (!Array.isArray(marc) || marc.length === 0) {
      throw new BadRequestException("MARC 데이터가 없습니다.");
    }
    const fields: any = extractColumns(marc);
    fields.marc = marc;
    if (!fields.title || !String(fields.title).trim()) {
      throw new BadRequestException("제목(서명)은 필수입니다. MARC라면 245 ▼a를 확인하세요.");
    }
    return this.prisma.material.update({
      where: { id: materialId },
      data: fields,
    });
  }

}