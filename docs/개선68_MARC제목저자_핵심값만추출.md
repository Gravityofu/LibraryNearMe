# 개선 68: MARC에서 제목/저자를 가져올 때 불필요한 문구·문장부호 없애기

## 목표

KOLIS-NET에서 자료를 가져와 저장하면, '목록' 화면에는 제목이 "비행운 :"처럼 끝에 콜론(`:`)이 붙어서 나오고, 저자는 "지은이: 김애란"처럼 역할을 나타내는 말이 붙어서 나옵니다.

원인은 MARC 원본의 서지 작성 규칙(ISBD 구두점 규칙) 때문입니다. MARC 245 태그의 서브필드 `▼a`(표제)는 원래 그 뒤에 부제목이나 저자 표시가 이어진다는 뜻으로 문장부호(콜론 등)가 붙어 있는 경우가 많고, 저자 태그(100)가 따로 없는 자료는 245의 `▼d`(책임표시) 값을 대신 쓰는데, 이 값은 "지은이: 김애란"처럼 사람이 읽으라고 쓴 자유 문장이라 역할을 나타내는 말이 그대로 포함되어 있습니다.

이번에는 제목 끝에 남는 문장부호(`:` `;` `/` `,` 등)를 없애고, 저자 앞에 붙는 "지은이", "지음", "글", "그림" 같은 흔한 역할 표시 문구를 없애서, 제목엔 "비행운"만, 저자엔 "김애란"만 남도록 고칩니다.

(다만 MARC 원본 문구는 도서관마다, 자료마다 조금씩 다르게 쓰여 있을 수 있어서, 아주 드물게 예상치 못한 형태의 문구는 완전히 걸러지지 않을 수도 있습니다. 흔히 쓰이는 표현들 위주로 정리하는 것으로 이해해주세요.)

---

## 백엔드 수정하기: `marc.util.ts`

`C:\projects\LibraryNearMe\backend\src\materials\marc.util.ts` 파일을 여세요.

### 1. 문장부호와 역할 표시 문구를 정리해주는 도구 함수 추가하기

아래 부분을 찾으세요.

```ts
// value에서 ▼표시를 걷어내고 사람이 읽기 좋은 한 줄로 만듭니다. (형태사항 300 등에 사용)
export function clean(value: string): string {
  if (!value) return "";
  return value
    .split("▼")
    .map((p) => p.slice(1).trim()) // 맨 앞 글자(서브필드 코드) 제거
    .filter(Boolean)
    .join(" ")
    .trim();
}
```

이렇게 바꿔주세요.

```ts
// value에서 ▼표시를 걷어내고 사람이 읽기 좋은 한 줄로 만듭니다. (형태사항 300 등에 사용)
export function clean(value: string): string {
  if (!value) return "";
  return value
    .split("▼")
    .map((p) => p.slice(1).trim()) // 맨 앞 글자(서브필드 코드) 제거
    .filter(Boolean)
    .join(" ")
    .trim();
}

// 끝에 남아있는 문장부호(콜론, 세미콜론, 슬래시, 쉼표 등)와 공백을 없앱니다.
// 예: "비행운 :" -> "비행운"
function stripTrailingPunct(value?: string): string | undefined {
  if (!value) return value;
  const cleaned = value.replace(/[\s:：;,\/]+$/g, "").trim();
  return cleaned || undefined;
}

// 맨 앞에 "지은이", "지음"처럼 역할을 나타내는 흔한 말이 붙어 있으면 떼어냅니다.
// 예: "지은이: 김애란" -> "김애란"
function stripRoleLabel(value?: string): string | undefined {
  if (!value) return value;
  const cleaned = value
    .replace(/^(지은이|지음|글쓴이|저자|엮은이|엮음|편저|편|옮긴이|옮김|그림|글)\s*[:：]?\s*/, "")
    .trim();
  return cleaned || undefined;
}
```

### 2. 제목/저자를 뽑을 때 이 도구 함수들을 적용하기

아래 부분을 찾으세요.

```ts
  return {
    title: one("245", "a"),                    // 서명
    creator: one("100", "a") || one("245", "d"), // 저자(100 없으면 245 ▼d)
```

이렇게 바꿔주세요.

```ts
  return {
    title: stripTrailingPunct(one("245", "a")),                                    // 서명
    creator: stripTrailingPunct(stripRoleLabel(one("100", "a") || one("245", "d"))), // 저자(100 없으면 245 ▼d)
```

파일을 저장하세요.

---

## 확인하기

1. 백엔드 서버를 재시작하세요. (`npm run start:dev`)
2. '자료 등록' 화면에서 KOLIS-NET으로 새로운 자료(예: 다른 책)를 검색해서 저장해보세요. '목록' 화면에서 제목과 저자에 불필요한 문장부호나 역할 문구 없이 핵심 값만 나오는지 확인하세요.
3. 이미 저장해두신 '비행운' 자료를 다시 열어서(자료 등록 화면이 아니라, '목록'에서 그 자료를 클릭해 들어가는 MARC 편집 화면), 내용을 바꾸지 않고 그대로 다시 저장해보세요. (저장 시 제목/저자 칸이 새 규칙으로 다시 계산되어 저장됩니다.) '목록'으로 돌아와서 "비행운"만, "김애란"만 나오는지 확인하세요.
4. 저자 태그(100)가 있는 자료와 없는 자료(245 ▼d로 대신하는 자료) 모두 정상적으로 정리되는지 확인하세요.

---

## GitHub 커밋

모든 확인이 끝났다면 아래 명령어로 변경 내용을 저장하세요.

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선68: MARC에서 제목/저자를 추출할 때 불필요한 문장부호와 역할 표시 문구 제거"
git push
```

---

## 최종 점검표

- [ ] `stripTrailingPunct`, `stripRoleLabel` 도구 함수를 추가했다.
- [ ] `title`, `creator`를 뽑을 때 이 함수들을 적용했다.
- [ ] 새로 등록하는 자료의 제목/저자가 깔끔하게 나온다.
- [ ] 기존 자료도 다시 저장하면 깔끔하게 정리된다.
- [ ] 변경 내용을 GitHub에 커밋 및 푸시했다.
