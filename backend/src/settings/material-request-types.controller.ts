import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { MaterialRequestTypesService } from './material-request-types.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('material-request-types')
export class MaterialRequestTypesController {
  constructor(private materialRequestTypesService: MaterialRequestTypesService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any) {
    return this.materialRequestTypesService.list(req.user.libraryId);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.materialRequestTypesService.create(req.user.libraryId, body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.materialRequestTypesService.update(req.user.libraryId, parseInt(id, 10), body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.materialRequestTypesService.remove(req.user.libraryId, parseInt(id, 10));
  }
}