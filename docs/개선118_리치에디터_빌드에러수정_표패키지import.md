# 개선118 - 리치 텍스트 에디터 빌드 에러 수정 (표 기능 import 오류)

## 목표

개선117 적용 후 글쓰기 화면에서 발생한 빌드 에러를 고칩니다.

**원인**: `@tiptap/extension-table` 패키지가 최근 버전(v3)으로 업데이트되면서, 이 패키지 안에 표(테이블) 관련 기능이 전부 통합되었습니다. 그러면서 예전에는 있던 "기본 내보내기(default export)"가 없어지고, `Table`이라는 이름으로 꺼내 쓰는 방식(named export)으로 바뀌었습니다. 개선117 가이드에서 안내드린 `import Table from "@tiptap/extension-table";` 부분이 이 바뀐 방식과 맞지 않아서 에러가 난 것입니다.

`TableRow`, `TableHeader`, `TableCell`, `Underline`, `Image`, `Link`, `Color`, `FontFamily`는 이런 문제가 없으니 그대로 두시면 됩니다. **딱 한 줄만 고치면 됩니다.**

---

## 1단계: import 문 한 줄 고치기

`frontend/src/components/rich-text-editor.tsx` 파일을 엽니다.

파일 위쪽에서 아래 줄을 찾습니다(Ctrl+F로 "extension-table\"" 검색).

찾기:
```tsx
import Table from "@tiptap/extension-table";
```

교체:
```tsx
import { Table } from "@tiptap/extension-table";
```

저장합니다. 이게 전부입니다.

---

## 확인하기

1. 프론트엔드 서버를 재시작합니다. (Turbopack 개발 서버라면 저장만 해도 자동으로 다시 빌드됩니다.)
2. 관리자 페이지에서 아무 게시판이나 '+ 글쓰기'를 눌러서, 이전처럼 빌드 에러 화면 없이 글쓰기 화면이 정상적으로 열리는지 확인합니다.
3. 개선117에서 확인했던 항목들(글꼴, 색상, 링크, 이모티콘, 표 삽입/행렬 추가삭제/셀 병합분할)이 모두 정상 동작하는지 다시 한번 확인합니다.

---

## GitHub 커밋

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "리치 텍스트 에디터 빌드 에러 수정 (표 기능 import 방식 수정)"
git push
```

---

## 최종 점검표

- [ ] `rich-text-editor.tsx`의 `Table` import를 `import { Table } from "@tiptap/extension-table";`로 고쳤다
- [ ] 글쓰기 화면이 에러 없이 열린다
- [ ] 표 삽입 등 개선117의 모든 기능이 정상 동작한다
- [ ] GitHub에 커밋하고 푸시했다

이제 원래 계획대로 4단계(댓글 기능)로 이어가겠습니다.
