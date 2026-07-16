import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  // 첫 번째 도서관 설정을 통째로 가져옵니다.
  getLibrary() {
    return this.prisma.library.findFirst();
  }
}