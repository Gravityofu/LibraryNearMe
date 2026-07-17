import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(data: { loginId: string; password: string }) {
    // 1. 어느 도서관인지 (지금은 첫 번째 도서관)
    const library = await this.prisma.library.findFirst();

    // 2. 아이디로 회원 찾기
    const user = library
      ? await this.prisma.user.findFirst({
          where: { libraryId: library.id, loginId: data.loginId },
        })
      : null;

    // 회원이 없거나 비밀번호가 없으면 로그인 실패
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 3. 입력한 비밀번호가 저장된 암호와 맞는지 확인
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 4. 맞으면 "출입증(토큰)" 발급 (누구인지·역할·소속도서관을 담아 서명)
    const token = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      libraryId: user.libraryId,
    });

    // 5. 토큰과 기본 정보를 돌려줍니다.
    return {
      token,
      user: { id: user.id, name: user.name, role: user.role },
    };
  }
}