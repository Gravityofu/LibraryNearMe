import { Controller, Get, Patch, Body } from '@nestjs/common';
import { LibraryService } from './library.service';

@Controller('library')
export class LibraryController {
  constructor(private libraryService: LibraryService) {}

  // GET 요청: 설정 가져오기 (기존)
  @Get()
  getLibrary() {
    return this.libraryService.getLibrary();
  }

  // PATCH 요청: 설정 바꾸기 (오늘 추가)
  // 화면에서 보낸 이름·색상이 body 안에 담겨 옵니다.
  @Patch()
  updateLibrary(@Body() body: { name: string; primaryColor: string }) {
    return this.libraryService.updateLibrary(body);
  }
}