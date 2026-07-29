import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const AVAILABLE = '이용가능';
const ON_LOAN = '대출중';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  // 대출 화면에서 회원을 찾을 때 씁니다. 이름/휴대폰번호/아이디/회원번호 중 일부만 입력해도 찾을 수 있어요.
  async findMembers(libraryId: number, keyword: string) {
    const kw = (keyword || '').trim();
    if (!kw) return [];
    return this.prisma.user.findMany({
      where: {
        libraryId,
        role: 'MEMBER',
        status: 'ACTIVE',
        OR: [
          { name: { contains: kw } },
          { phone: { contains: kw } },
          { loginId: { contains: kw } },
          { memberNo: { contains: kw } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        memberNo: true,
        loginId: true,
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
  async createLoan(libraryId: number, userId: number, registrationNo: string) {
    // 1. 회원 확인
    const member = await this.prisma.user.findFirst({
      where: { id: userId, libraryId },
      include: { memberType: true },
    });
    if (!member) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    if (member.status !== 'ACTIVE') {
      throw new BadRequestException('이용정지 상태이거나 대기중인 회원은 대출할 수 없습니다.');
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
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + materialType.loanPeriodDays);

    const [loan] = await this.prisma.$transaction([
      this.prisma.loan.create({
        data: { libraryId, copyId: copy.id, userId, dueDate },
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
}