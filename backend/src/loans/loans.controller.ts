import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
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

  // GET 요청: 회원의 현재 대출 중인 자료 목록 — 관리자만
  @Get('members/:id/active')
  @UseGuards(AdminGuard)
  listActiveLoans(@Req() req: any, @Param('id') id: string) {
    return this.loansService.listActiveLoans(req.user.libraryId, parseInt(id, 10));
  }
}