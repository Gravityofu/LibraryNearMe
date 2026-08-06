import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PostReferencesService {
  constructor(private prisma: PrismaService) {}

  // 어떤 글에 등록된 참고자료 목록을 순서대로 가져옵니다.
  async list(libraryId: number, postId: number) {
    const owner = await this.prisma.post.findFirst({ where: { id: postId, libraryId } });
    if (!owner) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    const refs = await this.prisma.postReference.findMany({
      where: { libraryId, postId },
      include: {
        material: true,
        referencedPost: { include: { board: true, authorUser: { select: { name: true } } } },
      },
      orderBy: { order: 'asc' },
    });

    // 자료 종류 코드를 화면에 보여줄 이름(nameKo)으로 바꾸기 위해 한 번에 불러옵니다.
    const materialTypes = await this.prisma.materialType.findMany({ where: { libraryId } });
    const typeNameMap = new Map(materialTypes.map((t) => [t.code, t.nameKo]));

    return refs.map((r) => {
      if (r.material) {
        return {
          id: r.id,
          order: r.order,
          kind: 'MATERIAL',
          typeLabel: typeNameMap.get(r.material.type) || r.material.type,
          title: r.material.title,
          author: r.material.creator || '',
        };
      }
      const rp = r.referencedPost!;
      return {
        id: r.id,
        order: r.order,
        kind: 'POST',
        typeLabel: rp.board?.name || '',
        title: rp.title,
        author: rp.authorUser?.name || rp.guestName || '',
      };
    });
  }

  // 참고자료 새로 등록. materialId 또는 referencedPostId 중 하나만 받습니다.
  async create(libraryId: number, data: any) {
    const postId = Number(data.postId);
    const owner = await this.prisma.post.findFirst({ where: { id: postId, libraryId } });
    if (!owner) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    const materialId = data.materialId ? Number(data.materialId) : null;
    const referencedPostId = data.referencedPostId ? Number(data.referencedPostId) : null;

    if ((materialId && referencedPostId) || (!materialId && !referencedPostId)) {
      throw new BadRequestException('자료 또는 게시글 중 하나만 선택하세요.');
    }

    if (materialId) {
      const material = await this.prisma.material.findFirst({ where: { id: materialId, libraryId } });
      if (!material) {
        throw new BadRequestException('자료를 찾을 수 없습니다.');
      }
      const dup = await this.prisma.postReference.findFirst({ where: { libraryId, postId, materialId } });
      if (dup) {
        throw new BadRequestException('이미 등록된 자료입니다.');
      }
    }

    if (referencedPostId) {
      if (referencedPostId === postId) {
        throw new BadRequestException('이 글 자신은 참고자료로 등록할 수 없습니다.');
      }
      const refPost = await this.prisma.post.findFirst({ where: { id: referencedPostId, libraryId } });
      if (!refPost) {
        throw new BadRequestException('글을 찾을 수 없습니다.');
      }
      const dup = await this.prisma.postReference.findFirst({ where: { libraryId, postId, referencedPostId } });
      if (dup) {
        throw new BadRequestException('이미 등록된 글입니다.');
      }
    }

    const last = await this.prisma.postReference.findFirst({
      where: { libraryId, postId },
      orderBy: { order: 'desc' },
    });
    const order = (last?.order ?? -1) + 1;

    return this.prisma.postReference.create({
      data: {
        libraryId,
        postId,
        materialId: materialId || undefined,
        referencedPostId: referencedPostId || undefined,
        order,
      },
    });
  }

  // 참고자료 목록에서 빼기 (자료나 글 자체를 지우는 것이 아닙니다)
  async remove(libraryId: number, id: number) {
    const existing = await this.prisma.postReference.findFirst({ where: { id, libraryId } });
    if (!existing) {
      throw new NotFoundException('참고자료를 찾을 수 없습니다.');
    }
    await this.prisma.postReference.delete({ where: { id } });
    return { success: true };
  }

  // 드래그로 바뀐 순서를 저장합니다. orderedIds는 새로운 순서대로 나열한 참고자료 id 배열입니다.
  async reorder(libraryId: number, postId: number, orderedIds: number[]) {
    const owner = await this.prisma.post.findFirst({ where: { id: postId, libraryId } });
    if (!owner) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.postReference.updateMany({
          where: { id, libraryId, postId },
          data: { order: index },
        }),
      ),
    );
    return { success: true };
  }
}