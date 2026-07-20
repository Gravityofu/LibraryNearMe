import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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

  // 서지 정보(Material) 하나 저장. userId = 등록한 사서
  async createBibliographic(userId: number, libraryId: number, data: BibData) {
    if (!data.type || !ALLOWED_TYPES.includes(data.type)) {
      throw new BadRequestException('올바른 자료 종류를 선택해 주세요.');
    }
    if (!data.title) {
      throw new BadRequestException('제목은 필수입니다.');
    }

    const material = await this.prisma.material.create({
      data: {
        libraryId,
        type: data.type,
        title: data.title,
        creator: data.creator || undefined,
        publisher: data.publisher || undefined,
        pubYear: data.pubYear || undefined,
        isbn: data.isbn || undefined,
        classNumber: data.classNumber || undefined,
        format: data.format || undefined,
        subject: data.subject || undefined,
        language: data.language || undefined,
        summary: data.summary || undefined,
        coverUrl: data.coverUrl || undefined,
        onlineUrl: data.onlineUrl || undefined,
        createdById: userId, // ← 로그인한 사서 기록
      },
    });

    return { id: material.id };
  }
}