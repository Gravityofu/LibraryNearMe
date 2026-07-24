# 14단계 (1) — "설정" 메뉴: KORMARC 태그 관리 (백엔드)

> 목표: 관리자 페이지에 새로 만들 "설정" 화면에서 쓸 KORMARC 태그 데이터를
> 데이터베이스 표로 만들고, 조회·추가·수정할 수 있는 API를 만듭니다.
> 보내주신 엑셀 파일의 태그 58개를 기본값으로 자동으로 채워 넣어요.
> 소요 시간: 약 25분

---

## 오늘 만드는 것 (그림으로)

```
[설정 메뉴] → [KORMARC 태그 탭]
┌───────────────────────────────────────┐
│ 태그   필드명        지시기호   식별기호  예시  [수정] │
│ 001   제어번호        ...       ...     ...  [수정]  │
│ 245   표제와 책임표시  ...       ...     ...  [수정]  │
│ ...                                    [+ 새 태그 추가]│
└───────────────────────────────────────┘
```

- 이 표의 데이터는 도서관마다 따로 관리돼요(다른 도서관 자료 표들처럼 `libraryId`로 구분).
- 화면을 처음 열 때 표가 비어있으면, 보내주신 엑셀의 태그 58개를 자동으로 한 번 채워 넣어요. 그다음부터는 직접 수정하거나 새 태그를 추가하면 됩니다.
- 오늘은 백엔드(데이터베이스 + API)만 만들고, 화면은 다음 단계(14-2)에서 만들어요.

준비: backend 서버를 켜두세요.

---

## 1. 데이터베이스에 태그 표 추가 — 약 5분

`backend/prisma/schema.prisma` 를 엽니다. 맨 아래(마지막 `model` 블록 다음)에 새 모델을 추가하세요.

```prisma
model KormarcTag {
  id            Int      @id @default(autoincrement())
  libraryId     Int
  tag           String
  fieldName     String
  indicators    String?
  subfieldCodes String?
  example       String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([libraryId, tag])
}
```

- `tag`: "001", "245"처럼 태그 번호(또는 "리더"·"디렉토리"처럼 특수 항목)
- `fieldName`: 태그 이름 (예: "표제와 책임표시사항")
- `indicators`: 지시기호 설명
- `subfieldCodes`: 주요 식별기호 및 의미
- `example`: 예시
- `@@unique([libraryId, tag])`: 같은 도서관 안에서 같은 태그를 두 번 등록하지 못하게 막는 규칙이에요.

저장한 뒤, backend 폴더에서 마이그레이션을 실행합니다.

```
cd C:\projects\LibraryNearMe\backend
npx prisma migrate dev --name kormarc_tag
```

✅ **확인하기**: `Your database is now in sync with your schema`가 나오면 성공.

---

## 2. 기본 태그 데이터 파일 만들기 — 약 5분

보내주신 엑셀의 태그 58개를 코드로 옮겨뒀어요. `backend/src` 안에 **`settings`** 폴더를 새로 만들고, 그 안에 **`kormarc-tags.default.ts`** 파일을 만들어 아래 내용 전체를 붙여넣으세요. (양이 많지만 통째로 복사하시면 됩니다.)

