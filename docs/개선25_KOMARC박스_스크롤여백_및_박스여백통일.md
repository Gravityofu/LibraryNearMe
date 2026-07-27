# 개선25. KOMARC 박스 - 스크롤할 때도 여백 유지 + 좌우 박스 여백 통일

## 🎯 목표

두 가지를 고칠게요.

1. **스크롤할 때 여백이 사라지는 문제**: 지난번(개선24)에 왼쪽 KOMARC 박스에 여백(`p-5`)을 줬는데, 스크롤을 내리면 그 여백이 안 보이는 문제가 있으셨죠. 이건 브라우저의 흔한 특징 때문이에요 — `overflow-auto`(스크롤이 생기는 상자)에 직접 여백(`padding`)을 주면, 스크롤이 끝까지 내려갔을 때 그 여백이 스크롤 영역 바깥으로 밀려나서 안 보이게 되는 경우가 있어요. 지난번 모달 모서리를 고칠 때(개선23)와 원인이 똑같아요.
2. **좌우 박스 여백이 서로 달라 보이는 문제**: 왼쪽은 `p-5`(20px)로 늘렸는데 오른쪽은 그대로 `p-3`(12px)이라서 서로 다르게 보였어요. 말씀하신 대로 여백을 원래 값(`p-3`)으로 되돌려서 양쪽을 통일할게요.

### 어떻게 고치나요?

개선23에서 모달에 썼던 것과 똑같은 방법이에요. 박스를 두 겹으로 나눠요.

- **바깥 상자**: 스크롤(`overflow-auto`)과 테두리만 담당, 여백 없음
- **안쪽 상자**: 실제 여백(`padding`)과 내용만 담당

이렇게 하면 스크롤을 얼마나 내리든, 안쪽 상자에 준 여백은 그 안의 내용 기준으로 항상 그대로 유지돼요.

---

## 수정하기

**파일**: `frontend/src/app/admin/materials/copies/page.tsx`

**찾기:**

```tsx
        {/* 왼쪽: KOMARC 정보 */}
        <div className="max-h-[75vh] overflow-auto rounded-lg border border-neutral-200 bg-white p-5">
          <p className="mb-2 text-base font-semibold">{t("materials.copies.marcBoxTitle")}</p>
          {usesMarc ? (
            <>
              <MarcEditor fields={marc} onChange={setMarc} />
              <button
                type="button"
                onClick={handleSaveMarc}
                className="mt-3 cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold"
              >
                {t("materials.copies.marcEditSave")}
              </button>
            </>
          ) : (
            <div className="space-y-1 text-sm text-neutral-600">
              <p>
                <span className="text-neutral-400">{t("materials.new.field.title")}: </span>
                {material.title}
              </p>
              <p>
                <span className="text-neutral-400">{t("materials.new.field.creator")}: </span>
                {material.creator || "-"}
              </p>
              <p>
                <span className="text-neutral-400">{t("materials.new.field.publisher")}: </span>
                {material.publisher || "-"}
              </p>
              <p>
                <span className="text-neutral-400">{t("materials.new.field.pubYear")}: </span>
                {material.pubYear || "-"}
              </p>
            </div>
          )}
        </div>
```

**이렇게 바꿔주세요:**

```tsx
        {/* 왼쪽: KOMARC 정보 */}
        <div className="max-h-[75vh] overflow-auto rounded-lg border border-neutral-200 bg-white">
          <div className="p-3">
            <p className="mb-2 text-base font-semibold">{t("materials.copies.marcBoxTitle")}</p>
            {usesMarc ? (
              <>
                <MarcEditor fields={marc} onChange={setMarc} />
                <button
                  type="button"
                  onClick={handleSaveMarc}
                  className="mt-3 cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold"
                >
                  {t("materials.copies.marcEditSave")}
                </button>
              </>
            ) : (
              <div className="space-y-1 text-sm text-neutral-600">
                <p>
                  <span className="text-neutral-400">{t("materials.new.field.title")}: </span>
                  {material.title}
                </p>
                <p>
                  <span className="text-neutral-400">{t("materials.new.field.creator")}: </span>
                  {material.creator || "-"}
                </p>
                <p>
                  <span className="text-neutral-400">{t("materials.new.field.publisher")}: </span>
                  {material.publisher || "-"}
                </p>
                <p>
                  <span className="text-neutral-400">{t("materials.new.field.pubYear")}: </span>
                  {material.pubYear || "-"}
                </p>
              </div>
            )}
          </div>
        </div>
```

### 무슨 코드인가요?

- 바깥 `<div>`: `max-h-[75vh] overflow-auto rounded-lg border border-neutral-200 bg-white`만 남기고 `p-5`(여백)는 빼버렸어요. 이 상자는 이제 "테두리 그리기 + 스크롤 생기게 하기"만 담당해요.
- 안쪽 `<div className="p-3">`: 원래 있던 제목과 내용을 전부 이 안으로 옮기고, 여백은 여기에 `p-3`(오른쪽 박스와 똑같은 값)로 줬어요. 이제 스크롤을 아무리 내려도, 이 안쪽 상자를 기준으로 여백이 항상 일정하게 유지돼요.
- 오른쪽 '실물 자료 목록' 박스는 원래도 `p-3` 그대로였으니 따로 손댈 필요는 없어요. 이제 왼쪽도 `p-3`을 쓰게 됐으니 양쪽 여백이 다시 똑같아 보일 거예요.

---

## ✅ 확인하기

1. 프론트엔드를 실행해주세요.
2. 실물 등록 페이지에서 KOMARC 정보가 길게 나오는 자료(스크롤이 생기는 자료)로 들어가주세요.
3. 스크롤을 맨 아래까지 내려도, 내용과 박스 테두리 사이에 여백이 그대로 유지되는지 확인해주세요.
4. 스크롤을 하지 않은 첫 화면에서, 왼쪽 'MARC 정보' 박스와 오른쪽 '실물 자료 목록' 박스의 여백이 서로 똑같아 보이는지 확인해주세요.

---

## 📌 GitHub에 저장하기

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선25: KOMARC 박스 스크롤 시 여백 유지 및 좌우 박스 여백 통일"
git push
```

---

## 📋 최종 점검표

- [ ] KOMARC 박스를 "바깥(스크롤) + 안쪽(여백)" 이중 구조로 바꿨다
- [ ] 안쪽 상자의 여백을 `p-3`으로 맞춰서 오른쪽 박스와 통일했다
- [ ] 스크롤을 끝까지 내려도 여백이 사라지지 않는다
- [ ] 좌우 박스의 여백이 눈으로 봤을 때 동일하다
- [ ] GitHub에 커밋 & 푸시를 완료했다

수고하셨습니다! 이제 스크롤 여부와 상관없이 여백이 안정적으로 유지되고, 좌우 박스도 다시 통일감 있게 보일 거예요. 🙂
