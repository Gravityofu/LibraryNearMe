import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  // 도서관 설정 가져오기 (기존 기능)
  getLibrary() {
    return this.prisma.library.findFirst();
  }

  // 도서관 설정 바꿔서 저장하기 (오늘 추가)
  async updateLibrary(data: { name: string; primaryColor: string }) {
    // 먼저 우리 도서관을 찾고,
    const library = await this.prisma.library.findFirst();
    if (!library) return null;

    // 그 도서관의 이름과 색상을 새 값으로 바꿔 저장합니다.
    return this.prisma.library.update({
      where: { id: library.id },
      data: {
        name: data.name,
        primaryColor: data.primaryColor,
      },
    });
  }
}