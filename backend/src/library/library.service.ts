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
    name: string; primaryColor: string; logoUrl?: string;
    footerVersion?: string; footerCopyright?: string;
    footerBgColor?: string; footerTextColor?: string;
    sidebarBgColor?: string; sidebarTextColor?: string;
    buttonStyles?: any;
    fontFamily?: string;
  }) {
    const library = await this.prisma.library.findFirst();
    if (!library) return null;
    return this.prisma.library.update({
      where: { id: library.id },
      data: {
        name: data.name, primaryColor: data.primaryColor,
        logoUrl: data.logoUrl || undefined,
        footerVersion: data.footerVersion || undefined,
        footerCopyright: data.footerCopyright || undefined,
        footerBgColor: data.footerBgColor || undefined,
        footerTextColor: data.footerTextColor || undefined,
        sidebarBgColor: data.sidebarBgColor || undefined,
        sidebarTextColor: data.sidebarTextColor || undefined,
        buttonStyles: data.buttonStyles ?? undefined,
        fontFamily: data.fontFamily || undefined,
      },
    });
  }

}