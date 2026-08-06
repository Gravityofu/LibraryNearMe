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
      if (data.coverUrl) fields.coverUrl = data.coverUrl; // 표지 URL은 MARC에서 자동으로 뽑히지 않아서, 직접 입력받은 값을 그대로 저장
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

  // 참고자료 등록 모달의 '자료' 탭 검색입니다. 제목·저자·출판사·키워드(주제어)로 각각 검색할 수 있고
  // 아무것도 입력하지 않으면 등록순(오래된 것부터)으로 모든 자료가 나옵니다.
  async searchForReference(
    libraryId: number,
    filters: { title?: string; creator?: string; publisher?: string; subject?: string },
    page: number,
  ) {
    const pageSize = 10;
    const AND: any[] = [];
    if (filters.title) AND.push({ title: { contains: filters.title, mode: "insensitive" } });
    if (filters.creator) AND.push({ creator: { contains: filters.creator, mode: "insensitive" } });
    if (filters.publisher) AND.push({ publisher: { contains: filters.publisher, mode: "insensitive" } });
    if (filters.subject) AND.push({ subject: { contains: filters.subject, mode: "insensitive" } });

    const where: any = { libraryId };
    if (AND.length > 0) where.AND = AND;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.material.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.material.count({ where }),
    ]);

    const materialTypes = await this.prisma.materialType.findMany({ where: { libraryId } });
    const typeNameMap = new Map(materialTypes.map((t) => [t.code, t.nameKo]));

    return {
      items: items.map((m) => ({
        id: m.id,
        typeLabel: typeNameMap.get(m.type) || m.type,
        title: m.title,
        author: m.creator || "",
        publisher: m.publisher || "",
      })),
      total,
      page,
      pageSize,
    };
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
    if (
      !data.status || !String(data.status).trim() ||
      !data.callNumber || !String(data.callNumber).trim() ||
      !data.specialCode || !String(data.specialCode).trim() ||
      !data.location || !String(data.location).trim()
    ) {
      throw new BadRequestException("등록번호, 상태, 청구기호, 별치기호, 소장처는 모두 필수 입력 항목입니다.");
    }

    const status = String(data.status).trim();

    try {
      return await this.prisma.copy.create({
        data: {
          libraryId,
          materialId,
          registrationNo: String(data.registrationNo).trim(),
          callNumber: String(data.callNumber).trim(),
          authorCode: data.authorCode || undefined,
          specialCode: String(data.specialCode).trim(),
          shelfNo: data.shelfNo || undefined,
          location: String(data.location).trim(),
          memo: data.memo || undefined,
          volume: data.volume || undefined,
          copyNumber: data.copyNumber || undefined,
          status,
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
    if (
      !data.status || !String(data.status).trim() ||
      !data.callNumber || !String(data.callNumber).trim() ||
      !data.specialCode || !String(data.specialCode).trim() ||
      !data.location || !String(data.location).trim()
    ) {
      throw new BadRequestException("등록번호, 상태, 청구기호, 별치기호, 소장처는 모두 필수 입력 항목입니다.");
    }

    const status = String(data.status).trim();

    try {
      return await this.prisma.copy.update({
        where: { id: copyId },
        data: {
          registrationNo: String(data.registrationNo).trim(),
          callNumber: String(data.callNumber).trim(),
          authorCode: data.authorCode || null,
          specialCode: String(data.specialCode).trim(),
          shelfNo: data.shelfNo || null,
          location: String(data.location).trim(),
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

// 실물(Copy) 삭제
  async removeCopy(libraryId: number, copyId: number) {
    const copy = await this.prisma.copy.findFirst({ where: { id: copyId, libraryId } });
    if (!copy) {
      throw new BadRequestException("실물을 찾을 수 없습니다.");
    }
    await this.prisma.copy.delete({ where: { id: copyId } });
    return { success: true };
  }

  async getLatestRegistrationNo(libraryId: number) {
    // 등록번호는 1,2,3...처럼 순수 숫자입니다. '가장 최근에 저장된 것'이 아니라
    // '등록번호 중 가장 큰 숫자'를 찾아서 돌려줍니다.
    const copies = await this.prisma.copy.findMany({
      where: { libraryId },
      select: { registrationNo: true },
    });

    let maxRegistrationNo: string | null = null;
    let maxValue = -Infinity;
    for (const copy of copies) {
      const value = parseInt(copy.registrationNo, 10);
      if (!Number.isNaN(value) && value > maxValue) {
        maxValue = value;
        maxRegistrationNo = copy.registrationNo;
      }
    }

    return { registrationNo: maxRegistrationNo };
  }

  // MARC를 쓰지 않는 자료(비도서)의 정보를 수정합니다. 입력받은 값을 그대로 저장해요.
  async updateMaterialSimple(libraryId: number, materialId: number, data: any) {
    const material = await this.prisma.material.findFirst({ where: { id: materialId, libraryId } });
    if (!material) {
      throw new BadRequestException("자료를 찾을 수 없습니다.");
    }
    if (!data.title || !String(data.title).trim()) {
      throw new BadRequestException("제목은 필수입니다.");
    }
    return this.prisma.material.update({
      where: { id: materialId },
      data: {
        title: String(data.title).trim(),
        creator: data.creator || null,
        publisher: data.publisher || null,
        pubYear: data.pubYear || null,
        isbn: data.isbn || null,
        classNumber: data.classNumber || null,
        format: data.format || null,
        subject: data.subject || null,
        language: data.language || null,
        summary: data.summary || null,
        coverUrl: data.coverUrl || null,
        onlineUrl: data.onlineUrl || null,
      },
    });
  }

  // 자료(서지) 삭제 — 이 자료에 등록된 실물이 하나라도 있으면 삭제할 수 없습니다.
  async removeMaterial(libraryId: number, materialId: number) {
    const material = await this.prisma.material.findFirst({
      where: { id: materialId, libraryId },
      include: { copies: true },
    });
    if (!material) {
      throw new BadRequestException("자료를 찾을 수 없습니다.");
    }
    if (material.copies.length > 0) {
      throw new BadRequestException(
        `이 자료에는 등록된 실물이 ${material.copies.length}건 있어 삭제할 수 없습니다. 실물을 먼저 모두 삭제해주세요.`,
      );
    }
    await this.prisma.material.delete({ where: { id: materialId } });
    return { success: true };
  }

  // MARC 편집기에서 수정한 내용을 서지(Material)에 다시 저장 (칸 자동추출도 다시 실행)
  async updateMaterialMarc(libraryId: number, materialId: number, marc: any, coverUrl?: string) {
    const material = await this.prisma.material.findFirst({ where: { id: materialId, libraryId } });
    if (!material) {
      throw new BadRequestException("자료를 찾을 수 없습니다.");
    }
    if (!Array.isArray(marc) || marc.length === 0) {
      throw new BadRequestException("MARC 데이터가 없습니다.");
    }
    const fields: any = extractColumns(marc);
    fields.marc = marc;
    if (coverUrl !== undefined) fields.coverUrl = coverUrl || null; // 표지 URL은 MARC에서 자동으로 뽑히지 않아서 따로 받아 저장해요.
    if (!fields.title || !String(fields.title).trim()) {
      throw new BadRequestException("제목(서명)은 필수입니다. MARC라면 245 ▼a를 확인하세요.");
    }
    return this.prisma.material.update({
      where: { id: materialId },
      data: fields,
    });
  }

}