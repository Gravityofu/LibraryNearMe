import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LoanSettingsService {
  constructor(private prisma: PrismaService) {}

  // 회원구분별 기본 대출 설정 목록. 아직 설정이 없는 회원구분이 있으면 기본값으로 자동 생성합니다.
  async listMemberSettings(libraryId: number) {
    const memberTypes = await this.prisma.memberType.findMany({
      where: { libraryId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const results: any[] = [];
    for (const mt of memberTypes) {
      let setting = await this.prisma.loanSetting.findFirst({
        where: { libraryId, memberTypeId: mt.id },
      });
      if (!setting) {
        setting = await this.prisma.loanSetting.create({
          data: { libraryId, memberTypeId: mt.id },
        });
      }
      results.push({ ...setting, memberTypeName: mt.name });
    }
    return results;
  }

  // 회원구분별 기본 대출 설정 수정
  async updateMemberSetting(libraryId: number, memberTypeId: number, data: any) {
    const memberType = await this.prisma.memberType.findFirst({ where: { id: memberTypeId, libraryId } });
    if (!memberType) {
      throw new NotFoundException('회원 구분을 찾을 수 없습니다.');
    }

    const maxLoanCount = Number(data.maxLoanCount);
    const maxReservationCount = Number(data.maxReservationCount);
    const reservationHoldDays = Number(data.reservationHoldDays);

    if (!Number.isFinite(maxLoanCount) || maxLoanCount < 0) {
      throw new BadRequestException('최대 대출 권수를 올바르게 입력하세요.');
    }
    if (!Number.isFinite(maxReservationCount) || maxReservationCount < 0) {
      throw new BadRequestException('최대 예약 권수를 올바르게 입력하세요.');
    }
    if (!Number.isFinite(reservationHoldDays) || reservationHoldDays < 0) {
      throw new BadRequestException('예약자료 보관일을 올바르게 입력하세요.');
    }

    // 최대 대출 제한 일수는 비워두면 "상한 없음"(연체한 일수만큼 그대로 적용)을 뜻합니다.
    let maxSuspensionDays: number | null = null;
    if (data.maxSuspensionDays !== '' && data.maxSuspensionDays !== null && data.maxSuspensionDays !== undefined) {
      const n = Number(data.maxSuspensionDays);
      if (!Number.isFinite(n) || n < 0) {
        throw new BadRequestException('최대 대출 제한 일수를 올바르게 입력하세요.');
      }
      maxSuspensionDays = n;
    }

    // 실물 자료별로 정한 대출/예약 가능 권수의 합계보다 작게 설정할 수 없습니다.
    const physicalTypes = await this.prisma.materialType.findMany({
      where: { libraryId, category: 'PHYSICAL' },
      select: { maxLoanCount: true, maxReservationCount: true },
    });
    const totalLoanCount = physicalTypes.reduce((sum, m) => sum + (m.maxLoanCount || 0), 0);
    const totalReservationCount = physicalTypes.reduce((sum, m) => sum + (m.maxReservationCount || 0), 0);

    if (maxLoanCount < totalLoanCount) {
      throw new BadRequestException(
        `실물 자료별 대출 가능 권수의 합(${totalLoanCount}권)보다 최대 대출 권수를 작게 설정할 수 없습니다.`,
      );
    }
    if (maxReservationCount < totalReservationCount) {
      throw new BadRequestException(
        `실물 자료별 예약 가능 권수의 합(${totalReservationCount}권)보다 최대 예약 권수를 작게 설정할 수 없습니다.`,
      );
    }

    const existing = await this.prisma.loanSetting.findFirst({ where: { libraryId, memberTypeId } });

    const setting = existing
      ? await this.prisma.loanSetting.update({
          where: { id: existing.id },
          data: { maxLoanCount, maxReservationCount, maxSuspensionDays, reservationHoldDays },
        })
      : await this.prisma.loanSetting.create({
          data: { libraryId, memberTypeId, maxLoanCount, maxReservationCount, maxSuspensionDays, reservationHoldDays },
        });

    return { ...setting, memberTypeName: memberType.name };
  }
}