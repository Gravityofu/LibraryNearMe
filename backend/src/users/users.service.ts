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
    if (!data.loginId || !data.password || !data.name || !data.phone) {
      throw new BadRequestException(
        '아이디, 비밀번호, 이름, 휴대폰 번호는 필수입니다.',
      );
    }

    const library = await this.prisma.library.findFirst();
    if (!library) {
      throw new BadRequestException('도서관 설정이 없습니다.');
    }

    const existing = await this.prisma.user.findFirst({
      where: { libraryId: library.id, loginId: data.loginId },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const cardToken = randomUUID();

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

    return { message: '회원가입이 완료되었습니다.' };
  }

  // 회원(+관리자) 목록 조회 (검색 + 페이지네이션). 슈퍼 계정(SUPER)은 항상 제외.
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

    const where: any = { libraryId, role: { in: [Role.MEMBER, Role.ADMIN] } };
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
          role: true,
          status: true,
          createdAt: true,
          // passwordHash는 절대 내보내지 않습니다.
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // 관리자가 회원 또는 관리자 계정을 직접 등록
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
      role?: string;
    },
  ) {
    if (!data.loginId || !data.password || !data.name) {
      throw new BadRequestException('아이디, 비밀번호, 이름은 필수입니다.');
    }

    // role은 MEMBER 또는 ADMIN만 허용. 그 외 값(SUPER 포함)은 막습니다.
    const role =
      data.role === 'ADMIN' ? Role.ADMIN : Role.MEMBER;

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
          role,
          cardToken,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('이미 사용 중인 회원번호입니다.');
      }
      throw e;
    }

    return { message: '등록되었습니다.' };
  }

  // 회원/관리자 정보 수정 (이름/연락처/상태/역할/비밀번호 등). 아이디는 여기서 안 바꿉니다.
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
      role?: string;
      password?: string;
    },
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { id, libraryId, role: { in: [Role.MEMBER, Role.ADMIN] } },
    });
    if (!existing) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    const updateData: any = {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      memberNo: data.memberNo || undefined,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      address: data.address || undefined,
      status: data.status ? (data.status as UserStatus) : undefined,
    };

    // 역할은 MEMBER ↔ ADMIN 사이에서만 바꿀 수 있습니다. (SUPER로는 여기서 못 바꿉니다.)
    if (data.role === 'ADMIN' || data.role === 'MEMBER') {
      updateData.role = data.role as Role;
    }

    // 비밀번호는 값을 입력했을 때만 바꿉니다. 관리자도 기존 비밀번호를 알 수 없고,
    // 오직 "새 비밀번호로 덮어쓰기"만 할 수 있습니다(암호화되어 저장되므로 원래 값은 아무도 못 봅니다).
    if (data.password && data.password.trim()) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, role: true, status: true },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('이미 사용 중인 회원번호입니다.');
      }
      throw e;
    }
  }

}