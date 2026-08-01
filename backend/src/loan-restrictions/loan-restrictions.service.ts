import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LoanRestrictionsService {
  private readonly logger = new Logger(LoanRestrictionsService.name);

  constructor(private prisma: PrismaService) {}

  // 대출제한 기록을 새로 만들고, 회원 상태를 '정지'로 바꿉니다.
  // (관리자가 '회원 정보 수정' 모달에서 직접 등록하거나, 나중에 "반납 처리(연체 계산)"
  // 기능에서 자동으로 호출할 수 있습니다.)
  async createRestriction(libraryId: number, userId: number, endDate: Date, reason?: string) {
    if (Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('제한 종료일이 올바르지 않습니다.');
    }

    const member = await this.prisma.user.findFirst({ where: { id: userId, libraryId } });
    if (!member) {
      throw new NotFoundException('해당 회원을 찾을 수 없습니다.');
    }

    const [restriction] = await this.prisma.$transaction([
      this.prisma.loanRestriction.create({
        data: { libraryId, userId, endDate, reason },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      }),
    ]);
    return restriction;
  }

  // 오늘 날짜의 자정(00:00) 시각을 구합니다.
  // "제한 마지막 날"은 그 날짜 하루 전체 동안은 계속 막혀 있어야 하므로, 시:분:초가 섞인
  // "지금 이 순간"이 아니라 "오늘 날짜(자정 기준)"으로 비교해야 정확합니다.
  private todayStart(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  // 지금 이 회원에게 아직 끝나지 않은(유효한) 대출제한이 있는지 확인합니다.
  // "제한 마지막 날"이 오늘이거나 오늘보다 나중이면 아직 제한 중인 것으로 봅니다.
  async findActiveRestriction(libraryId: number, userId: number) {
    const today = this.todayStart();
    return this.prisma.loanRestriction.findFirst({
      where: { libraryId, userId, endDate: { gte: today } },
      orderBy: { endDate: 'desc' },
    });
  }

  // 매일 자정에 자동으로 실행됩니다: 대출제한이 끝났는데도 '정지' 상태로 남아있는 회원을 찾아 '활성'으로 되돌립니다.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async releaseExpiredRestrictions() {
    const today = this.todayStart();
    const suspendedUsers = await this.prisma.user.findMany({
      where: { status: 'SUSPENDED' },
      select: { id: true },
    });

    let releasedCount = 0;
    for (const u of suspendedUsers) {
      const stillActive = await this.prisma.loanRestriction.findFirst({
        where: { userId: u.id, endDate: { gte: today } },
      });
      if (!stillActive) {
        await this.prisma.user.update({ where: { id: u.id }, data: { status: 'ACTIVE' } });
        releasedCount++;
      }
    }

    if (releasedCount > 0) {
      this.logger.log(`대출제한이 끝난 회원 ${releasedCount}명을 '활성' 상태로 되돌렸습니다.`);
    }
  }

  // 이 회원의 대출제한 이력 전체를 최신순으로 돌려줍니다. (지금 진행 중인 것 + 과거 것 모두 포함)
  async findHistory(libraryId: number, userId: number) {
    return this.prisma.loanRestriction.findMany({
      where: { libraryId, userId },
      orderBy: { startDate: 'desc' },
    });
  }

  // 정지 이력 하나를 수정합니다. 수정한 뒤 이 회원의 상태(정지/활성)도 다시 맞춰줍니다.
  async updateRestriction(libraryId: number, id: number, endDate: Date, reason?: string) {
    if (Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('제한 마지막 날이 올바르지 않습니다.');
    }

    const existing = await this.prisma.loanRestriction.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('해당 정지 이력을 찾을 수 없습니다.');
    }

    await this.prisma.loanRestriction.update({ where: { id }, data: { endDate, reason } });
    await this.syncMemberStatus(libraryId, existing.userId);
    return { success: true };
  }

  // 정지 이력 하나를 삭제합니다. 삭제한 뒤 이 회원의 상태(정지/활성)도 다시 맞춰줍니다.
  async removeRestriction(libraryId: number, id: number) {
    const existing = await this.prisma.loanRestriction.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('해당 정지 이력을 찾을 수 없습니다.');
    }

    await this.prisma.loanRestriction.delete({ where: { id } });
    await this.syncMemberStatus(libraryId, existing.userId);
    return { success: true };
  }

  // 이 회원에게 지금 유효한(오늘을 포함한) 정지 이력이 있는지 다시 확인해서,
  // 있으면 '정지'로, 없으면 '활성'으로 회원 상태를 맞춰줍니다.
  // (정지 이력을 수정하거나 삭제하면, 회원이 지금도 정지 상태여야 하는지가 바뀔 수 있기 때문입니다.)
  private async syncMemberStatus(libraryId: number, userId: number) {
    const active = await this.findActiveRestriction(libraryId, userId);
    const member = await this.prisma.user.findFirst({ where: { id: userId, libraryId } });
    if (!member) return;

    if (active && member.status !== 'SUSPENDED') {
      await this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
    } else if (!active && member.status === 'SUSPENDED') {
      await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
    }
  }
}