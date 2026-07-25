import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Role, UserStatus } from '@prisma/client';

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

  // 회원 목록 조회 (검색 + 페이지네이션). role=MEMBER인 이용자만 대상.
  async list(
    libraryId: number,
    params: {
      page?: number;
      pageSize?: number;
      name?: string;
      phone?: string;
      loginId?: string;
      memberNo?: string;
      status?: string;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10;

    const where: any = { libraryId, role: Role.MEMBER };
    if (params.name) where.name = { contains: params.name, mode: 'insensitive' };
    if (params.phone) where.phone = { contains: params.phone };
    if (params.loginId) where.loginId = { contains: params.loginId, mode: 'insensitive' };
    if (params.memberNo) where.memberNo = { contains: params.memberNo, mode: 'insensitive' };
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          loginId: true,
          name: true,
          phone: true,
          email: true,
          memberNo: true,
          birthDate: true,
          address: true,
          status: true,
          createdAt: true,
          // passwordHash는 절대 내보내지 않습니다.
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // 관리자가 새 회원을 직접 등록
  async adminCreate(
    libraryId: number,
    data: {
      loginId: string;
      password: string;
      name: string;
      phone?: string;
      email?: string;
      memberNo?: string;
      birthDate?: string;
      address?: string;
    },
  ) {
    if (!data.loginId || !data.password || !data.name) {
      throw new BadRequestException('아이디, 비밀번호, 이름은 필수입니다.');
    }

    const existing = await this.prisma.user.findFirst({
      where: { libraryId, loginId: data.loginId },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const cardToken = randomUUID();

    try {
      await this.prisma.user.create({
        data: {
          libraryId,
          loginId: data.loginId,
          passwordHash,
          name: data.name,
          phone: data.phone || undefined,
          email: data.email || undefined,
          memberNo: data.memberNo || undefined,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          address: data.address || undefined,
          cardToken,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('이미 사용 중인 회원번호입니다.');
      }
      throw e;
    }

    return { message: '회원이 등록되었습니다.' };
  }

  // 회원 정보 수정 (이름/연락처/상태 등). 아이디·비밀번호·역할은 여기서 안 바꿉니다.
  async update(
    libraryId: number,
    id: number,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      memberNo?: string;
      birthDate?: string;
      address?: string;
      status?: string;
    },
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { id, libraryId, role: Role.MEMBER },
    });
    if (!existing) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          memberNo: data.memberNo || undefined,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          address: data.address || undefined,
          status: data.status ? (data.status as UserStatus) : undefined,
        },
        select: { id: true, name: true, status: true },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('이미 사용 중인 회원번호입니다.');
      }
      throw e;
    }
  }
}