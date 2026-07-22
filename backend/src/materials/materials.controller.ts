import { Body, Controller, Post, Req, Query, Get, UseGuards } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('materials')
export class MaterialsController {
  constructor(private materialsService: MaterialsService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    const userId: number = req.user.sub;       // 토큰에 담긴 사서 id
    const libraryId: number = req.user.libraryId;
    return this.materialsService.createBibliographic(userId, libraryId, body);
  }

  @Get('kolis-search')
  @UseGuards(AdminGuard)
  kolisSearch(@Query('keyword') keyword: string, @Query('page') page?: string) {
    return this.materialsService.searchKolisNet(keyword, page ? parseInt(page, 10) : 1);
  }

  @Get('kolis-marc')
  @UseGuards(AdminGuard)
  kolisMarc(@Query('recKey') recKey: string) {
    return this.materialsService.importKolisMarc(recKey);
  }

}