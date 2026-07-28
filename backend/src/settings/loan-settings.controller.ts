import { Controller, Get, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { LoanSettingsService } from './loan-settings.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('loan-settings')
export class LoanSettingsController {
  constructor(private loanSettingsService: LoanSettingsService) {}

  @Get('member-types')
  @UseGuards(AdminGuard)
  listMemberSettings(@Req() req: any) {
    return this.loanSettingsService.listMemberSettings(req.user.libraryId);
  }

  @Patch('member-types/:memberTypeId')
  @UseGuards(AdminGuard)
  updateMemberSetting(@Req() req: any, @Param('memberTypeId') memberTypeId: string, @Body() body: any) {
    return this.loanSettingsService.updateMemberSetting(req.user.libraryId, parseInt(memberTypeId, 10), body);
  }
}