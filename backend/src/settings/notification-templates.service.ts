import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// 이 도서관에 문구 템플릿이 하나도 없을 때 자동으로 채워지는 기본 문구입니다.
// "{title}" 부분은 화면에 보여줄 때 실제 자료 제목으로 바뀝니다.
const DEFAULT_TEMPLATES: { status: string; message: string }[] = [
  { status: 'PURCHASING', message: "신청하신 '{title}' 자료가 구입 진행 중입니다." },
  { status: 'PURCHASED', message: "신청하신 '{title}' 자료 구입이 완료되었습니다." },
  { status: 'NOT_PURCHASED', message: "신청하신 '{title}' 자료는 구입하지 않기로 결정되었습니다." },
];

@Injectable()
export class NotificationTemplatesService {
  constructor(private prisma: PrismaService) {}

  // 목록 조회. 3가지 상태 중 아직 만들어지지 않은 것이 있으면 기본 문구로 자동으로 채워 넣습니다.
  async list(libraryId: number) {
    const existing = await this.prisma.notificationTemplate.findMany({ where: { libraryId } });
    const existingStatuses = existing.map((t) => t.status);
    const missing = DEFAULT_TEMPLATES.filter((t) => !existingStatuses.includes(t.status));

    if (missing.length > 0) {
      await this.prisma.notificationTemplate.createMany({
        data: missing.map((t) => ({ libraryId, status: t.status, message: t.message })),
      });
    }

    const all = await this.prisma.notificationTemplate.findMany({ where: { libraryId } });
    // 화면에 항상 같은 순서(구입 진행 중 → 구입 완료 → 미구입)로 보이도록 정렬합니다.
    const order = ['PURCHASING', 'PURCHASED', 'NOT_PURCHASED'];
    return all.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  }

  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.notificationTemplate.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('문구 템플릿을 찾을 수 없습니다.');
    }
    const message = String(data.message ?? '').trim();
    if (!message) {
      throw new BadRequestException('문구를 입력하세요.');
    }
    return this.prisma.notificationTemplate.update({ where: { id }, data: { message } });
  }
}