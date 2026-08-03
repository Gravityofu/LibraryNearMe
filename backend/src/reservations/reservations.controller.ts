import { Body, Controller, Get, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  // GET 요청: 회원 한 명 기준으로 예약 가능한 복본 검색 — 관리자만
  @Get('search-copies')
  @UseGuards(AdminGuard)
  searchReservableCopies(@Req() req: any, @Query('userId') userId: string, @Query('keyword') keyword: string) {
    return this.reservationsService.searchReservableCopies(req.user.libraryId, parseInt(userId, 10), keyword);
  }

  // GET 요청: 회원 한 명의 현재 예약 목록 — 관리자만
  @Get('members/:userId')
  @UseGuards(AdminGuard)
  listByMember(@Req() req: any, @Param('userId') userId: string) {
    return this.reservationsService.listByMember(req.user.libraryId, parseInt(userId, 10));
  }

  // POST 요청: 예약 생성 — 관리자만
  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: { userId: number; copyId: number }) {
    return this.reservationsService.createReservation(req.user.libraryId, body.userId, body.copyId);
  }

  // POST 요청: 예약 취소 — 관리자만
  @Post(':id/cancel')
  @UseGuards(AdminGuard)
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.cancelReservation(req.user.libraryId, parseInt(id, 10));
  }
}