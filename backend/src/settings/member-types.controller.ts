import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { MemberTypesService } from './member-types.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('member-types')
export class MemberTypesController {
  constructor(private memberTypesService: MemberTypesService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any) {
    return this.memberTypesService.list(req.user.libraryId);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.memberTypesService.create(req.user.libraryId, body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.memberTypesService.update(req.user.libraryId, parseInt(id, 10), body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.memberTypesService.remove(req.user.libraryId, parseInt(id, 10));
  }
}