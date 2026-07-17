import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. 요청 헤더에서 손목밴드(토큰) 꺼내기 ("Bearer xxxxx" 모양)
    const authHeader = request.headers['authorization'];
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    // 2. 손목밴드가 진짜인지(위조 안 됐는지) 확인
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('로그인 정보가 유효하지 않습니다.');
    }

    // 3. 관리자(ADMIN) 또는 슈퍼(SUPER)만 통과
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPER') {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }

    // 세 관문 통과!
    request.user = payload;
    return true;
  }
}