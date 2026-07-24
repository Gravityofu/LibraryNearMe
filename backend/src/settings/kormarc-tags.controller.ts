import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { KormarcTagsService } from './kormarc-tags.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('settings/kormarc-tags')
export class KormarcTagsController {
  constructor(private kormarcTagsService: KormarcTagsService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any) {
    return this.kormarcTagsService.list(req.user.libraryId);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.kormarcTagsService.create(req.user.libraryId, body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.kormarcTagsService.update(req.user.libraryId, parseInt(id, 10), body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.kormarcTagsService.remove(req.user.libraryId, parseInt(id, 10));
  }
  
}