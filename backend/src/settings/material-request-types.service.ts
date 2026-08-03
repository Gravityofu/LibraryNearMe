import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// 처음 이 도서관이 '자료를 신청합니다' 게시판을 쓸 때 자동으로 채워지는 기본 5개 항목입니다.
const DEFAULT_MATERIAL_REQUEST_TYPES = ['도서', 'DVD', '잡지', '공구', '기타'];

@Injectable()
export class MaterialRequestTypesService {
  constructor(private prisma: PrismaService) {}

  // 목록 조회. 이 도서관에 항목이 하나도 없으면, 기본 5개를 자동으로 채워 넣습니다.
  async list(libraryId: number) {
    const count = await this.prisma.materialRequestType.count({ where: { libraryId } });
    if (count === 0) {
      await this.prisma.materialRequestType.createMany({
        data: DEFAULT_MATERIAL_REQUEST_TYPES.map((value, i) => ({ libraryId, value, order: i })),
      });
    }
    return this.prisma.materialRequestType.findMany({
      where: { libraryId },
      orderBy: { order: 'asc' },
    });
  }

  async create(libraryId: number, data: any) {
    const value = String(data.value || '').trim();
    if (!value) {
      throw new BadRequestException('항목 이름을 입력하세요.');
    }
    const count = await this.prisma.materialRequestType.count({ where: { libraryId } });
    try {
      return await this.prisma.materialRequestType.create({
        data: { libraryId, value, order: count },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 항목입니다.');
      }
      throw e;
    }
  }

  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.materialRequestType.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('항목을 찾을 수 없습니다.');
    }
    const value = String(data.value || '').trim();
    if (!value) {
      throw new BadRequestException('항목 이름을 입력하세요.');
    }
    try {
      return await this.prisma.materialRequestType.update({ where: { id }, data: { value } });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 있는 항목입니다.');
      }
      throw e;
    }
  }

  // 삭제 - 최소 1개는 남아있어야 하고, 이미 이 항목으로 신청된 글이 있으면 삭제할 수 없습니다.
  async remove(libraryId: number, id: number) {
    const existing = await this.prisma.materialRequestType.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('항목을 찾을 수 없습니다.');
    }
    const siblingCount = await this.prisma.materialRequestType.count({ where: { libraryId } });
    if (siblingCount <= 1) {
      throw new BadRequestException('최소 1개의 항목은 남아있어야 합니다.');
    }
    const usedCount = await this.prisma.materialRequest.count({
      where: { requestType: existing.value, post: { libraryId } },
    });
    if (usedCount > 0) {
      throw new BadRequestException(`이 항목으로 신청된 글이 ${usedCount}건 있어 삭제할 수 없습니다.`);
    }
    await this.prisma.materialRequestType.delete({ where: { id } });
    return { success: true };
  }
}