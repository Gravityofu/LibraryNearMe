import { Injectable, BadRequestException } from '@nestjs/common';
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
}