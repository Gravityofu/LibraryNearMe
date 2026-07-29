# 개선 39: KDC 하위 규칙 대출 권수 합계 검증 추가

## 목표

'대출' → "자료별 대출 설정" → "도서" 행의 "KDC 하위 규칙" 화면에서, 하위 규칙 하나하나의 대출 가능 권수가 상위 자료("도서")의 대출 가능 권수보다 클 수는 없도록 이미 막혀 있습니다. 하지만 **하위 규칙들을 모두 더한 값**이 상위 자료의 대출 가능 권수를 넘는 것은 막혀 있지 않았습니다.

예를 들어 "도서"의 대출 가능 권수가 10권일 때, KDC 657을 10권으로 등록한 뒤 KDC 200을 새로 2권으로 등록하면, 657(10권)과 200(2권)의 합이 12권이 되어 상위 자료의 10권을 넘는데도 저장이 되는 문제가 있었습니다. 이번 가이드에서는 KDC 하위 규칙을 추가하거나 수정할 때, **그 자료 종류 안의 모든 KDC 하위 규칙의 대출 가능 권수 합계**가 상위 자료의 대출 가능 권수를 넘지 않도록 검사를 추가합니다. (합계가 상위 자료와 정확히 같은 것은 괜찮습니다.)

같이 살펴보니, "도서"의 대출 가능 권수 자체를 줄일 때 하는 검사도 원래는 "하위 규칙 중 가장 큰 값보다 작게 줄일 수 없다"는 방식이었는데, 이것도 같은 이유로 "하위 규칙들의 합계보다 작게 줄일 수 없다"로 함께 고쳐야 앞뒤가 맞습니다. 이 부분도 같이 고칩니다.

---

## 백엔드 수정하기: `material-types.service.ts`

`C:\projects\LibraryNearMe\backend\src\settings\material-types.service.ts` 파일을 여세요.

### 1. "도서"의 대출 가능 권수를 줄일 때 하는 검사를, "가장 큰 값" 대신 "합계" 기준으로 바꾸기

아래 부분을 찾으세요.

```ts
      const maxChildLimit = existing.kdcRules.reduce((m, r) => Math.max(m, r.maxLoanCount), 0);
      if (next < maxChildLimit) {
        throw new BadRequestException(
          `하위 KDC 규칙 중 ${maxChildLimit}권으로 설정된 항목이 있어, 그보다 작게 설정할 수 없습니다.`,
        );
      }
```

이렇게 바꿔주세요.

```ts
      const childSum = existing.kdcRules.reduce((sum, r) => sum + r.maxLoanCount, 0);
      if (next < childSum) {
        throw new BadRequestException(
          `하위 KDC 규칙의 대출 가능 권수 합계(${childSum}권)보다 작게 설정할 수 없습니다.`,
        );
      }
```

### 2. KDC 하위 규칙을 새로 추가할 때, 합계 검사 추가하기

아래 부분을 찾으세요.

```ts
    if (maxLoanCount > materialType.maxLoanCount) {
      throw new BadRequestException(
        `상위 자료(${materialType.nameKo})의 대출 가능 권수(${materialType.maxLoanCount}권)보다 크게 설정할 수 없습니다.`,
      );
    }
    try {
      return await this.prisma.bookKdcRule.create({
        data: { libraryId, materialTypeId, kdcPrefix, label, maxLoanCount },
      });
```

이렇게 바꿔주세요. (기존 siblings 합계 + 새로 추가하는 값을 더해서, 상위 자료의 대출 가능 권수를 넘지 않는지 확인하는 부분이 추가됩니다.)

```ts
    if (maxLoanCount > materialType.maxLoanCount) {
      throw new BadRequestException(
        `상위 자료(${materialType.nameKo})의 대출 가능 권수(${materialType.maxLoanCount}권)보다 크게 설정할 수 없습니다.`,
      );
    }

    const siblingRules = await this.prisma.bookKdcRule.findMany({
      where: { materialTypeId },
      select: { maxLoanCount: true },
    });
    const siblingSum = siblingRules.reduce((sum, r) => sum + r.maxLoanCount, 0);
    const totalWithNew = siblingSum + maxLoanCount;
    if (totalWithNew > materialType.maxLoanCount) {
      throw new BadRequestException(
        `KDC 하위 규칙들의 대출 가능 권수 합계(${totalWithNew}권)가 상위 자료(${materialType.nameKo})의 대출 가능 권수(${materialType.maxLoanCount}권)보다 많습니다.`,
      );
    }

    try {
      return await this.prisma.bookKdcRule.create({
        data: { libraryId, materialTypeId, kdcPrefix, label, maxLoanCount },
      });
```

### 3. KDC 하위 규칙을 수정할 때도, 합계 검사 추가하기

아래 부분을 찾으세요.

```ts
      if (existing.materialType.maxLoanCount !== null && next > existing.materialType.maxLoanCount) {
        throw new BadRequestException(
          `상위 자료(${existing.materialType.nameKo})의 대출 가능 권수(${existing.materialType.maxLoanCount}권)보다 크게 설정할 수 없습니다.`,
        );
      }
      maxLoanCount = next;
    }
    try {
      return await this.prisma.bookKdcRule.update({
        where: { id },
        data: { kdcPrefix, label, maxLoanCount },
      });
```