```typescript
export const DEFAULT_KORMARC_TAGS = [
  {
    "tag": "리더",
    "fieldName": "리더 (Leader)",
    "indicators": "지시기호 사용하지 않음 (제어필드)",
    "subfieldCodes": "제어필드 (식별기호 없음, 위치기반 고정길이 데이터)",
    "example": "01004nam a2200277 c 4500"
  },
  {
    "tag": "디렉토리",
    "fieldName": "디렉토리 (Directory)",
    "indicators": "지시기호 사용하지 않음 (제어필드)",
    "subfieldCodes": "제어필드 (식별기호 없음, 시스템 자동 생성)",
    "example": "001001400000003001300014..."
  },
  {
    "tag": "001",
    "fieldName": "제어번호",
    "indicators": "지시기호 사용하지 않음 (고정길이 제어필드)",
    "subfieldCodes": "제어필드 (식별기호 없음)",
    "example": "KMO202212345 (자관 시스템 제어번호)"
  },
  {
    "tag": "003",
    "fieldName": "제어번호 식별기호",
    "indicators": "지시기호 사용하지 않음 (고정길이 제어필드)",
    "subfieldCodes": "제어필드 (식별기호 없음)",
    "example": "KNL (국립중앙도서관 부호)"
  },
  {
    "tag": "005",
    "fieldName": "최종 처리일시",
    "indicators": "지시기호 사용하지 않음 (고정길이 제어필드)",
    "subfieldCodes": "제어필드 (식별기호 없음)",
    "example": "20231024153000.0"
  },
  {
    "tag": "007",
    "fieldName": "형태기술필드",
    "indicators": "지시기호 사용하지 않음 (고정길이 제어필드)",
    "subfieldCodes": "제어필드 (식별기호 없음)",
    "example": "ta (텍스트 자료 부호)"
  },
  {
    "tag": "008",
    "fieldName": "부호화정보필드",
    "indicators": "지시기호 사용하지 않음 (고정길이 제어필드)",
    "subfieldCodes": "제어필드 (식별기호 없음)",
    "example": "220101s2022    ko            000 0 kor d"
  },
  {
    "tag": "010",
    "fieldName": "미국의회도서관 제어번호",
    "indicators": "지시기호 사용하지 않음 (대부분 미정의, 특수태그 제외)",
    "subfieldCodes": "▼a LC 제어번호, ▼z 취소/무효 번호",
    "example": "▼a (식별/제어/분류 부호 입력)"
  },
  {
    "tag": "012",
    "fieldName": "국립중앙도서관 제어번호",
    "indicators": "지시기호 사용하지 않음 (대부분 미정의, 특수태그 제외)",
    "subfieldCodes": "▼a 국립중앙도서관 제어번호",
    "example": "▼a (식별/제어/분류 부호 입력)"
  },
  {
    "tag": "020",
    "fieldName": "국제표준도서번호",
    "indicators": "지시기호 사용하지 않음 (제1, 2지시기호 모두 미정의)",
    "subfieldCodes": "▼a 국제표준도서번호(ISBN), ▼c 입수조건(가격), ▼z 취소/무효 ISBN",
    "example": "▼a 9788936434120"
  },
  {
    "tag": "022",
    "fieldName": "국제표준연속간행물번호",
    "indicators": "지시기호 사용하지 않음 (제1, 2지시기호 모두 미정의)",
    "subfieldCodes": "▼a 국제표준연속간행물번호(ISSN), ▼y 잘못된 ISSN, ▼z 취소된 ISSN",
    "example": "▼a 1225-3006"
  },
  {
    "tag": "040",
    "fieldName": "목록작성기관",
    "indicators": "지시기호 사용하지 않음 (대부분 미정의, 특수태그 제외)",
    "subfieldCodes": "▼a 원목록작성기관, ▼b 목록작성언어, ▼c 입력기관, ▼e 기술규칙",
    "example": "▼a KNL ▼b kor ▼c KNL"
  },
  {
    "tag": "041",
    "fieldName": "언어부호",
    "indicators": "제1지시기호: 0(원작 아님), 1(번역물/원작포함) / 제2지시기호: 미정의",
    "subfieldCodes": "▼a 본문/음향/번역물 언어, ▼h 원본 언어, ▼b 요약/초록 언어",
    "example": "▼a kor ▼h eng"
  },
  {
    "tag": "052",
    "fieldName": "국립중앙도서관 청구기호",
    "indicators": "지시기호 사용하지 않음 (대부분 미정의, 특수태그 제외)",
    "subfieldCodes": "▼a 기본 데이터 (기타 식별기호는 해당 표준 참조)",
    "example": "▼a 813.7"
  },
  {
    "tag": "055",
    "fieldName": "지리분류기호",
    "indicators": "지시기호 사용하지 않음 (대부분 미정의, 특수태그 제외)",
    "subfieldCodes": "▼a 기본 데이터 (기타 식별기호는 해당 표준 참조)",
    "example": "▼a (식별/제어/분류 부호 입력)"
  },
  {
    "tag": "056",
    "fieldName": "한국십진분류기호",
    "indicators": "지시기호 사용하지 않음 (제1, 2지시기호 모두 미정의)",
    "subfieldCodes": "▼a 한국십진분류기호(KDC), ▼2 판차",
    "example": "▼a 813.7"
  },
  {
    "tag": "080",
    "fieldName": "국제십진분류기호",
    "indicators": "지시기호 사용하지 않음 (대부분 미정의, 특수태그 제외)",
    "subfieldCodes": "▼a 기본 데이터 (기타 식별기호는 해당 표준 참조)",
    "example": "▼a (식별/제어/분류 부호 입력)"
  },
  {
    "tag": "082",
    "fieldName": "듀이십진분류기호",
    "indicators": "제1지시기호: 0(전판), 1(요약판) / 제2지시기호: 0(LC 부여), 4(기타 기관 부여)",
    "subfieldCodes": "▼a 듀이십진분류기호(DDC), ▼2 판차",
    "example": "▼a 895.73"
  },
  {
    "tag": "090",
    "fieldName": "자관 청구기호",
    "indicators": "지시기호 사용하지 않음 (제1, 2지시기호 모두 미정의)",
    "subfieldCodes": "▼a 분류기호, ▼b 도서기호, ▼c 부출기호, ▼v 권호기호",
    "example": "▼a 813.7 ▼b 한15ㅊ"
  },
  {
    "tag": "100",
    "fieldName": "기본표목 - 개인명",
    "indicators": "제1지시기호: 0(이름), 1(성), 3(가족명) / 제2지시기호: 미정의",
    "subfieldCodes": "▼a 개인명, ▼d 생몰년도, ▼e 연관어(역할), ▼q 완전한 이름",
    "example": "▼a 한강"
  },
  {
    "tag": "110",
    "fieldName": "기본표목 - 단체명",
    "indicators": "제1지시기호: 1(관할구역하 표목), 2(직접입력) / 제2지시기호: 미정의",
    "subfieldCodes": "▼a 단체명, ▼b 하위단체명, ▼e 연관어",
    "example": "▼a 국립중앙도서관"
  },
  {
    "tag": "111",
    "fieldName": "기본표목 - 회의명",
    "indicators": "제1지시기호: 1(관할구역하 표목), 2(직접입력) / 제2지시기호: 미정의",
    "subfieldCodes": "▼a 기본표목, ▼d 연대, ▼e 연관어 (태그 성격에 따라 다름)",
    "example": "▼a (기본표목 입력)"
  },
  {
    "tag": "130",
    "fieldName": "기본표목 - 통일표제",
    "indicators": "제1지시기호: 0~9(관사 등 배제 문자 수) / 제2지시기호: 미정의",
    "subfieldCodes": "▼a 통일표제, ▼l 언어",
    "example": "▼a 성경"
  },
  {
    "tag": "240",
    "fieldName": "통일표제",
    "indicators": "제1지시기호: 0(화면출력 안함), 1(화면출력 함) / 제2지시기호: 0~9(배제 문자 수)",
    "subfieldCodes": "▼a 통일표제, ▼l 언어, ▼f 발행년",
    "example": "▼a Hamlet. ▼l Korean"
  },
  {
    "tag": "245",
    "fieldName": "표제와 책임표시사항",
    "indicators": "제1지시기호: 0(표제부출 안함), 1(표제부출 함) / 제2지시기호: 0~9(관사 등 배제 문자 수)",
    "subfieldCodes": "▼a 본표제, ▼b 다음표제(부표제/대등표제), ▼c 책임표시(저자 등), ▼n 권차/회차, ▼p 권명/회명",
    "example": "▼a 채식주의자 : ▼b 연작소설 / ▼d 한강 지음"
  },
  {
    "tag": "246",
    "fieldName": "여러 형태의 표제",
    "indicators": "제1지시기호: 0~3(주기/부출 여부 제어) / 제2지시기호: 0~8(표제 유형 제어)",
    "subfieldCodes": "▼a 본표제(다양형 표제), ▼i 설명구, ▼n 권차/회차, ▼p 권명/회명",
    "example": "▼a Vegetarian"
  },
  {
    "tag": "250",
    "fieldName": "판사항",
    "indicators": "지시기호 사용하지 않음 (제1, 2지시기호 모두 미정의)",
    "subfieldCodes": "▼a 판차/판표시, ▼b 판에 관련된 책임표시",
    "example": "▼a 개정판"
  },
  {
    "tag": "260",
    "fieldName": "발행, 배포, 간사 사항",
    "indicators": "지시기호 사용하지 않음 (제1, 2지시기호 모두 미정의)",
    "subfieldCodes": "▼a 발행지/배포지, ▼b 발행자/배포자, ▼c 발행년/배포년, ▼e 제작지, ▼f 제작자, ▼g 제작년",
    "example": "▼a 파주 : ▼b 창비, ▼c 2022"
  },
  {
    "tag": "300",
    "fieldName": "형태사항",
    "indicators": "지시기호 사용하지 않음 (제1, 2지시기호 모두 미정의)",
    "subfieldCodes": "▼a 자료의 수량 및 특정자료종별(페이지 등), ▼b 기타 형태사항(삽화 등), ▼c 크기, ▼e 딸림자료",
    "example": "▼a 275 p. : ▼b 삽화 ; ▼c 21 cm"
  },
  {
    "tag": "490",
    "fieldName": "총서사항",
    "indicators": "제1지시기호: 0(총서부출 안함), 1(총서부출 함) / 제2지시기호: 미정의",
    "subfieldCodes": "▼a 총서 본표제, ▼x 국제표준연속간행물번호(ISSN), ▼v 권차/회차",
    "example": "▼a (창비소설선 ; ▼v 15)"
  },
  {
    "tag": "500",
    "fieldName": "일반주기",
    "indicators": "지시기호 사용하지 않음 (제1, 2지시기호 모두 미정의)",
    "subfieldCodes": "▼a 일반주기",
    "example": "▼a 부록으로 워크북이 있음"
  },
  {
    "tag": "504",
    "fieldName": "서지 등 주기",
    "indicators": "지시기호 사용하지 않음 (제1, 2지시기호 모두 미정의)",
    "subfieldCodes": "▼a 서지 및 색인 주기",
    "example": "▼a 참고문헌(p. 250-255) 수록"
  },
  {
    "tag": "505",
    "fieldName": "내용주기",
    "indicators": "제1지시기호: 0(완전한 내용), 1(불완전한 내용), 2(부분적 내용) / 제2지시기호: 미정의 또는 0(기본)",
    "subfieldCodes": "▼a 내용주기(목차), ▼t 표제, ▼r 책임표시",
    "example": "▼a 제1부. 채식주의자 -- 제2부. 몽고반점"
  },
  {
    "tag": "520",
    "fieldName": "요약 등 주기",
    "indicators": "제1지시기호: 0(주제), 1(복습), 2(범위와 내용), 3(초록) / 제2지시기호: 미정의",
    "subfieldCodes": "▼a 요약 또는 초록 텍스트, ▼c 관련 정보원",
    "example": "▼a 육식을 거부하는 영혜를 둘러싼 이야기"
  },
  {
    "tag": "600",
    "fieldName": "주제명부출표목 - 개인명",
    "indicators": "제1지시기호: 0(이름), 1(성), 3(가족명) / 제2지시기호: 0~7(주제명표목표 출처 표시)",
    "subfieldCodes": "▼a 개인명(주제), ▼d 생몰년도, ▼x 일반세분, ▼y 연대세분, ▼z 지역세분",
    "example": "▼a 이순신, ▼d 1545-1598"
  },
  {
    "tag": "610",
    "fieldName": "주제명부출표목 - 단체명",
    "indicators": "제1지시기호: 1(관할구역하 표목), 2(직접입력) / 제2지시기호: 0~7(주제명표목표 출처 표시)",
    "subfieldCodes": "▼a 주제명/주제어, ▼x 일반세분, ▼y 연대세분, ▼z 지역세분, ▼v 형식세분",
    "example": "▼a (주제명/키워드 등 입력)"
  },
  {
    "tag": "611",
    "fieldName": "주제명부출표목 - 회의명",
    "indicators": "제1지시기호: 명칭 유형 제어 / 제2지시기호: 0~7(주제명표목표 출처)",
    "subfieldCodes": "▼a 주제명/주제어, ▼x 일반세분, ▼y 연대세분, ▼z 지역세분, ▼v 형식세분",
    "example": "▼a (주제명/키워드 등 입력)"
  },
  {
    "tag": "630",
    "fieldName": "주제명부출표목 - 통일표제",
    "indicators": "제1지시기호: 명칭 유형 제어 / 제2지시기호: 0~7(주제명표목표 출처)",
    "subfieldCodes": "▼a 주제명/주제어, ▼x 일반세분, ▼y 연대세분, ▼z 지역세분, ▼v 형식세분",
    "example": "▼a (주제명/키워드 등 입력)"
  },
  {
    "tag": "650",
    "fieldName": "주제명부출표목 - 일반주제명",
    "indicators": "제1지시기호: 미정의 / 제2지시기호: 0~7(주제명표목표 출처 표시, 예: 4=자관부여)",
    "subfieldCodes": "▼a 주제명, ▼x 일반세분, ▼y 연대세분, ▼z 지역세분, ▼v 형식세분",
    "example": "▼a 인공지능"
  },
  {
    "tag": "653",
    "fieldName": "비통제 색인어",
    "indicators": "제1지시기호: 미정의 / 제2지시기호: 미정의 (색인어 제어 정보 등에 따라 다름)",
    "subfieldCodes": "▼a 비통제 색인어(키워드)",
    "example": "▼a 딥러닝"
  },
  {
    "tag": "700",
    "fieldName": "부출표목 - 개인명",
    "indicators": "제1지시기호: 0(이름), 1(성) / 제2지시기호: 미정의 또는 2(분석표출)",
    "subfieldCodes": "▼a 개인명(부출), ▼d 생몰년도, ▼e 연관어(역할), ▼t 저작표제",
    "example": "▼a 김철수, ▼e 번역"
  },
  {
    "tag": "710",
    "fieldName": "부출표목 - 단체명",
    "indicators": "제1지시기호: 1(관할구역), 2(직접입력) / 제2지시기호: 미정의 또는 2(분석표출)",
    "subfieldCodes": "▼a 단체명(부출), ▼b 하위단체명, ▼e 연관어",
    "example": "▼a 한국도서관협회"
  },
  {
    "tag": "711",
    "fieldName": "부출표목 - 회의명",
    "indicators": "제1지시기호: 명칭 유형 제어 / 제2지시기호: 미정의 또는 2(분석표출)",
    "subfieldCodes": "▼a 부출표목(명칭/표제), ▼d 연대, ▼e 연관어, ▼t 저작표제",
    "example": "▼a (부출표목, 연관저록 입력)"
  },
  {
    "tag": "720",
    "fieldName": "부출표목 - 통제되지 않은 이름",
    "indicators": "제1지시기호: 명칭 유형 제어 / 제2지시기호: 미정의 또는 2(분석표출)",
    "subfieldCodes": "▼a 부출표목(명칭/표제), ▼d 연대, ▼e 연관어, ▼t 저작표제",
    "example": "▼a (부출표목, 연관저록 입력)"
  },
  {
    "tag": "730",
    "fieldName": "부출표목 - 통일표제",
    "indicators": "제1지시기호: 0~9(관사 등 배제 문자 수) / 제2지시기호: 미정의 또는 2(분석표출)",
    "subfieldCodes": "▼a 부출표목(명칭/표제), ▼d 연대, ▼e 연관어, ▼t 저작표제",
    "example": "▼a 동의보감"
  },
  {
    "tag": "740",
    "fieldName": "부출표목 - 비통제 관련/분출 표제",
    "indicators": "제1지시기호: 0~9(배제 문자 수) / 제2지시기호: 미정의 또는 2(분석표출)",
    "subfieldCodes": "▼a 비통제 관련표제/분출표제",
    "example": "▼a 몽고반점"
  },
  {
    "tag": "800",
    "fieldName": "총서부출표목 - 개인명",
    "indicators": "지시기호 사용하지 않음 (일부 태그 제외)",
    "subfieldCodes": "▼a 기본 서지정보, ▼v 권차, ▼x ISSN (태그 성격에 따라 다름)",
    "example": "▼a (총서부출, 소장/위치 정보 입력)"
  },
  {
    "tag": "810",
    "fieldName": "총서부출표목 - 단체명",
    "indicators": "지시기호 사용하지 않음 (일부 태그 제외)",
    "subfieldCodes": "▼a 기본 서지정보, ▼v 권차, ▼x ISSN (태그 성격에 따라 다름)",
    "example": "▼a (총서부출, 소장/위치 정보 입력)"
  },
  {
    "tag": "811",
    "fieldName": "총서부출표목 - 회의명",
    "indicators": "지시기호 사용하지 않음 (일부 태그 제외)",
    "subfieldCodes": "▼a 기본 서지정보, ▼v 권차, ▼x ISSN (태그 성격에 따라 다름)",
    "example": "▼a (총서부출, 소장/위치 정보 입력)"
  },
  {
    "tag": "830",
    "fieldName": "총서부출표목 - 통일표제",
    "indicators": "제1지시기호: 미정의 / 제2지시기호: 0~9(관사 등 배제 문자 수)",
    "subfieldCodes": "▼a 총서 통일표제, ▼v 권차/회차, ▼x ISSN",
    "example": "▼a 창비소설선 ; ▼v 15"
  },
  {
    "tag": "856",
    "fieldName": "전자적 위치 및 접속",
    "indicators": "지시기호 사용하지 않음 (일부 태그 제외)",
    "subfieldCodes": "▼u URI(웹주소/링크), ▼z 공중주기(안내문), ▼3 명시된 자료(링크 대상)",
    "example": "▼u http://www.example.com"
  },
  {
    "tag": "900",
    "fieldName": "로컬표목 - 개인명",
    "indicators": "지시기호 사용하지 않음 (자관 로컬시스템 규정에 따라 상이함)",
    "subfieldCodes": "▼a 로컬 개인명",
    "example": "▼a 홍길동 (로컬 개인명)"
  },
  {
    "tag": "910",
    "fieldName": "로컬표목 - 단체명",
    "indicators": "지시기호 사용하지 않음 (자관 로컬시스템 규정에 따라 상이함)",
    "subfieldCodes": "▼a 로컬 정보",
    "example": "▼a (도서관 자체 로컬 정보 입력)"
  },
  {
    "tag": "911",
    "fieldName": "로컬표목 - 회의명",
    "indicators": "지시기호 사용하지 않음 (자관 로컬시스템 규정에 따라 상이함)",
    "subfieldCodes": "▼a 로컬 정보",
    "example": "▼a (도서관 자체 로컬 정보 입력)"
  },
  {
    "tag": "930",
    "fieldName": "로컬표목 - 통일표제",
    "indicators": "지시기호 사용하지 않음 (자관 로컬시스템 규정에 따라 상이함)",
    "subfieldCodes": "▼a 로컬 정보",
    "example": "▼a (도서관 자체 로컬 정보 입력)"
  },
  {
    "tag": "940",
    "fieldName": "로컬표목 - 표제",
    "indicators": "지시기호 사용하지 않음 (자관 로컬시스템 규정에 따라 상이함)",
    "subfieldCodes": "▼a 로컬 정보",
    "example": "▼a (도서관 자체 로컬 정보 입력)"
  },
  {
    "tag": "949",
    "fieldName": "로컬표목 - 총서표제",
    "indicators": "지시기호 사용하지 않음 (자관 로컬시스템 규정에 따라 상이함)",
    "subfieldCodes": "▼a 로컬 정보",
    "example": "▼a (도서관 자체 로컬 정보 입력)"
  },
  {
    "tag": "950",
    "fieldName": "로컬정보 - 가격",
    "indicators": "지시기호 사용하지 않음 (자관 로컬시스템 규정에 따라 상이함)",
    "subfieldCodes": "▼a 로컬 가격정보",
    "example": "▼a 15000"
  }
];
```

