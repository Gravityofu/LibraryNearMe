# 개선119 - 리치 텍스트 에디터 빌드 에러 수정 (글자 스타일 기능 import 오류)

## 목표

개선118 적용 후에도 남아있던 빌드 에러를 고칩니다.

**원인**: 개선118과 똑같은 이유입니다. `@tiptap/extension-text-style` 패키지도 최근 버전(v3)에서 "기본 내보내기(default export)"가 없어지고, `TextStyle`이라는 이름으로 꺼내 쓰는 방식(named export)으로 바뀌었습니다. 개선117 가이드에서 안내드린 `import TextStyle from "@tiptap/extension-text-style";` 부분이 이 바뀐 방식과 맞지 않아서 에러가 난 것입니다.

이번에도 확인해보니 `Color`, `FontFamily`, `Underline`, `Image`, `Link`, `StarterKit`은 전부 예전 방식(default export)을 그대로 지원하고 있어서 문제가 없습니다. `TextStyle` 한 줄만 고치면 됩니다.

---

## 1단계: import 문 한 줄 고치기

`frontend/src/components/rich-text-editor.tsx` 파일을 엽니다.

파일 위쪽에서 아래 줄을 찾습니다(Ctrl+F로 "extension-text-style" 검색).

찾기:
```tsx
import TextStyle from "@tiptap/extension-text-style";
```

교체:
```tsx
import { TextStyle } from "@tiptap/extension-text-style";
```

저장합니다. 이게 전부입니다.

---

## 확인하기

1. 프론트엔드 서버를 재시작합니다. (Turbopack 개발 서버라면 저장만 해도 자동으로 다시 빌드됩니다.)
2. 관리자 페이지에서 아무 게시판이나 '+ 글쓰기'를 눌러서, 빌드 에러 화면 없이 글쓰기 화면이 정상적으로 열리는지 확인합니다.
3. 만약 또 비슷한 "Export default doesn't exist" 에러가 다른 import 줄에서 나온다면, 캡처해서 보내주세요. 같은 방식(`import X from "..."` → `import { X } from "..."`)으로 계속 고쳐드리겠습니다.
4. 에러 없이 열리면, 개선117에서 확인했던 항목들(글꼴, 색상, 링크, 이모티콘, 표 삽입/행렬 추가삭제/셀 병합분할)을 처음부터 다시 한번 확인해 주세요.

---

## GitHub 커밋

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "리치 텍스트 에디터 빌드 에러 수정 (글자 스타일 기능 import 방식 수정)"
git push
```

---

## 최종 점검표

- [ ] `rich-text-editor.tsx`의 `TextStyle` import를 `import { TextStyle } from "@tiptap/extension-text-style";`로 고쳤다
- [ ] 글쓰기 화면이 에러 없이 열린다
- [ ] 표 삽입 등 개선117의 모든 기능이 정상 동작한다
- [ ] GitHub에 커밋하고 푸시했다

문제없이 확인되면 원래 계획대로 4단계(댓글 기능)로 이어가겠습니다.
