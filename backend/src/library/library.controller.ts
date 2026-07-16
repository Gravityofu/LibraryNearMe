import { Controller, Get } from '@nestjs/common';
import { LibraryService } from './library.service';

// 이 창구의 주소는 /library 입니다.
@Controller('library')
export class LibraryController {
  constructor(private libraryService: LibraryService) {}

  // 누군가 http://localhost:3001/library 로 오면 이 함수가 실행됩니다.
  @Get()
  getLibrary() {
    return this.libraryService.getLibrary();
  }
}