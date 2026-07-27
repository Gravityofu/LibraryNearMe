# 개선24. KOMARC 박스 여백 추가 + 목록 타이틀 변경 + 수정 모달에서 최근 등록번호 문구 숨기기

## 🎯 목표

세 가지를 고칠게요.

1. 왼쪽 KOMARC 정보와 박스 테두리 사이 여백을 조금 넓혀서 더 편하게 보이도록 합니다.
2. 오른쪽 화면 타이틀을 "소장 부수 목록" → **"실물 자료 목록"**으로 바꿉니다.
3. 모달에서 "등록번호" 옆에 나오는 "(최근 저장된 등록번호: 6)" 같은 문구를, **새 자료를 등록할 때만** 보이게 하고, **기존 자료를 클릭해서 수정할 때는 보이지 않게** 합니다. (수정할 때는 이미 그 자료의 등록번호가 입력되어 있으니 "최근 등록번호" 안내가 필요 없죠.)

---

## 수정하기

**파일**: `frontend/src/app/admin/materials/copies/page.tsx`

### 1) KOMARC 박스 여백 넓히기

**찾기:**

```tsx
        {/* 왼쪽: KOMARC 정보 */}
        <div className="max-h-[75vh] overflow-auto rounded-lg border border-neutral-200 bg-white p-3">
```

**이렇게 바꿔주세요:**

```tsx
        {/* 왼쪽: KOMARC 정보 */}
        <div className="max-h-[75vh] overflow-auto rounded-lg border border-neutral-200 bg-white p-5">
```

> 💡 `p-3`(여백 12px)를 `p-5`(여백 20px)로 늘려서, 박스 테두리와 안의 내용(MARC 편집기, 저장 버튼) 사이에 여유 공간이 더 생겨요.

---

### 2) 오른쪽 목록 타이틀 바꾸기

**파일**: `frontend/src/lib/dictionary.ts`

**한글 부분에서 찾기:**

```ts
    "materials.copies.copyListHeading": "소장 부수 목록",
```

**이렇게 바꿔주세요:**

```ts
    "materials.copies.copyListHeading": "실물 자료 목록",
```

> 💡 영어 문구(`"Copies"`)는 이미 뜻이 잘 맞아서 그대로 두시면 돼요.

---

### 3) 수정 모달일 때는 "최근 저장된 등록번호" 문구 숨기기

**파일**: `frontend/src/app/admin/materials/copies/page.tsx`

**찾기:**

```tsx
                  {latestRegNo && (
                    <span className="ml-2 text-xs text-neutral-400">
                      ({t("materials.copies.latestRegNo")}: {latestRegNo})
                    </span>
                  )}
```

**이렇게 바꿔주세요:**

```tsx
                  {!selectedCopyId && latestRegNo && (
                    <span className="ml-2 text-xs text-neutral-400">
                      ({t("materials.copies.latestRegNo")}: {latestRegNo})
                    </span>
                  )}
```

### 무슨 코드인가요?

`!selectedCopyId`는 "selectedCopyId가 없을 때(=새로 등록하는 중일 때)"라는 뜻이에요. 기존 자료를 클릭해서 수정 모달을 열면 `selectedCopyId`에 그 자료의 번호가 들어있으니, 이 조건이 `false`가 되어 문구가 나타나지 않아요. 반대로 '새 실물 자료 등록'을 눌러서 열면 `selectedCopyId`가 `null`(없음)이라서 조건이 `true`가 되어 문구가 그대로 보여요.

---

## ✅ 확인하기

1. 프론트엔드를 실행해주세요.
2. 실물 등록 페이지에 들어가서, 왼쪽 KOMARC 박스의 내용과 테두리 사이 여백이 넓어졌는지 확인해주세요.
3. 오른쪽 박스의 제목이 "실물 자료 목록"으로 바뀌었는지 확인해주세요.
4. '새 실물 자료 등록'을 눌러서 모달을 열어보세요. "등록번호" 옆에 "(최근 저장된 등록번호: N)" 문구가 그대로 보이는지 확인해주세요.
5. 기존 자료 행을 클릭해서 수정 모달을 열어보세요. 이번엔 그 문구가 보이지 않는지 확인해주세요.

---

## 📌 GitHub에 저장하기

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선24: KOMARC 박스 여백 추가, 목록 타이틀 변경, 수정 모달 최근등록번호 문구 숨김"
git push
```

---

## 📋 최종 점검표

- [ ] KOMARC 박스의 여백(`p-3` → `p-5`)을 넓혔다
- [ ] `dictionary.ts`에서 목록 타이틀을 "실물 자료 목록"으로 바꿨다
- [ ] 새 자료 등록 모달에서는 "최근 저장된 등록번호" 문구가 보인다
- [ ] 기존 자료 수정 모달에서는 그 문구가 보이지 않는다
- [ ] GitHub에 커밋 & 푸시를 완료했다

수고하셨습니다! 화면이 조금 더 편안해지고, 문구도 상황에 맞게 정확히 나오게 됐어요. 🙂
