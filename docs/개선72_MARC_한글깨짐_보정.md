# 개선72 - KOLIS-NET에서 가져온 MARC 정보 중 한글이 깨지는 문제 보정

## 목표

'자료 등록'에서 KOLIS-NET 검색 결과를 가져올 때, 245번 태그(서명)부터 한글/일본어가 포함된
태그들이 이상한 글자로 깨져서 불러와지는 문제를 고칩니다.

### 왜 이런 문제가 생겼나요?

MARC 원본 데이터는 "몇 번째 글자부터 몇 글자를 읽어라"라고 적힌 목차(디렉토리)를 먼저 읽고,
그 위치 그대로 잘라서 각 태그의 내용을 가져오는 방식으로 되어 있습니다.

그런데 KOLIS-NET이 이 목차의 위치 숫자를 예전 방식(한글 1글자 = 2바이트, EUC-KR)으로
계산해 둔 채로, 실제 내용물은 요즘 표준 방식(한글 1글자 = 3바이트, UTF-8)으로 바꿔서
보내주고 있는 것으로 보입니다. 그래서 한글이 섞여 있지 않은 001~100번대 태그는 문제없이
읽히다가, 한글이 본격적으로 등장하는 245번 태그부터 "계산된 위치"와 "진짜 위치"가 어긋나기
시작하고, 태그가 뒤로 갈수록(300, 500, 653, 700...) 어긋남이 계속 쌓여서 점점 더 심하게
깨지는 것입니다.

### 어떻게 고치나요?

목차에 적힌 숫자 위치를 더 이상 믿지 않고, 대신 원본 데이터 안에 실제로 들어있는
"필드 구분 문자"(FT, 화면에는 안 보이는 특수 문자)를 기준으로 내용을 순서대로 나눠서,
목차에 적힌 태그 이름과 하나씩 순서대로 짝지어주는 방식으로 바꿉니다.

이 구분 문자는 한글이 몇 바이트로 인코딩되든 상관없이 항상 고정된 하나의 문자이기 때문에,
인코딩이 무엇이든 흔들리지 않고 정확하게 각 태그의 경계를 찾아낼 수 있습니다.

---

## 1. `backend/src/materials/marc.util.ts` 수정하기

파일 아래쪽에 있는 `parseIso2709` 함수 전체를 찾아서, 아래처럼 통째로 바꿔주세요.

**찾을 코드 (전체를 지워주세요):**

```ts
export function parseIso2709(buf: Buffer): MarcField[] {
  const FT = "\x1e"; // 필드 구분자
  const US = "\x1f"; // 서브필드 구분자

  // 바이트 하나 = 글자 하나(latin1)로 그대로 옮겨서, 위치 계산이 바이트 단위와 정확히 맞도록 합니다.
  // (한글이 섞여도 여기서는 아직 "해석"하지 않고 바이트 개수만 다루는 것이 핵심이에요.)
  let raw = buf.toString("latin1");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const dirEnd = raw.indexOf(FT, 24);
  if (dirEnd === -1) return [];

  const directory = raw.substring(24, dirEnd);
  const dataArea = raw.substring(dirEnd + 1);

  // latin1로 옮겨둔 조각을 진짜 한글(UTF-8)로 되돌리는 함수. 실제 "내용"을 읽을 때만 이걸 씁니다.
  const toUtf8 = (s: string) => Buffer.from(s, "latin1").toString("utf8");

  const fields: MarcField[] = [];

  for (let i = 0; i + 12 <= directory.length; i += 12) {
    const entry = directory.substring(i, i + 12);
    const tag = entry.substring(0, 3);
    const length = parseInt(entry.substring(3, 7), 10);
    const start = parseInt(entry.substring(7, 12), 10);
    if (!tag || Number.isNaN(length) || Number.isNaN(start)) continue;

    let content = dataArea.substr(start, length);
    if (content.endsWith(FT)) content = content.slice(0, -1);

    if (tag.startsWith("00")) {
      fields.push({ tag, ind1: " ", ind2: " ", value: toUtf8(content) });
    } else {
      const ind1 = content.charAt(0) || " ";
      const ind2 = content.charAt(1) || " ";
      const subfieldsRaw = content.substring(2);
      const value = subfieldsRaw
        .split(US)
        .filter((part) => part.length > 0)
        .map((part) => "▼" + toUtf8(part))
        .join("");
      fields.push({ tag, ind1, ind2, value });
    }
  }

  return fields;
}
```

**바꿀 코드 (이걸로 채워주세요):**

