import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { LoansService } from './loans.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('loans')
export class LoansController {
  constructor(private loansService: LoansService) {}

  // GET 요청: 회원 검색 — 관리자만
  @Get('members')
  @UseGuards(AdminGuard)
  findMembers(@Req() req: any, @Query('keyword') keyword: string) {
    return this.loansService.findMembers(req.user.libraryId, keyword);
  }

  // POST 요청: 대출 처리 — 관리자만
  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: { userId: number; registrationNo: string }) {
    return this.loansService.createLoan(req.user.libraryId, body.userId, body.registrationNo);
  }
}