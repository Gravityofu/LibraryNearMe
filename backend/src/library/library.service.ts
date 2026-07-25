import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  // 도서관 설정 가져오기
  getLibrary() {
    return this.prisma.library.findFirst();
  }

  // 도서관 설정 바꿔서 저장하기
  async updateLibrary(data: {
    name: string;
    primaryColor: string;
    logoUrl?: string;
    chromeBgColor?: string;
    chromeTextColor?: string;
    footerVersion?: string;
    footerCopyright?: string;
  }) {
    const library = await this.prisma.library.findFirst();
    if (!library) return null;

    return this.prisma.library.update({
      where: { id: library.id },
      data: {
        name: data.name,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl || undefined,
        chromeBgColor: data.chromeBgColor || undefined,
        chromeTextColor: data.chromeTextColor || undefined,
        footerVersion: data.footerVersion || undefined,
        footerCopyright: data.footerCopyright || undefined,
      },
    });
  }
}