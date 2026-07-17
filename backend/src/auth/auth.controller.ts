import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /auth/login : 로그인
  @Post('login')
  login(@Body() body: { loginId: string; password: string }) {
    return this.authService.login(body);
  }
}