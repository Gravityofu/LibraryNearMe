import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../auth/admin.guard';
import { UploadsService } from './uploads.service';

// 업로드를 허용할 사진 형식입니다.
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
// 사진 하나당 최대 크기 (5MB)입니다.
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  // 관리자 게시판 글쓰기(리치 텍스트 에디터), 설정 화면의 기본 썸네일 등록에서 쓰는 업로드 기능입니다.
  // 관리자만 쓸 수 있게 막아두었습니다.
  @Post('board-image')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadBoardImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('사진 파일(png, jpg, gif, webp)만 올릴 수 있습니다.');
    }
    const url = await this.uploadsService.uploadBoardImage(file);
    return { url };
  }

  // 홈페이지(회원/비회원)에서 글을 쓸 때, 리치 텍스트 에디터에서 사진을 삽입할 때 쓰는 업로드 기능입니다.
  // 비회원도 글을 쓸 수 있어야 하므로 로그인 여부와 상관없이 누구나 쓸 수 있게 열어뒀습니다.
  // (사진 형식·크기 제한은 위 board-image와 똑같이 걸려 있어서, 안전하게 씁니다.)
  @Post('public-board-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadPublicBoardImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('사진 파일(png, jpg, gif, webp)만 올릴 수 있습니다.');
    }
    const url = await this.uploadsService.uploadBoardImage(file);
    return { url };
  }
}