# 개선 45: MARC 자료 삭제 버튼 추가 + 실물 삭제 확인을 모달로 바꾸기

## 목표

'목록' → 자료 검색 → 도서/DVD처럼 MARC를 쓰는 자료를 클릭했을 때 나오는 화면에는, 지금 자료(서지) 자체를 삭제하는 버튼이 없습니다. (MARC를 쓰지 않는 자료 화면에는 이미 빨간색 '이 자료 삭제' 버튼이 있습니다.) 이번 가이드에서는 MARC 편집 화면에도 똑같이 빨간색 '이 자료 삭제' 버튼을 추가합니다.

서버 쪽은 이미 안전하게 만들어져 있습니다. 자료를 삭제하려고 할 때 그 자료에 등록된 실물이 하나라도 있으면 "등록된 실물이 N건 있어 삭제할 수 없습니다" 안내와 함께 삭제를 막아줍니다. 이 부분은 MARC를 쓰는 자료든 아니든 똑같이 적용되므로, 이번에는 화면에 버튼만 추가하면 됩니다.

그리고 오른쪽의 "실물 자료 등록/수정" 모달에서 '삭제' 버튼을 눌렀을 때, 지금은 브라우저의 기본 알림창(`confirm`)이 뜨는데, 이것을 다른 화면들처럼 예쁜 모달 팝업으로 바꿉니다. "자료를 정말 삭제하시겠습니까? (제적하는 경우에는 자료에 따라서 '상태'값을 변경해 주세요.)"라는 문구와 함께 '취소'/'삭제' 버튼이 뜨고, '취소'를 누르면 수정 모달로 돌아가고 '삭제'를 누르면 실제로 삭제됩니다.

---

## 프런트엔드 수정하기: `page.tsx`

`C:\projects\LibraryNearMe\frontend\src\app\admin\materials\copies\page.tsx` 파일을 여세요.

### 1. 실물 삭제 확인 모달을 열고 닫는 상태값 추가하기

아래 부분을 찾으세요.

```tsx
  const [showModal, setShowModal] = useState(false);
  const [copyOptions, setCopyOptions] = useState<OptionsState>(EMPTY_OPTIONS);
```

이렇게 바꿔주세요.

```tsx
  const [showModal, setShowModal] = useState(false);
  const [copyOptions, setCopyOptions] = useState<OptionsState>(EMPTY_OPTIONS);
  const [showDeleteCopyConfirm, setShowDeleteCopyConfirm] = useState(false);
```

### 2. MARC 편집 화면에 '이 자료 삭제' 버튼 추가하기

아래 부분을 찾으세요.

```tsx
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
```

이렇게 바꿔주세요.

```tsx
                <MarcEditor fields={marc} onChange={setMarc} />
                <button
                  type="button"
                  onClick={handleSaveMarc}
                  className="mt-3 cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold"
                >
                  {t("materials.copies.marcEditSave")}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMaterial}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t("materials.copies.deleteMaterialBtn")}
                </button>
              </>
            ) : (
```

> 참고: `handleDeleteMaterial` 함수는 이미 파일 안에 만들어져 있어서(MARC를 쓰지 않는 자료 쪽에서 쓰던 함수를 그대로 가져다 씁니다), 따로 만들 필요가 없습니다. 이 함수는 실물이 남아있으면 서버가 막아주고 이유를 안내해줍니다.

### 3. 실물 삭제 함수에서 브라우저 기본 확인창 없애기

아래 부분을 찾으세요.

```tsx
  // 실물 삭제하기
  async function handleDeleteCopy() {
    if (!selectedCopyId || !material) return;
    if (!window.confirm(t("materials.copies.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/copies/${selectedCopyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.deleteSuccess"), "success");
      await refreshMaterial(material.id);
      closeModal();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.copies.deleteFail")), "error");
    }
  }
```

이렇게 바꿔주세요.

```tsx
  // 실물 삭제하기 (삭제 확인 모달에서 '삭제'를 눌렀을 때 호출됩니다.)
  async function handleDeleteCopy() {
    if (!selectedCopyId || !material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/copies/${selectedCopyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.deleteSuccess"), "success");
      setShowDeleteCopyConfirm(false);
      await refreshMaterial(material.id);
      closeModal();
    } else {
      const data = await res.json().catch(() => null);
      setShowDeleteCopyConfirm(false);
      notify("❌ " + (data?.message || t("materials.copies.deleteFail")), "error");
    }
  }
```

### 4. 실물 수정 모달의 '삭제' 버튼이 확인 모달을 열도록 바꾸고, 확인 모달 추가하기

아래 부분을 찾으세요. (파일 맨 끝부분, 실물 등록/수정 모달이 끝나는 곳입니다.)

