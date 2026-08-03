import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AdminGuard } from '../auth/admin.guard';

// 업로드를 허용할 사진 형식입니다.
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
// 사진 하나당 최대 크기 (5MB)입니다.
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  // 게시판 글쓰기(리치 텍스트 에디터)에서 사진을 삽입할 때 쓰는 업로드 기능입니다.
  // 지금은 관리자만 글을 쓸 수 있으므로 관리자만 쓸 수 있게 막아두었습니다.
  // (나중에 회원도 글을 쓰는 게시판이 실제로 열리면, 이 부분을 회원도 통과할 수 있도록 손봐야 합니다.)
  @Post('board-image')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/boards',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadBoardImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('사진 파일(png, jpg, gif, webp)만 올릴 수 있습니다.');
    }
    // 브라우저에서 바로 접근할 수 있는 주소를 돌려줍니다.
    return { url: `/uploads/boards/${file.filename}` };
  }
}