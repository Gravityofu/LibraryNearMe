import { Controller, Get, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('boards')
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any) {
    return this.boardsService.list(req.user.libraryId);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.boardsService.update(req.user.libraryId, parseInt(id, 10), body);
  }
}