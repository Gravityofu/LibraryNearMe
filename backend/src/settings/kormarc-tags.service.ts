import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DEFAULT_KORMARC_TAGS } from './kormarc-tags.default';

@Injectable()
export class KormarcTagsService {
  constructor(private prisma: PrismaService) {}

  // 목록 조회. 이 도서관에 태그가 하나도 없으면, 기본 58개를 한 번만 자동으로 채워 넣습니다.
  async list(libraryId: number) {
    const count = await this.prisma.kormarcTag.count({ where: { libraryId } });
    if (count === 0) {
      await this.prisma.kormarcTag.createMany({
        data: DEFAULT_KORMARC_TAGS.map((t) => ({ ...t, libraryId })),
      });
    }
    return this.prisma.kormarcTag.findMany({
      where: { libraryId },
      orderBy: { tag: 'asc' },
    });
  }

  async create(libraryId: number, data: any) {
    if (!data.tag || !String(data.tag).trim()) {
      throw new BadRequestException('태그는 필수입니다.');
    }
    try {
      return await this.prisma.kormarcTag.create({
        data: {
          libraryId,
          tag: String(data.tag).trim(),
          fieldName: data.fieldName || '',
          indicators: data.indicators || undefined,
          subfieldCodes: data.subfieldCodes || undefined,
          example: data.example || undefined,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 등록된 태그입니다.');
      }
      throw e;
    }
  }

  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.kormarcTag.findFirst({
      where: { id, libraryId },
    });
    if (!existing) {
      throw new NotFoundException('태그를 찾을 수 없습니다.');
    }
    return this.prisma.kormarcTag.update({
      where: { id },
      data: {
        tag: data.tag,
        fieldName: data.fieldName,
        indicators: data.indicators || undefined,
        subfieldCodes: data.subfieldCodes || undefined,
        example: data.example || undefined,
      },
    });
  }
}