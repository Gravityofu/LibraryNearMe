import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { MaterialTypesService } from './material-types.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('material-types')
export class MaterialTypesController {
  constructor(private materialTypesService: MaterialTypesService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any) {
    return this.materialTypesService.list(req.user.libraryId);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.materialTypesService.create(req.user.libraryId, body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.materialTypesService.update(req.user.libraryId, parseInt(id, 10), body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.materialTypesService.remove(req.user.libraryId, parseInt(id, 10));
  }

  @Post(':id/kdc-rules')
  @UseGuards(AdminGuard)
  createKdcRule(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.materialTypesService.createKdcRule(req.user.libraryId, parseInt(id, 10), body);
  }

  @Patch('kdc-rules/:ruleId')
  @UseGuards(AdminGuard)
  updateKdcRule(@Req() req: any, @Param('ruleId') ruleId: string, @Body() body: any) {
    return this.materialTypesService.updateKdcRule(req.user.libraryId, parseInt(ruleId, 10), body);
  }

  @Delete('kdc-rules/:ruleId')
  @UseGuards(AdminGuard)
  removeKdcRule(@Req() req: any, @Param('ruleId') ruleId: string) {
    return this.materialTypesService.removeKdcRule(req.user.libraryId, parseInt(ruleId, 10));
  }
}