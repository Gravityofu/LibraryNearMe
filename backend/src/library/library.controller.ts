import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { LibraryService } from './library.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('library')
export class LibraryController {
  constructor(private libraryService: LibraryService) {}

  // 가져오기: 누구나 가능 (홈페이지 표시용)
  @Get()
  getLibrary() {
    return this.libraryService.getLibrary();
  }

  // 바꾸기: 문지기 통과(관리자 로그인)해야만 가능
  @UseGuards(AdminGuard)
  @Patch()
  updateLibrary(@Body() body: { name: string; primaryColor: string }) {
    return this.libraryService.updateLibrary(body);
  }
}