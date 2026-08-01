import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LoanRestrictionsService } from '../loan-restrictions/loan-restrictions.service';

const AVAILABLE = '대출가능';
const ON_LOAN = '대출중';

// 날짜(연/월/일)는 date에서, 시각(시/분/초)은 지금 이 순간에서 가져와 합칩니다.
// '대출/반납일 변경'으로 다른 날짜를 지정해도, 실제로 처리한 시각은 정확하게 기록하기 위해 씁니다.
function combineDateWithNow(date: Date): Date {
  const now = new Date();
  const combined = new Date(date);
  // 1단계에서 서버 시간대를 한국 시간으로 맞췄으므로, getHours() 등은 이제 한국 시간 기준입니다.
  combined.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return combined;
}

@Injectable()
export class LoansService {
  constructor(
    private prisma: PrismaService,
    private loanRestrictionsService: LoanRestrictionsService,
  ) {}

  // 대출 화면에서 회원을 찾을 때 씁니다. 이름 또는 회원번호로 찾을 수 있어요.
  async findMembers(libraryId: number, keyword: string) {
    const kw = (keyword || '').trim();
    if (!kw) return [];
    return this.prisma.user.findMany({
      where: {
        libraryId,
        role: { not: 'SUPER' },
        status: { in: ['ACTIVE', 'SUSPENDED'] },
        OR: [
          { name: { contains: kw } },
          { memberNo: { contains: kw } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        memberNo: true,
        status: true,
        birthDate: true,
        email: true,
        address: true,
        memberType: { select: { id: true, name: true } },
      },
      take: 10,
      orderBy: { name: 'asc' },
    });
  }

  // 등록번호로 실물 자료를 찾습니다.
  async findCopyByRegistrationNo(libraryId: number, registrationNo: string) {
    const copy = await this.prisma.copy.findFirst({
      where: { libraryId, registrationNo: (registrationNo || '').trim() },
      include: { material: true },
    });
    if (!copy) {
      throw new NotFoundException(`등록번호 '${registrationNo}' 자료를 찾을 수 없습니다.`);
    }
    return copy;
  }

  // 이 회원이 지금 반납하지 않은(대출중인) 자료가 몇 권인지 셉니다. extraWhere로 자료 종류/KDC 조건을 더할 수 있어요.
  private countActiveLoans(libraryId: number, userId: number, extraWhere: any = {}) {
    return this.prisma.loan.count({
      where: { libraryId, userId, returnedAt: null, ...extraWhere },
    });
  }

  // 대출 처리하기: 회원 1명 + 등록번호 1개를 받아서, 여러 조건을 확인한 뒤 대출을 만듭니다.
  // loanDateOverride를 넘기면 오늘 날짜 대신 그 날짜로 대출일이 저장됩니다. ('대출/반납일 변경' 기능용)
  async createLoan(libraryId: number, userId: number, registrationNo: string, loanDateOverride?: Date) {

    // 1. 회원 확인
    const member = await this.prisma.user.findFirst({
      where: { id: userId, libraryId },
      include: { memberType: true },
    });
    if (!member) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    if (member.status === 'PENDING') {
      throw new BadRequestException('아직 활성화되지 않은 회원은 대출할 수 없습니다.');
    }
    if (member.status === 'WITHDRAWN') {
      throw new BadRequestException('탈퇴한 회원은 대출할 수 없습니다.');
    }

    // 이중 안전장치: 회원 상태가 '정지'인지와 별개로, 지금 이 순간 실제로 유효한 대출제한이 있는지 다시 확인합니다.
    // (대출제한이 끝난 회원을 매일 자정 자동으로 '활성'으로 되돌리는 작업이 있지만,
    //  서버가 그 시각에 꺼져 있었다면 자동 해제를 놓칠 수 있어서, 대출을 시도하는 이 순간 한 번 더 확인합니다.)        
    // '대출/반납일 변경'으로 대출일을 다른 날짜로 지정했다면, 대출제한이 풀렸는지도 그 날짜를
    // 기준으로 확인합니다. 지정하지 않았다면(loanDateOverride가 없다면) 실제 오늘 날짜를 기준으로 확인합니다.
    const activeRestriction = await this.loanRestrictionsService.findActiveRestriction(
      libraryId,
      userId,
      loanDateOverride,
    );
    if (activeRestriction) {
      // 제한 마지막 날 다음 날부터 대출이 가능하므로, 하루를 더해서 안내합니다.
      const availableFrom = new Date(activeRestriction.endDate);
      availableFrom.setUTCDate(availableFrom.getUTCDate() + 1);
      throw new BadRequestException(
        `대출 제한 중입니다. (대출 가능일: ${availableFrom.toISOString().slice(0, 10)}부터)`,
      );
    }

    // 상태는 '정지'인데 유효한 대출제한이 없다면(자동 해제를 놓친 경우), 지금 이 자리에서 '활성'으로 되돌립니다.
    if (member.status === 'SUSPENDED') {
      await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
    }

    // 2. 자료(실물) 확인
    const copy = await this.findCopyByRegistrationNo(libraryId, registrationNo);
    if (copy.status !== AVAILABLE) {
      throw new BadRequestException(
        `현재 대출 가능한 상태가 아닙니다. (현재 상태: ${copy.status})`,
      );
    }

    // 3. 자료 종류(자료 종류별 대출 설정) 확인
    const materialType = await this.prisma.materialType.findFirst({
      where: { libraryId, code: copy.material.type },
      include: { kdcRules: true },
    });
    if (!materialType || materialType.maxLoanCount === null || materialType.loanPeriodDays === null) {
      throw new BadRequestException(
        '이 자료 종류는 아직 대출 설정이 되어 있지 않습니다. 설정 → 대출 화면에서 먼저 설정해주세요.',
      );
    }

    // 4. 회원구분별 전체 대출 한도 확인
    const loanSetting = member.memberTypeId
      ? await this.prisma.loanSetting.findFirst({
          where: { libraryId, memberTypeId: member.memberTypeId },
        })
      : null;
    const overallMax = loanSetting?.maxLoanCount ?? 5;
    const overallCount = await this.countActiveLoans(libraryId, userId);
    if (overallCount >= overallMax) {
      throw new BadRequestException(`전체 대출 가능 권수(${overallMax}권)를 이미 채웠습니다.`);
    }

    // 5. 자료 종류별 대출 한도 확인
    const typeCount = await this.countActiveLoans(libraryId, userId, {
      copy: { material: { type: copy.material.type } },
    });
    if (typeCount >= materialType.maxLoanCount) {
      throw new BadRequestException(
        `'${materialType.nameKo}' 대출 가능 권수(${materialType.maxLoanCount}권)를 이미 채웠습니다.`,
      );
    }

    // 6. KDC 하위 규칙 확인 (해당하는 규칙이 있을 때만)
    if (materialType.kdcRules.length > 0 && copy.material.classNumber) {
      const matchedRule = materialType.kdcRules.find((r) =>
        copy.material.classNumber!.startsWith(r.kdcPrefix),
      );
      if (matchedRule) {
        const kdcCount = await this.countActiveLoans(libraryId, userId, {
          copy: {
            material: {
              type: copy.material.type,
              classNumber: { startsWith: matchedRule.kdcPrefix },
            },
          },
        });
        if (kdcCount >= matchedRule.maxLoanCount) {
          throw new BadRequestException(
            `'${matchedRule.label}(${matchedRule.kdcPrefix})' 대출 가능 권수(${matchedRule.maxLoanCount}권)를 이미 채웠습니다.`,
          );
        }
      }
    }

    // 7. 모든 조건 통과 → 대출 만들고, 자료 상태를 "대출중"으로 바꾸기
    // '대출/반납일 변경'으로 다른 날짜를 지정했다면 그 날짜를, 아니라면 오늘 날짜를 기준으로 하되,
    // 시각(시:분:초)은 항상 지금 처리하는 실제 시각을 기록합니다. 반납예정일은 시각 없이 날짜만 기록합니다.
    const chosenLoanDate = loanDateOverride || new Date();
    const loanDate = combineDateWithNow(chosenLoanDate);
    const dueDate = new Date(chosenLoanDate);
    dueDate.setDate(dueDate.getDate() + materialType.loanPeriodDays);

    const [loan] = await this.prisma.$transaction([
      this.prisma.loan.create({
        data: { libraryId, copyId: copy.id, userId, loanDate, dueDate },
      }),
      this.prisma.copy.update({
        where: { id: copy.id },
        data: { status: ON_LOAN },
      }),
    ]);

    return {
      id: loan.id,
      memberName: member.name,
      materialTitle: copy.material.title,
      registrationNo: copy.registrationNo,
      loanDate: loan.loanDate,
      dueDate: loan.dueDate,
    };
  }

  // 이 회원이 지금 대출 중인(아직 반납하지 않은) 자료 목록을 가져옵니다. ('대출 자료 목록' 박스에서 씁니다.)
  async listActiveLoans(libraryId: number, userId: number) {
    return this.prisma.loan.findMany({
      where: { libraryId, userId, returnedAt: null },
      include: { copy: { include: { material: true } } },
      orderBy: { loanDate: 'desc' },
    });
  }

  // 반납 처리하기: 등록번호 하나를 받아서, 그 자료를 대출 중인 기록을 찾아 반납 처리합니다.
  // returnDateOverride를 넘기면 오늘 날짜 대신 그 날짜로 반납일이 저장됩니다. ('대출/반납일 변경' 기능용)
  async returnLoan(libraryId: number, registrationNo: string, returnDateOverride?: Date) {
    const copy = await this.findCopyByRegistrationNo(libraryId, registrationNo);

    const loan = await this.prisma.loan.findFirst({
      where: { libraryId, copyId: copy.id, returnedAt: null },
      include: { user: { include: { memberType: true } } },
    });
    if (!loan) {
      throw new BadRequestException('현재 대출 중인 자료가 아닙니다.');
    }

    const chosenReturnDate = returnDateOverride || new Date();
    const returnedAt = combineDateWithNow(chosenReturnDate);

    const [updatedLoan] = await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id: loan.id },
        data: { returnedAt },
      }),
      this.prisma.copy.update({
        where: { id: copy.id },
        data: { status: AVAILABLE },
      }),
    ]);

    // 화면에서 "방금 반납한 자료" 행과 "이 회원의 정보"를 바로 그릴 수 있도록,
    // 대출 목록과 같은 모양(copy, material 포함)으로 함께 돌려줍니다.
    return {
      id: updatedLoan.id,
      loanDate: updatedLoan.loanDate,
      dueDate: updatedLoan.dueDate,
      renewCount: updatedLoan.renewCount,
      copy: {
        registrationNo: copy.registrationNo,
        callNumber: copy.callNumber,
        volume: copy.volume,
        copyNumber: copy.copyNumber,
        status: AVAILABLE,
        material: { title: copy.material.title },
      },
      member: {
        id: loan.user.id,
        name: loan.user.name,
        phone: loan.user.phone,
        memberNo: loan.user.memberNo,
        status: loan.user.status,
        birthDate: loan.user.birthDate,
        email: loan.user.email,
        address: loan.user.address,
        memberType: loan.user.memberType
          ? { id: loan.user.memberType.id, name: loan.user.memberType.name }
          : null,
      },
    };
  }

  // '대출이력' 화면에서 씁니다. 조건(회원번호/회원이름/등록번호/대출일/반납일)에 맞는 대출 기록을
  // 최신순으로 페이지 단위로 가져옵니다. (반납 여부와 상관없이 모든 대출 기록을 대상으로 합니다.)
  async listLoanHistory(
    libraryId: number,
    page: number,
    pageSize: number,
    filters: {
      memberNo?: string;
      memberName?: string;
      registrationNo?: string;
      loanDate?: string;
      returnedDate?: string;
    },
  ) {
    const where: any = { libraryId };

    if (filters.memberNo || filters.memberName) {
      where.user = {};
      if (filters.memberNo) where.user.memberNo = { contains: filters.memberNo, mode: 'insensitive' };
      if (filters.memberName) where.user.name = { contains: filters.memberName, mode: 'insensitive' };
    }
    if (filters.registrationNo) {
      where.copy = { registrationNo: { contains: filters.registrationNo, mode: 'insensitive' } };
    }
    // 대출일/반납일은 "그 날짜 하루" 전체(한국 시간 기준 자정부터 다음 날 자정 전까지)를 찾습니다.
    if (filters.loanDate) {
      const start = new Date(`${filters.loanDate}T00:00:00+09:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.loanDate = { gte: start, lt: end };
    }
    if (filters.returnedDate) {
      const start = new Date(`${filters.returnedDate}T00:00:00+09:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.returnedAt = { gte: start, lt: end };
    }

    const [loans, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        include: { user: true, copy: { include: { material: true } } },
        orderBy: { loanDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.loan.count({ where }),
    ]);

    return {
      items: loans.map((loan) => ({
        id: loan.id,
        status: loan.returnedAt ? 'RETURNED' : 'ON_LOAN',
        memberNo: loan.user.memberNo,
        memberName: loan.user.name,
        registrationNo: loan.copy.registrationNo,
        loanDate: loan.loanDate,
        dueDate: loan.dueDate,
        returnedAt: loan.returnedAt,
        title: loan.copy.material.title,
        creator: loan.copy.material.creator,
        publisher: loan.copy.material.publisher,
        location: loan.copy.location,
      })),
      total,
      page,
      pageSize,
    };
  }

  // 이름/회원번호 외에 휴대폰번호/아이디/이메일/주소로도 회원을 찾을 때 씁니다. (상세 검색용)
  async findMembersDetailed(
    libraryId: number,
    filters: { name?: string; memberNo?: string; phone?: string; loginId?: string; email?: string; address?: string },
  ) {
    const where: any = { libraryId, role: { not: 'SUPER' }, status: { in: ['ACTIVE', 'SUSPENDED'] } };
    if (filters.name?.trim()) where.name = { contains: filters.name.trim() };
    if (filters.memberNo?.trim()) where.memberNo = { contains: filters.memberNo.trim() };
    if (filters.phone?.trim()) where.phone = { contains: filters.phone.trim() };
    if (filters.loginId?.trim()) where.loginId = { contains: filters.loginId.trim() };
    if (filters.email?.trim()) where.email = { contains: filters.email.trim() };
    if (filters.address?.trim()) where.address = { contains: filters.address.trim() };

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        memberNo: true,
        status: true,
        birthDate: true,
        email: true,
        address: true,
        memberType: { select: { id: true, name: true } },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }
}