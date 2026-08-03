import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// 예약한 회원을 위해 복본을 따로 보관 중일 때의 상태값입니다. ('설정 → 목록 → 상태'에 미리 등록되어 있어야 합니다.)
const HOLDING = '예약보관중';
const AVAILABLE = '대출가능';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  // '상태' 옵션 값별로 대출 가능(canLoan)/예약 가능(canReserve) 여부를 한 번에 가져와 Map으로 돌려줍니다.
  private async getStatusFlagMap(
    libraryId: number,
  ): Promise<Map<string, { canLoan: boolean; canReserve: boolean }>> {
    const options = await this.prisma.copyOption.findMany({
      where: { libraryId, category: 'STATUS' },
    });
    const map = new Map<string, { canLoan: boolean; canReserve: boolean }>();
    for (const o of options) {
      map.set(o.value, { canLoan: o.canLoan, canReserve: o.canReserve });
    }
    return map;
  }

  // 그룹(같은 자료 + 같은 권/호) 안에 지금 바로 대출 가능한 복본이 하나라도 있는지 확인합니다.
  // 대출 가능한 복본이 있다면 굳이 예약할 필요 없이 바로 빌리면 되므로, 이 경우 그룹 전체가 예약 불가입니다.
  private groupHasLoanableCopy(
    groupCopies: { status: string }[],
    statusMap: Map<string, { canLoan: boolean; canReserve: boolean }>,
  ): boolean {
    return groupCopies.some((c) => statusMap.get(c.status)?.canLoan === true);
  }

  // 복본 한 권이 지금 예약 가능한지 확인합니다. (회원 조건과는 별개로, 복본/그룹 조건만 확인합니다.)
  private evaluateCopyEligibility(
    copy: { status: string },
    groupCopies: { status: string }[],
    statusMap: Map<string, { canLoan: boolean; canReserve: boolean }>,
    activeReservationCountInGroup: number,
    maxQueueSize: number | null,
  ): { ok: boolean; reason?: string } {
    const flags = statusMap.get(copy.status);
    if (!flags?.canReserve) {
      return { ok: false, reason: `현재 상태(${copy.status})는 예약할 수 없습니다.` };
    }
    if (this.groupHasLoanableCopy(groupCopies, statusMap)) {
      return { ok: false, reason: '지금 바로 대출 가능한 자료가 있어 예약할 수 없습니다.' };
    }
    if (maxQueueSize !== null && activeReservationCountInGroup >= maxQueueSize) {
      return { ok: false, reason: `이미 최대 예약 인원(${maxQueueSize}명)에 도달했습니다.` };
    }
    return { ok: true };
  }

  // 회원이 예약할 수 있는 상태인지(정지/탈퇴 등), 전체 예약 한도를 채우지 않았는지 확인합니다.
  private async evaluateMemberEligibility(
    libraryId: number,
    userId: number,
  ): Promise<{ ok: boolean; reason?: string; member: any }> {
    const member = await this.prisma.user.findFirst({
      where: { id: userId, libraryId },
      include: { memberType: true },
    });
    if (!member) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    if (member.status !== 'ACTIVE') {
      return { ok: false, reason: '지금 예약할 수 없는 회원 상태입니다.', member };
    }

    const loanSetting = member.memberTypeId
      ? await this.prisma.loanSetting.findFirst({ where: { libraryId, memberTypeId: member.memberTypeId } })
      : null;
    const overallMax = loanSetting?.maxReservationCount ?? 3;
    const overallCount = await this.prisma.reservation.count({
      where: { libraryId, userId, status: 'RESERVED' },
    });
    if (overallCount >= overallMax) {
      return { ok: false, reason: `전체 예약 가능 권수(${overallMax}권)를 이미 채웠습니다.`, member };
    }
    return { ok: true, member };
  }

  // 자료 종류(도서, DVD 등)별 예약 한도를 채우지 않았는지 확인합니다. 한도가 설정되어 있지 않으면 통과시킵니다.
  private async evaluateTypeEligibility(
    libraryId: number,
    userId: number,
    materialTypeCode: string,
  ): Promise<{ ok: boolean; reason?: string }> {
    const materialType = await this.prisma.materialType.findFirst({ where: { libraryId, code: materialTypeCode } });
    if (!materialType || materialType.maxReservationCount === null || materialType.maxReservationCount === undefined) {
      return { ok: true };
    }
    const typeCount = await this.prisma.reservation.count({
      where: { libraryId, userId, status: 'RESERVED', copy: { material: { type: materialTypeCode } } },
    });
    if (typeCount >= materialType.maxReservationCount) {
      return {
        ok: false,
        reason: `'${materialType.nameKo}' 예약 가능 권수(${materialType.maxReservationCount}권)를 이미 채웠습니다.`,
      };
    }
    return { ok: true };
  }

  // '예약하기' 화면에서 씁니다. 회원 한 명을 기준으로, 검색어(자료명/저자/등록번호)에 맞는 자료의
  // 복본들을 찾아서 각 복본이 지금 이 회원에게 예약 가능한지와 그 이유를 함께 돌려줍니다.
  async searchReservableCopies(libraryId: number, userId: number, keyword: string) {
    const memberEval = await this.evaluateMemberEligibility(libraryId, userId);

    const kw = (keyword || '').trim();
    const materials = await this.prisma.material.findMany({
      where: {
        libraryId,
        ...(kw
          ? {
              OR: [
                { title: { contains: kw, mode: 'insensitive' } },
                { creator: { contains: kw, mode: 'insensitive' } },
                { copies: { some: { registrationNo: { contains: kw, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: { copies: true },
      take: 20,
    });

    const statusMap = await this.getStatusFlagMap(libraryId);
    const library = await this.prisma.library.findFirst();
    const maxQueueSize = library?.maxReservationQueueSize ?? null;
    const typeEvalCache = new Map<string, { ok: boolean; reason?: string }>();

    const rows: any[] = [];
    for (const material of materials) {
      if (!typeEvalCache.has(material.type)) {
        typeEvalCache.set(
          material.type,
          memberEval.ok ? await this.evaluateTypeEligibility(libraryId, userId, material.type) : { ok: false },
        );
      }
      const typeEval = typeEvalCache.get(material.type)!;

      // 자료 안에서 같은 권/호끼리 그룹으로 묶고, 그룹별 현재 예약 인원 수를 미리 계산해둡니다.
      const groups = new Map<string, typeof material.copies>();
      for (const c of material.copies) {
        const key = c.volume ?? '';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      }
      const groupActiveCounts = new Map<string, number>();
      for (const [key, groupCopies] of groups) {
        const count = await this.prisma.reservation.count({
          where: { libraryId, status: 'RESERVED', copyId: { in: groupCopies.map((c) => c.id) } },
        });
        groupActiveCounts.set(key, count);
      }

      for (const copy of material.copies) {
        const key = copy.volume ?? '';
        const groupCopies = groups.get(key)!;
        const copyEval = this.evaluateCopyEligibility(
          copy,
          groupCopies,
          statusMap,
          groupActiveCounts.get(key) ?? 0,
          maxQueueSize,
        );

        let reservable = copyEval.ok;
        let reason = copyEval.reason;
        if (reservable && !memberEval.ok) {
          reservable = false;
          reason = memberEval.reason;
        }
        if (reservable && !typeEval.ok) {
          reservable = false;
          reason = typeEval.reason;
        }

        rows.push({
          copyId: copy.id,
          registrationNo: copy.registrationNo,
          callNumber: copy.callNumber,
          volume: copy.volume,
          copyNumber: copy.copyNumber,
          status: copy.status,
          materialId: material.id,
          materialTitle: material.title,
          creator: material.creator,
          reservable,
          reason: reservable ? undefined : reason,
        });
      }
    }

    return rows;
  }

  // 예약을 실제로 만듭니다. 화면에서 미리 계산해서 보여준 예약 가능 여부와 별개로,
  // 그 사이 상황이 바뀌었을 수 있으므로(다른 직원이 먼저 예약했을 수도 있으므로) 여기서 다시 한 번 확인합니다.
  async createReservation(libraryId: number, userId: number, copyId: number) {
    const memberEval = await this.evaluateMemberEligibility(libraryId, userId);
    if (!memberEval.ok) {
      throw new BadRequestException(memberEval.reason);
    }

    const copy = await this.prisma.copy.findFirst({ where: { id: copyId, libraryId }, include: { material: true } });
    if (!copy) {
      throw new NotFoundException('복본을 찾을 수 없습니다.');
    }

    const typeEval = await this.evaluateTypeEligibility(libraryId, userId, copy.material.type);
    if (!typeEval.ok) {
      throw new BadRequestException(typeEval.reason);
    }

    const groupCopies = await this.prisma.copy.findMany({
      where: { libraryId, materialId: copy.materialId, volume: copy.volume },
    });
    const statusMap = await this.getStatusFlagMap(libraryId);
    const library = await this.prisma.library.findFirst();
    const maxQueueSize = library?.maxReservationQueueSize ?? null;
    const activeCount = await this.prisma.reservation.count({
      where: { libraryId, status: 'RESERVED', copyId: { in: groupCopies.map((c) => c.id) } },
    });

    const copyEval = this.evaluateCopyEligibility(copy, groupCopies, statusMap, activeCount, maxQueueSize);
    if (!copyEval.ok) {
      throw new BadRequestException(copyEval.reason);
    }

    return this.prisma.reservation.create({
      data: { libraryId, userId, copyId: copy.id, status: 'RESERVED' },
      include: { user: true, copy: { include: { material: true } } },
    });
  }

  // 예약을 취소합니다. 취소한 예약이 복본을 보관 중이던 것이었다면, 그룹의 다음 대기자에게 자동으로 넘겨줍니다.
  async cancelReservation(libraryId: number, reservationId: number) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, libraryId },
      include: { copy: true },
    });
    if (!reservation) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    if (reservation.status !== 'RESERVED') {
      throw new BadRequestException('이미 취소되었거나 대출완료된 예약입니다.');
    }

    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'CANCELED' },
    });

    // 복본을 보관 중이던(holdDueDate가 있는) 예약이 취소된 경우에만, 그 복본을 다음 대기자에게 넘기거나 풀어줍니다.
    if (reservation.holdDueDate) {
      await this.promoteNextOrRelease(libraryId, reservation.copy.id, reservation.copy.materialId, reservation.copy.volume);
    }

    return { success: true };
  }

  // 복본 하나가 자유로워졌을 때(반납되었거나, 보관 중이던 예약이 취소됐을 때) 호출합니다.
  // 그룹 안에 대기 중인(holdDueDate가 없는 RESERVED) 예약이 있으면 그 사람에게 복본을 넘기고 보관마감일을 새로 계산하고,
  // 없으면 복본 상태를 '대출가능'으로 되돌립니다.
  private async promoteNextOrRelease(libraryId: number, copyId: number, materialId: number, volume: string | null) {
    const next = await this.prisma.reservation.findFirst({
      where: {
        libraryId,
        status: 'RESERVED',
        holdDueDate: null,
        copy: { materialId, volume },
      },
      orderBy: { reservedAt: 'asc' },
      include: { user: { include: { memberType: true } } },
    });

    if (!next) {
      await this.prisma.copy.update({ where: { id: copyId }, data: { status: AVAILABLE } });
      return;
    }

    const loanSetting = next.user.memberTypeId
      ? await this.prisma.loanSetting.findFirst({ where: { libraryId, memberTypeId: next.user.memberTypeId } })
      : null;
    const holdDays = loanSetting?.reservationHoldDays ?? 3;
    const holdDueDate = new Date();
    holdDueDate.setDate(holdDueDate.getDate() + holdDays);

    await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: next.id },
        data: { copyId, holdDueDate },
      }),
      this.prisma.copy.update({
        where: { id: copyId },
        data: { status: HOLDING },
      }),
    ]);
  }

  // 이 복본을 지금 누군가 보관 중인 예약으로 잡고 있는지 확인합니다. (대출 처리에서 사용)
  async findHeldReservation(libraryId: number, copyId: number) {
    return this.prisma.reservation.findFirst({
      where: { libraryId, copyId, status: 'RESERVED', holdDueDate: { not: null } },
      include: { user: true },
    });
  }

  // 예약했던 회원이 실제로 대출을 완료했을 때, 그 예약을 '대출완료'로 바꿉니다. (대출 처리에서 사용)
  async fulfillReservation(reservationId: number) {
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'FULFILLED' },
    });
  }

  // 자료가 반납되었을 때 호출합니다. (반납 처리에서 사용)
  // 대기 중인 예약자가 있으면 그 복본을 보관 상태로 돌리고, 없으면 평소처럼 대출가능 상태로 돌립니다.
  // 이 함수 안에서 Copy.status를 직접 갱신하므로, 호출하는 쪽에서는 따로 상태를 바꾸지 않아도 됩니다.
  async handleCopyReturned(libraryId: number, copyId: number) {
    const copy = await this.prisma.copy.findFirst({ where: { id: copyId, libraryId } });
    if (!copy) return;
    await this.promoteNextOrRelease(libraryId, copy.id, copy.materialId, copy.volume);
  }

  // 회원 한 명의 현재 예약(RESERVED) 목록을 가져옵니다. ('예약하기' 완료 화면 하단에 씁니다.)
  async listByMember(libraryId: number, userId: number) {
    return this.prisma.reservation.findMany({
      where: { libraryId, userId, status: 'RESERVED' },
      include: { copy: { include: { material: true } } },
      orderBy: { reservedAt: 'asc' },
    });
  }

  // 예약 정보를 화면 표에 바로 그릴 수 있는 모양으로 바꿔줍니다.
  private toRow(r: any, statusCode: string) {
    return {
      id: r.id,
      status: statusCode,
      reservedAt: r.reservedAt,
      holdDueDate: r.holdDueDate,
      registrationNo: r.copy.registrationNo,
      materialTitle: r.copy.material.title,
      creator: r.copy.material.creator,
      memberNo: r.user.memberNo,
      memberName: r.user.name,
    };
  }

  // '예약' 탭 상단 5개 보기(예약중/연체중/보관중/보관일지남/이력)에 맞는 예약 목록을 페이지 단위로 가져옵니다.
  async listByView(libraryId: number, view: string, page: number, pageSize: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // '보관 중'과 '보관일이 지난'은 holdDueDate 값과 오늘 날짜를 비교해서 바로 나눌 수 있습니다.
    if (view === 'HOLDING' || view === 'HOLD_EXPIRED') {
      const where: any = {
        libraryId,
        status: 'RESERVED',
        holdDueDate: view === 'HOLDING' ? { gte: today } : { lt: today },
      };
      const [items, total] = await this.prisma.$transaction([
        this.prisma.reservation.findMany({
          where,
          include: { user: true, copy: { include: { material: true } } },
          orderBy: { holdDueDate: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.reservation.count({ where }),
      ]);
      return { items: items.map((r) => this.toRow(r, view)), total, page, pageSize };
    }

    // '예약 이력'은 더 이상 진행 중이지 않은(취소되었거나 대출완료된) 예약들입니다.
    if (view === 'HISTORY') {
      const where: any = { libraryId, status: { in: ['CANCELED', 'FULFILLED'] } };
      const [items, total] = await this.prisma.$transaction([
        this.prisma.reservation.findMany({
          where,
          include: { user: true, copy: { include: { material: true } } },
          orderBy: { reservedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.reservation.count({ where }),
      ]);
      return { items: items.map((r) => this.toRow(r, r.status)), total, page, pageSize };
    }

    // '예약 중'과 '연체 중'은 둘 다 아직 대기 중인(holdDueDate가 없는) 예약이지만,
    // 그 그룹의 복본 중에 지금 대출 중이면서 연체된 것이 있는지에 따라 나눕니다.
    const waiting = await this.prisma.reservation.findMany({
      where: { libraryId, status: 'RESERVED', holdDueDate: null },
      include: { user: true, copy: { include: { material: true } } },
      orderBy: { reservedAt: 'asc' },
    });

    const classified: { reservation: (typeof waiting)[number]; view: string }[] = [];
    for (const r of waiting) {
      const siblingLoans = await this.prisma.loan.findMany({
        where: {
          libraryId,
          returnedAt: null,
          copy: { materialId: r.copy.materialId, volume: r.copy.volume },
        },
      });
      const isOverdue = siblingLoans.some((l) => {
        const d = new Date(l.dueDate);
        d.setHours(0, 0, 0, 0);
        return d < today;
      });
      classified.push({ reservation: r, view: isOverdue ? 'OVERDUE' : 'RESERVED' });
    }

    const filtered = classified.filter((c) => c.view === view);
    const total = filtered.length;
    const pageItems = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    return { items: pageItems.map((c) => this.toRow(c.reservation, c.view)), total, page, pageSize };
  }
}