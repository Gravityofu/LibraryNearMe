import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { LoanRestrictionsService } from './loan-restrictions.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('loan-restrictions')
export class LoanRestrictionsController {
  constructor(private loanRestrictionsService: LoanRestrictionsService) {}

  // 특정 회원의 새 정지(대출제한) 기록을 등록합니다.
  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: { userId: number; endDate: string; reason?: string }) {
    return this.loanRestrictionsService.createRestriction(
      req.user.libraryId,
      body.userId,
      new Date(body.endDate),
      body.reason,
    );
  }

  // 특정 회원의 대출제한 이력 전체를 돌려줍니다. (최신순)
  @Get(':userId')
  @UseGuards(AdminGuard)
  findHistory(@Req() req: any, @Param('userId') userId: string) {
    return this.loanRestrictionsService.findHistory(req.user.libraryId, parseInt(userId, 10));
  }

  // 정지(대출제한) 기록 하나를 수정합니다.
  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: { endDate: string; reason?: string }) {
    return this.loanRestrictionsService.updateRestriction(
      req.user.libraryId,
      parseInt(id, 10),
      new Date(body.endDate),
      body.reason,
    );
  }

  // 정지(대출제한) 기록 하나를 삭제합니다.
  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.loanRestrictionsService.removeRestriction(req.user.libraryId, parseInt(id, 10));
  }
}