import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PostsService } from '../posts/posts.service';

// 로그인 없이 누구나 볼 수 있는 글 상세 API입니다. 볼 때마다 조회수가 1 올라갑니다.
@Controller('public/posts')
export class PublicPostsController {
  constructor(
    private prisma: PrismaService,
    private postsService: PostsService,
  ) {}

  private async getLibraryId() {
    const library = await this.prisma.library.findFirst();
    if (!library) {
      throw new NotFoundException('도서관 정보를 찾을 수 없습니다.');
    }
    return library.id;
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    const libraryId = await this.getLibraryId();
    return this.postsService.findOnePublic(libraryId, parseInt(id, 10));
  }
}