```ts
export function parseIso2709(buf: Buffer): MarcField[] {
  const FT = "\x1e"; // 필드 구분자
  const US = "\x1f"; // 서브필드 구분자

  // 바이트 하나 = 글자 하나(latin1)로 그대로 옮겨서, 위치 계산이 바이트 단위와 정확히 맞도록 합니다.
  // (한글이 섞여도 여기서는 아직 "해석"하지 않고 바이트 개수만 다루는 것이 핵심이에요.)
  let raw = buf.toString("latin1");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const dirEnd = raw.indexOf(FT, 24);
  if (dirEnd === -1) return [];

  const directory = raw.substring(24, dirEnd);
  const dataArea = raw.substring(dirEnd + 1);

  // latin1로 옮겨둔 조각을 진짜 한글(UTF-8)로 되돌리는 함수. 실제 "내용"을 읽을 때만 이걸 씁니다.
  const toUtf8 = (s: string) => Buffer.from(s, "latin1").toString("utf8");

  // 목차(directory)에서는 "태그 이름이 어떤 순서로 나오는지"만 사용합니다.
  // 목차에 적힌 시작 위치/길이 숫자는 KOLIS-NET이 원본 인코딩(EUC-KR 등) 기준 바이트 수로
  // 계산해 둔 값인데, 실제로 우리에게 오는 내용물은 UTF-8로 다시 인코딩되어 있어서
  // 한글이 나오는 순간부터 "숫자로 계산한 위치"와 "진짜 위치"가 어긋납니다.
  // (이게 245번 태그부터 깨지던 원인입니다.)
  const tags: string[] = [];
  for (let i = 0; i + 12 <= directory.length; i += 12) {
    const entry = directory.substring(i, i + 12);
    const tag = entry.substring(0, 3);
    if (tag) tags.push(tag);
  }

  // 숫자 위치를 믿는 대신, 실제 내용물을 필드 구분자(FT)로 그대로 나눠서
  // 위에서 뽑은 태그 순서와 하나씩 순서대로 짝지어줍니다.
  // FT/US는 한글이 몇 바이트로 인코딩되든 상관없이 항상 고정된 특수 문자이기 때문에,
  // 이 방법은 인코딩이 무엇이든 흔들리지 않고 정확하게 각 태그의 경계를 찾아냅니다.
  const rawContents = dataArea.split(FT);
  // 맨 끝 조각은 레코드 종결 문자(RT, \x1d)만 남은 빈 조각이라 버립니다.
  if (rawContents.length && rawContents[rawContents.length - 1].replace(/\x1d/g, "") === "") {
    rawContents.pop();
  }

  const fields: MarcField[] = [];

  tags.forEach((tag, idx) => {
    let content = rawContents[idx];
    if (content === undefined) return; // 혹시 개수가 안 맞으면 그 태그는 건너뜁니다.
    content = content.replace(/\x1d$/, ""); // 혹시 마지막 필드 끝에 RT가 붙어 있으면 제거

    if (tag.startsWith("00")) {
      fields.push({ tag, ind1: " ", ind2: " ", value: toUtf8(content) });
    } else {
      const ind1 = content.charAt(0) || " ";
      const ind2 = content.charAt(1) || " ";
      const subfieldsRaw = content.substring(2);
      const value = subfieldsRaw
        .split(US)
        .filter((part) => part.length > 0)
        .map((part) => "▼" + toUtf8(part))
        .join("");
      fields.push({ tag, ind1, ind2, value });
    }
  });

  return fields;
}
```

바뀐 점을 요약하면:
- 목차의 숫자(시작 위치, 길이)는 더 이상 각 태그의 내용을 잘라내는 데 사용하지 않습니다. 대신
  태그 이름들이 어떤 순서로 나열되어 있는지만 사용합니다.
- 실제 내용은 원본 데이터 안의 필드 구분 문자(FT)를 기준으로 통째로 나눈 뒤, 나눠진 순서대로
  목차의 태그 이름과 짝지어줍니다. 이렇게 하면 한글이 몇 바이트로 인코딩되어 오든 상관없이
  항상 정확한 경계에서 내용이 잘립니다.

이 함수 위/아래의 다른 함수(`sub`, `clean`, `extractColumns` 등)는 전혀 손댈 필요가 없습니다.

---

## 확인하기

1. 파일을 저장합니다.
2. 백엔드 서버를 재시작합니다 (터미널에서 `Ctrl+C`로 종료 후 다시 `npm run start:dev` 등 평소
   사용하시는 명령으로 실행).
3. '자료 등록' 메뉴에서 이번에 문제가 있었던 DVD 자료(또는 한글이 많이 포함된 다른 자료)를
   KOLIS-NET에서 다시 검색해서 '이 자료 가져오기'를 눌러 봅니다.
4. 245번 태그부터 이어지는 서명, 발행사항, 형태사항, 일반주기, 주제어, 부저자 등의 내용이
   깨지지 않고 정상적인 한글/일본어로 잘 나오는지 확인합니다.
5. 혹시 모르니 한글이 거의 없는 간단한 자료(영어 원서 등)도 하나 검색해서, 기존처럼 잘
   불러와지는지 함께 확인해 주세요.

---

## GitHub 커밋

작업이 잘 확인되면 아래 명령을 순서대로 실행해서 GitHub에 저장해 주세요.

```
cd C:\projects\LibraryNearMe
git add backend/src/materials/marc.util.ts
git commit -m "개선72: KOLIS-NET MARC 파싱 시 한글 깨짐 보정 (필드구분자 기준 파싱)"
git push
```

---

## 최종 점검표

- [ ] `backend/src/materials/marc.util.ts`의 `parseIso2709` 함수를 통째로 교체했다
- [ ] 백엔드 서버를 재시작했다
- [ ] 한글이 많은 DVD/도서 자료를 KOLIS-NET에서 다시 검색해서 245번 이후 태그가 깨지지 않고
      잘 나오는 것을 확인했다
- [ ] 한글이 거의 없는 자료도 기존처럼 잘 불러와지는 것을 확인했다
- [ ] GitHub에 커밋 및 푸시했다
