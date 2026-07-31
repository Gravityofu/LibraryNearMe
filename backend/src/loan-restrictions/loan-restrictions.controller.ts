import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { LoanRestrictionsService } from './loan-restrictions.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('loan-restrictions')
export class LoanRestrictionsController {
  constructor(private loanRestrictionsService: LoanRestrictionsService) {}

  // 특정 회원의 대출제한 이력 전체를 돌려줍니다. (최신순)
  @Get(':userId')
  @UseGuards(AdminGuard)
  findHistory(@Req() req: any, @Param('userId') userId: string) {
    return this.loanRestrictionsService.findHistory(req.user.libraryId, parseInt(userId, 10));
  }
}