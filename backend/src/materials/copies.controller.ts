import { Controller, Get, Patch, Query, Param, Body, Req, UseGuards } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('copies')
export class CopiesController {
  constructor(private materialsService: MaterialsService) {}

  @Get('latest')
  @UseGuards(AdminGuard)
  latest(@Req() req: any) {
    return this.materialsService.getLatestRegistrationNo(req.user.libraryId);
  }

  @Get()
  @UseGuards(AdminGuard)
  list(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
    @Query('title') title?: string,
    @Query('creator') creator?: string,
    @Query('subject') subject?: string,
    @Query('registrationNos') registrationNos?: string,
  ) {
    return this.materialsService.listCopies(req.user.libraryId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      type,
      title,
      creator,
      subject,
      registrationNos: registrationNos
        ? registrationNos.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    });
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.materialsService.updateCopy(req.user.libraryId, parseInt(id, 10), body);
  }
}