```tsx
            {selectedCopyId && (
              <button
                onClick={handleDeleteCopy}
                className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t("materials.copies.deleteBtn")}
              </button>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

이렇게 바꿔주세요.

```tsx
            {selectedCopyId && (
              <button
                onClick={() => setShowDeleteCopyConfirm(true)}
                className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t("materials.copies.deleteBtn")}
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {/* 실물 자료 삭제 확인 모달 */}
      {showDeleteCopyConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDeleteCopyConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="whitespace-pre-line text-center text-[15px] leading-relaxed text-neutral-800">
              {t("materials.copies.deleteConfirm")}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowDeleteCopyConfirm(false)}
                className="w-full cursor-pointer rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {t("materials.copies.deleteCancelBtn")}
              </button>
              <button
                onClick={handleDeleteCopy}
                className="w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t("materials.copies.deleteBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

파일을 저장하세요.

---

## 화면에 보일 문구 수정하기: `dictionary.ts`

`C:\projects\LibraryNearMe\frontend\src\lib\dictionary.ts` 파일을 여세요.

### 5-1. 한글(ko) 문구 수정하기

아래 부분을 찾으세요.

```ts
    "materials.copies.deleteBtn": "삭제",
    "materials.copies.deleteConfirm": "이 실물 자료를 정말 삭제하시겠어요?",
    "materials.copies.deleteSuccess": "삭제되었습니다.",
    "materials.copies.deleteFail": "삭제에 실패했습니다.",
```

이렇게 바꿔주세요.

```ts
    "materials.copies.deleteBtn": "삭제",
    "materials.copies.deleteCancelBtn": "취소",
    "materials.copies.deleteConfirm": "자료를 정말 삭제하시겠습니까? (제적하는 경우에는 자료에 따라서 '상태'값을 변경해 주세요.)",
    "materials.copies.deleteSuccess": "삭제되었습니다.",
    "materials.copies.deleteFail": "삭제에 실패했습니다.",
```

### 5-2. 영어(en) 문구 수정하기

아래 부분을 찾으세요.

```ts
    "materials.copies.deleteBtn": "Delete",
    "materials.copies.deleteConfirm": "Delete this copy?",
    "materials.copies.deleteSuccess": "Deleted.",
    "materials.copies.deleteFail": "Delete failed.",
```

이렇게 바꿔주세요.

```ts
    "materials.copies.deleteBtn": "Delete",
    "materials.copies.deleteCancelBtn": "Cancel",
    "materials.copies.deleteConfirm": "Are you sure you want to delete this item? (If it's being withdrawn from the collection, consider changing its 'Status' instead, depending on the material.)",
    "materials.copies.deleteSuccess": "Deleted.",
    "materials.copies.deleteFail": "Delete failed.",
```

파일을 저장하세요.

**바뀐 점 요약**

- MARC를 쓰는 자료(도서/DVD 등) 화면에도 빨간색 '이 자료 삭제' 버튼이 생깁니다. 서버가 이미 "등록된 실물이 있으면 삭제 불가" 규칙을 가지고 있어서, 별도 백엔드 수정 없이 화면에 버튼만 추가하면 됩니다.
- 실물 자료 수정 모달의 '삭제' 버튼을 누르면, 브라우저 기본 확인창 대신 개선44의 회원 삭제와 같은 방식의 모달이 뜹니다. '취소'를 누르면 확인 모달만 닫히고 수정 모달은 그대로 남아 있고, '삭제'를 누르면 실제로 삭제됩니다.

---

## 확인하기

1. 프런트엔드 개발 서버를 재시작하거나 새로고침하세요. (백엔드는 이번에 바뀐 것이 없습니다.)
2. '목록'에서 도서나 DVD처럼 MARC를 쓰는 자료를 하나 클릭해서 들어가세요.
3. MARC 편집 화면 아래쪽에 빨간색 '이 자료 삭제' 버튼이 보이는지 확인하세요.
4. 실물이 등록되어 있는 자료에서 이 버튼을 눌러보세요. "등록된 실물이 N건 있어 삭제할 수 없습니다" 안내가 뜨는지 확인하세요.
5. 실물이 하나도 없는 자료(테스트용으로 새로 등록해도 좋습니다)에서 삭제 버튼을 눌러 정상적으로 삭제되고 목록으로 돌아가는지 확인하세요.
6. 실물이 등록된 다른 자료로 들어가서, 실물 목록에서 하나를 클릭해 수정 모달을 여세요.
7. 모달 아래쪽 '삭제' 버튼을 눌러보세요. 브라우저 기본 알림창이 아니라, "자료를 정말 삭제하시겠습니까? (제적하는 경우에는...)" 문구가 담긴 예쁜 모달이 뜨는지 확인하세요.
8. 확인 모달에서 '취소'를 눌러서 수정 모달로 돌아오는지 확인하세요.
9. 다시 '삭제' → 확인 모달에서 이번엔 '삭제'를 눌러서 실물이 실제로 삭제되는지 확인하세요.

---

## GitHub 커밋

모든 확인이 끝났다면 아래 명령어로 변경 내용을 저장하세요.

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선45: MARC 자료 삭제 버튼 추가 및 실물 삭제 확인을 모달로 변경"
git push
```

---

## 최종 점검표

- [ ] MARC를 쓰는 자료 화면에 빨간색 '이 자료 삭제' 버튼이 보인다.
- [ ] 실물이 등록된 자료는 삭제가 막히고 안내 메시지가 뜬다.
- [ ] 실물이 없는 자료는 정상적으로 삭제된다.
- [ ] 실물 수정 모달의 '삭제' 버튼을 누르면 브라우저 기본 알림창 대신 커스텀 확인 모달이 뜬다.
- [ ] 확인 모달의 문구가 요청하신 문구와 같다.
- [ ] 확인 모달에서 '취소'를 누르면 수정 모달로 돌아온다.
- [ ] 확인 모달에서 '삭제'를 누르면 실물이 실제로 삭제된다.
- [ ] 변경 내용을 GitHub에 커밋 및 푸시했다.
