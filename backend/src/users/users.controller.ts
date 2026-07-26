import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // POST 요청: 새 회원 만들기(가입) — 누구나 접근 가능(홈페이지 회원가입)
  @Post()
  signup(
    @Body()
    body: {
      loginId: string;
      password: string;
      name: string;
      phone: string;
      email?: string;
      birthDate?: string;
      address?: string;
    },
  ) {
    return this.usersService.signup(body);
  }

  // GET 요청: 홈페이지 회원가입에서 쓰는 공개용 다음 회원번호 — 누구나 접근 가능
  @Get('next-member-no-public')
  getNextMemberNoPublic() {
    return this.usersService.getNextMemberNoPublic();
  }

  // POST 요청: 이름+휴대폰 번호로 아이디 찾기 — 누구나 접근 가능(로그인 전)
  @Post('find-id')
  findLoginId(@Body() body: { name: string; phone: string }) {
    return this.usersService.findLoginId(body.name, body.phone);
  }

  // GET 요청: 다음 회원번호 미리 계산해서 알려주기 — 관리자만
  @Get('next-member-no')
  @UseGuards(AdminGuard)
  getNextMemberNo(@Req() req: any) {
    return this.usersService.getNextMemberNo(req.user.libraryId);
  }

  // GET 요청: 회원/관리자 목록 조회(검색 포함) — 관리자만
  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any, @Query() query: any) {
    return this.usersService.list(req.user.libraryId, {
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
      name: query.name,
      phone: query.phone,
      loginId: query.loginId,
      memberNo: query.memberNo,
      status: query.status,
    });
  }

  // POST 요청: 관리자가 회원/관리자 계정 직접 등록 — 관리자만
  @Post('admin')
  @UseGuards(AdminGuard)
  adminCreate(@Req() req: any, @Body() body: any) {
    return this.usersService.adminCreate(req.user.libraryId, body);
  }

  // PATCH 요청: 회원/관리자 정보 수정(상태 변경 포함) — 관리자만
  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.usersService.update(req.user.libraryId, parseInt(id, 10), body);
  }
}