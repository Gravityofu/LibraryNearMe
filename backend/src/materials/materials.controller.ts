import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('materials')
export class MaterialsController {
  constructor(private materialsService: MaterialsService) {}

  @UseGuards(AdminGuard)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    const userId: number = req.user.sub;       // 토큰에 담긴 사서 id
    const libraryId: number = req.user.libraryId;
    return this.materialsService.createBibliographic(userId, libraryId, body);
  }
}