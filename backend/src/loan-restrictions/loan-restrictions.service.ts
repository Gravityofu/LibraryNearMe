import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LoanRestrictionsService {
  private readonly logger = new Logger(LoanRestrictionsService.name);

  constructor(private prisma: PrismaService) {}

  // 대출제한 기록을 새로 만들고, 회원 상태를 '정지'로 바꿉니다.
  // (실제로 이 함수를 호출하는 "반납 처리(연체 계산)" 기능은 다음 단계에서 만듭니다.)
  async createRestriction(libraryId: number, userId: number, endDate: Date, reason?: string) {
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

  // 지금 이 회원에게 아직 끝나지 않은(유효한) 대출제한이 있는지 확인합니다.
  async findActiveRestriction(libraryId: number, userId: number) {
    const now = new Date();
    return this.prisma.loanRestriction.findFirst({
      where: { libraryId, userId, endDate: { gte: now } },
      orderBy: { endDate: 'desc' },
    });
  }

  // 매일 자정에 자동으로 실행됩니다: 대출제한이 끝났는데도 '정지' 상태로 남아있는 회원을 찾아 '활성'으로 되돌립니다.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async releaseExpiredRestrictions() {
    const now = new Date();
    const suspendedUsers = await this.prisma.user.findMany({
      where: { status: 'SUSPENDED' },
      select: { id: true },
    });

    let releasedCount = 0;
    for (const u of suspendedUsers) {
      const stillActive = await this.prisma.loanRestriction.findFirst({
        where: { userId: u.id, endDate: { gte: now } },
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
}