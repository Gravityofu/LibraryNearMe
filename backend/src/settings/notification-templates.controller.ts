import { Controller, Get, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationTemplatesService } from './notification-templates.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('notification-templates')
export class NotificationTemplatesController {
  constructor(private notificationTemplatesService: NotificationTemplatesService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any) {
    return this.notificationTemplatesService.list(req.user.libraryId);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.notificationTemplatesService.update(req.user.libraryId, parseInt(id, 10), body);
  }
}