이렇게 바꿔주세요. (수정하는 규칙 자신을 뺀 나머지 규칙들의 합계 + 새로 입력한 값을 더해서, 상위 자료의 대출 가능 권수를 넘지 않는지 확인하는 부분이 추가됩니다.)

```ts
      if (existing.materialType.maxLoanCount !== null && next > existing.materialType.maxLoanCount) {
        throw new BadRequestException(
          `상위 자료(${existing.materialType.nameKo})의 대출 가능 권수(${existing.materialType.maxLoanCount}권)보다 크게 설정할 수 없습니다.`,
        );
      }

      if (existing.materialType.maxLoanCount !== null) {
        const siblingRules = await this.prisma.bookKdcRule.findMany({
          where: { materialTypeId: existing.materialTypeId, id: { not: id } },
          select: { maxLoanCount: true },
        });
        const siblingSum = siblingRules.reduce((sum, r) => sum + r.maxLoanCount, 0);
        const totalWithNext = siblingSum + next;
        if (totalWithNext > existing.materialType.maxLoanCount) {
          throw new BadRequestException(
            `KDC 하위 규칙들의 대출 가능 권수 합계(${totalWithNext}권)가 상위 자료(${existing.materialType.nameKo})의 대출 가능 권수(${existing.materialType.maxLoanCount}권)보다 많습니다.`,
          );
        }
      }

      maxLoanCount = next;
    }
    try {
      return await this.prisma.bookKdcRule.update({
        where: { id },
        data: { kdcPrefix, label, maxLoanCount },
      });
```

파일을 저장하세요.

**바뀐 점 요약**

- `createKdcRule()`: 새 규칙을 추가하기 전에, 기존 규칙들의 대출 가능 권수 합계 + 새 규칙의 대출 가능 권수를 계산해서 상위 자료의 대출 가능 권수를 넘는지 확인합니다.
- `updateKdcRule()`: 규칙을 수정할 때, 자기 자신을 뺀 나머지 규칙들의 합계 + 수정하려는 새 값을 계산해서 상위 자료의 대출 가능 권수를 넘는지 확인합니다.
- `update()`(자료 종류 수정, "도서"의 대출 가능 권수 자체를 줄이는 경우): "가장 큰 하위 규칙 값보다 작게 줄일 수 없다"에서 "하위 규칙 합계보다 작게 줄일 수 없다"로 기준이 바뀝니다.

---

## 확인하기

1. 백엔드 서버(`npm run start:dev`)를 재시작하세요. (프런트엔드는 이번에 바뀐 것이 없어서 재시작하지 않아도 됩니다.)
2. '설정' → '대출' → "자료별 대출 설정" → "도서" 행의 "KDC 하위 규칙" 버튼을 눌러보세요.
3. "도서"의 대출 가능 권수가 10권인 상태에서, KDC 657을 10권으로 등록해보세요. 정상적으로 등록되는지 확인하세요.
4. 이어서 KDC 200을 2권으로 새로 등록해보세요. 이번에는 합계(10+2=12권)가 상위 자료의 대출 가능 권수(10권)를 넘어서 "KDC 하위 규칙들의 대출 가능 권수 합계(12권)가 상위 자료(도서)의 대출 가능 권수(10권)보다 많습니다" 안내와 함께 저장이 막히는지 확인하세요.
5. 657을 8권으로 수정한 뒤(이러면 657+200 미등록 상태), 다시 200을 2권으로 등록해보세요. 이번에는 합계가 10권으로 상위 자료와 같아서 정상 저장되는지 확인하세요.
6. 657을 9권으로 수정해보세요. (657: 9권 + 200: 2권 = 11권으로 상위 자료 10권을 넘습니다.) 저장이 막히는지 확인하세요. 657을 8권으로 되돌리면 다시 저장되는지 확인하세요.
7. "도서"의 대출 가능 권수를 10권에서 9권으로 낮춰보세요. (현재 하위 규칙 합계가 8+2=10권이라면) "하위 KDC 규칙의 대출 가능 권수 합계(10권)보다 작게 설정할 수 없습니다" 안내와 함께 막히는지 확인하세요. 합계와 같은 10권으로는 그대로 유지되는지도 확인하세요.

---

## GitHub 커밋

모든 확인이 끝났다면 아래 명령어로 변경 내용을 저장하세요.

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선39: KDC 하위 규칙 대출 가능 권수 합계가 상위 자료를 넘지 않도록 검증 추가"
git push
```

---

## 최종 점검표

- [ ] `material-types.service.ts`의 `update()`에서 "가장 큰 값" 기준을 "합계" 기준으로 바꿨다.
- [ ] `createKdcRule()`에 합계 검증을 추가했다.
- [ ] `updateKdcRule()`에 합계 검증을 추가했다.
- [ ] KDC 하위 규칙을 새로 추가할 때, 합계가 상위 자료의 대출 가능 권수를 넘으면 저장이 막힌다.
- [ ] KDC 하위 규칙을 수정할 때도 마찬가지로 막힌다.
- [ ] 합계가 상위 자료와 정확히 같을 때는 정상 저장된다.
- [ ] 변경 내용을 GitHub에 커밋 및 푸시했다.
