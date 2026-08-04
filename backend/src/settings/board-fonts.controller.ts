import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { BoardFontsService } from './board-fonts.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('board-fonts')
export class BoardFontsController {
  constructor(private boardFontsService: BoardFontsService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any) {
    return this.boardFontsService.list(req.user.libraryId);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.boardFontsService.create(req.user.libraryId, body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.boardFontsService.update(req.user.libraryId, parseInt(id, 10), body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.boardFontsService.remove(req.user.libraryId, parseInt(id, 10));
  }
}