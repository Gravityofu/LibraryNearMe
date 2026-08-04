import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// frontend/src/lib/fonts.ts의 Pretendard 항목과 반드시 같은 이름으로 맞춰야 합니다.
const PRETENDARD_FONT_FAMILY_NAME = 'Pretendard Variable';

@Injectable()
export class BoardFontsService {
  constructor(private prisma: PrismaService) {}

  // 목록 조회. 이 도서관에 폰트가 하나도 없으면, 삭제할 수 없는 기본 글꼴(Pretendard)을 자동으로 만들어 넣습니다.
  async list(libraryId: number) {
    const count = await this.prisma.boardFont.count({ where: { libraryId } });
    if (count === 0) {
      await this.prisma.boardFont.create({
        data: {
          libraryId,
          name: 'Pretendard (기본)',
          fontFamilyName: PRETENDARD_FONT_FAMILY_NAME,
          googleFontUrl: null,
          isDeletable: false,
          order: 0,
        },
      });
    }
    return this.prisma.boardFont.findMany({ where: { libraryId }, orderBy: { order: 'asc' } });
  }

  async create(libraryId: number, data: any) {
    const name = String(data.name || '').trim();
    const fontFamilyName = String(data.fontFamilyName || '').trim();
    const googleFontUrl = data.googleFontUrl ? String(data.googleFontUrl).trim() : null;
    if (!name || !fontFamilyName) {
      throw new BadRequestException('표시 이름과 CSS 폰트 이름을 입력하세요.');
    }
    const count = await this.prisma.boardFont.count({ where: { libraryId } });
    try {
      return await this.prisma.boardFont.create({
        data: { libraryId, name, fontFamilyName, googleFontUrl, order: count },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 등록된 CSS 폰트 이름입니다.');
      }
      throw e;
    }
  }

  // 기본 글꼴(Pretendard)은 수정할 수 없습니다.
  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.boardFont.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('폰트를 찾을 수 없습니다.');
    }
    if (!existing.isDeletable) {
      throw new BadRequestException('기본 글꼴(Pretendard)은 수정할 수 없습니다.');
    }
    const name = data.name !== undefined ? String(data.name).trim() : existing.name;
    const fontFamilyName =
      data.fontFamilyName !== undefined ? String(data.fontFamilyName).trim() : existing.fontFamilyName;
    const googleFontUrl =
      data.googleFontUrl !== undefined
        ? data.googleFontUrl
          ? String(data.googleFontUrl).trim()
          : null
        : existing.googleFontUrl;
    if (!name || !fontFamilyName) {
      throw new BadRequestException('표시 이름과 CSS 폰트 이름을 입력하세요.');
    }
    try {
      return await this.prisma.boardFont.update({ where: { id }, data: { name, fontFamilyName, googleFontUrl } });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 등록된 CSS 폰트 이름입니다.');
      }
      throw e;
    }
  }

  // 기본 글꼴(Pretendard)은 삭제할 수 없습니다. 다른 폰트는 삭제해도 됩니다.
  // (이미 이 폰트로 쓰인 글이 있어도 삭제할 수 있습니다 - 그 글은 이후 자동으로 Pretendard로 보이게 됩니다.)
  async remove(libraryId: number, id: number) {
    const existing = await this.prisma.boardFont.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('폰트를 찾을 수 없습니다.');
    }
    if (!existing.isDeletable) {
      throw new BadRequestException('기본 글꼴(Pretendard)은 삭제할 수 없습니다.');
    }
    await this.prisma.boardFont.delete({ where: { id } });
    return { success: true };
  }
}