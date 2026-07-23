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

}