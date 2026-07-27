import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CopyOptionsService } from './copy-options.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('copy-options')
export class CopyOptionsController {
  constructor(private copyOptionsService: CopyOptionsService) {}

  @Get()
  @UseGuards(AdminGuard)
  listAll(@Req() req: any) {
    return this.copyOptionsService.listAll(req.user.libraryId);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.copyOptionsService.create(req.user.libraryId, body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.copyOptionsService.update(req.user.libraryId, parseInt(id, 10), body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.copyOptionsService.remove(req.user.libraryId, parseInt(id, 10));
  }
}