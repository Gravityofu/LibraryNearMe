import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// 가입 화면에서 넘어오는 정보의 모양
type SignupData = {
  loginId: string;
  password: string;
  name: string;
  phone: string;
  email?: string;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async signup(data: SignupData) {
    // 1. 필수 값이 다 들어왔는지 확인
    if (!data.loginId || !data.password || !data.name || !data.phone) {
      throw new BadRequestException(
        '아이디, 비밀번호, 이름, 휴대폰 번호는 필수입니다.',
      );
    }

    // 2. 어느 도서관 소속인지 (지금은 첫 번째 도서관. 나중에 도메인으로 판별)
    const library = await this.prisma.library.findFirst();
    if (!library) {
      throw new BadRequestException('도서관 설정이 없습니다.');
    }

    // 3. 같은 도서관에 같은 아이디가 이미 있는지 확인
    const existing = await this.prisma.user.findFirst({
      where: { libraryId: library.id, loginId: data.loginId },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    // 4. 비밀번호 암호화 (되돌릴 수 없게 뒤섞기)
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 5. 회원증 보안 코드 자동 생성 (무작위 고유값, 나중에 QR용)
    const cardToken = randomUUID();

    // 6. 회원을 표에 저장 (역할=MEMBER, 상태=ACTIVE는 자동 기본값)
    await this.prisma.user.create({
      data: {
        libraryId: library.id,
        loginId: data.loginId,
        passwordHash,
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        cardToken,
      },
    });

    // 7. 비밀번호는 빼고 안전한 정보만 돌려줍니다.
    return { message: '회원가입이 완료되었습니다.' };
  }
}