---

## 3. 서비스 파일 만들기 — 약 5분

같은 `backend/src/settings` 폴더에 **`kormarc-tags.service.ts`** 파일을 만들어 붙여넣습니다.

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DEFAULT_KORMARC_TAGS } from './kormarc-tags.default';

@Injectable()
export class KormarcTagsService {
  constructor(private prisma: PrismaService) {}

  // 목록 조회. 이 도서관에 태그가 하나도 없으면, 기본 58개를 한 번만 자동으로 채워 넣습니다.
  async list(libraryId: number) {
    const count = await this.prisma.kormarcTag.count({ where: { libraryId } });
    if (count === 0) {
      await this.prisma.kormarcTag.createMany({
        data: DEFAULT_KORMARC_TAGS.map((t) => ({ ...t, libraryId })),
      });
    }
    return this.prisma.kormarcTag.findMany({
      where: { libraryId },
      orderBy: { tag: 'asc' },
    });
  }

  async create(libraryId: number, data: any) {
    if (!data.tag || !String(data.tag).trim()) {
      throw new BadRequestException('태그는 필수입니다.');
    }
    try {
      return await this.prisma.kormarcTag.create({
        data: {
          libraryId,
          tag: String(data.tag).trim(),
          fieldName: data.fieldName || '',
          indicators: data.indicators || undefined,
          subfieldCodes: data.subfieldCodes || undefined,
          example: data.example || undefined,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('이미 등록된 태그입니다.');
      }
      throw e;
    }
  }

  async update(libraryId: number, id: number, data: any) {
    const existing = await this.prisma.kormarcTag.findFirst({
      where: { id, libraryId },
    });
    if (!existing) {
      throw new NotFoundException('태그를 찾을 수 없습니다.');
    }
    return this.prisma.kormarcTag.update({
      where: { id },
      data: {
        tag: data.tag,
        fieldName: data.fieldName,
        indicators: data.indicators || undefined,
        subfieldCodes: data.subfieldCodes || undefined,
        example: data.example || undefined,
      },
    });
  }
}
```

---

## 4. 창구(컨트롤러) 만들기 — 약 3분

같은 `backend/src/settings` 폴더에 **`kormarc-tags.controller.ts`** 파일을 만들어 붙여넣습니다.

```typescript
import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { KormarcTagsService } from './kormarc-tags.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('settings/kormarc-tags')
export class KormarcTagsController {
  constructor(private kormarcTagsService: KormarcTagsService) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() req: any) {
    return this.kormarcTagsService.list(req.user.libraryId);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.kormarcTagsService.create(req.user.libraryId, body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.kormarcTagsService.update(req.user.libraryId, parseInt(id, 10), body);
  }
}
```

이렇게 하면 API 주소는 `GET/POST /settings/kormarc-tags`, `PATCH /settings/kormarc-tags/:id`가 됩니다.

---

## 5. `app.module.ts`에 등록하기 — 약 3분

`backend/src/app.module.ts` 를 엽니다.

**① import 추가** — 파일 맨 위, 다른 `import` 줄들 사이에 추가하세요.

```typescript
import { KormarcTagsController } from './settings/kormarc-tags.controller';
import { KormarcTagsService } from './settings/kormarc-tags.service';
```

**② controllers 배열에 추가** — `controllers: [` 로 시작하는 배열을 찾아서, 맨 끝에(닫는 대괄호 `]` 직전에) `KormarcTagsController,` 를 추가하세요.

**③ providers 배열에 추가** — `providers: [` 로 시작하는 배열을 찾아서, 맨 끝에 `KormarcTagsService,` 를 추가하세요.

(다른 controllers·providers 항목들은 그대로 두고, 딱 이 두 줄만 각 배열 끝에 끼워 넣으시면 됩니다.)

저장하면 backend 서버가 재시작됩니다. 오류 없이 잘 켜지는지 확인하세요.

---

## 6. 확인하기 — 약 5분

브라우저 주소창이나 Postman 대신, 그냥 **다음 단계(14-2)에서 화면을 만들고 나서** 확인하시면 편해요. 지금 확인하고 싶으시면, 로그인 후 아래 방법으로 간단히 볼 수 있어요.

1. F12 개발자 도구 → **콘솔(Console)** 탭에서 아래를 붙여넣고 Enter (토큰은 로그인 후 자동으로 저장돼 있어요):

```js
fetch("http://localhost:3001/settings/kormarc-tags", {
  headers: { Authorization: "Bearer " + localStorage.getItem("token") },
}).then((r) => r.json()).then(console.log);
```

2. 태그 58개가 담긴 배열이 콘솔에 나오면 성공입니다. (Prisma Studio로 `KormarcTag` 표를 열어봐도 확인할 수 있어요: `npx prisma studio`)

✅ 태그 58개가 자동으로 채워졌으면 완성입니다! 🎉

---

## 7. GitHub에 저장하기 — 약 2분

```
cd C:\projects\LibraryNearMe
git status
```

🔒 `.env`가 목록에 없는지 확인한 뒤:

```
git add .
git commit -m "14단계(1): KORMARC 태그 관리 백엔드 (모델+API+기본데이터 자동채움)"
git push
```

---

## 최종 점검표

- [ ] `schema.prisma` — `KormarcTag` 모델 추가, `migrate dev --name kormarc_tag` 성공
- [ ] `settings/kormarc-tags.default.ts` — 기본 태그 58개 데이터 생성
- [ ] `settings/kormarc-tags.service.ts` — list(자동 시드)/create/update 생성
- [ ] `settings/kormarc-tags.controller.ts` — GET/POST/PATCH 라우트 생성
- [ ] `app.module.ts`에 컨트롤러·서비스 등록
- [ ] 콘솔이나 Prisma Studio로 태그 58개 자동 채움 확인
- [ ] GitHub에 올림

---

## 다음 단계 예고 — 14단계 (2): 설정 화면 + 사이드바

이제 이 데이터를 볼 수 있는 화면을 만들어요. 관리자 사이드바 맨 아래에 "설정" 메뉴를 추가하고, Tabs로 구분된 설정 화면 안에 "KORMARC 태그" 탭을 만들어서 표로 보여주고, 수정·추가도 할 수 있게 만듭니다. 완료되면 알려주세요!
