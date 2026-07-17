import { Controller, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // POST 요청: 새 회원 만들기(가입)
  @Post()
  signup(
    @Body()
    body: {
      loginId: string;
      password: string;
      name: string;
      phone: string;
      email?: string;
    },
  ) {
    return this.usersService.signup(body);
  }
}