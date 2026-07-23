import { Body, Controller, Post, Req, Query, Get, Param, UseGuards } from '@nestjs/common';
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

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any, @Query('search') search?: string) {
    return this.materialsService.searchMaterials(req.user.libraryId, search);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.materialsService.getMaterialWithCopies(req.user.libraryId, parseInt(id, 10));
  }

  @Post(':id/copies')
  @UseGuards(AdminGuard)
  addCopy(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.materialsService.addCopy(req.user.sub, req.user.libraryId, parseInt(id, 10), body);
  }

}