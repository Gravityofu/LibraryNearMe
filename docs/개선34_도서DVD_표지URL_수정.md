# 개선34. 도서·DVD 자료 검색 화면에도 표지 이미지 URL 보이고 수정하기

## 🎯 목표

도서·DVD를 새로 등록할 때는 MARC 편집기와 함께 표지 이미지 URL 입력칸이 같이 나오는데, 나중에 자료 검색으로 그 자료를 다시 열어보면 MARC 편집기만 보이고 표지 이미지 URL은 어디에도 안 보이고 있었어요. 이번엔 그 화면(자료 상세 화면의 왼쪽 'MARC 정보' 박스)에도 표지 이미지 URL 입력칸을 추가하고, 수정도 할 수 있게 만들게요.

> 💡 개선33에서 만든 `simpleForm` 상태에 `coverUrl`이 이미 포함되어 있어서(도서·DVD를 포함한 모든 자료의 정보를 불러올 때 함께 채워지고 있었어요), 이번엔 그 값을 MARC 화면에도 보여주고 저장할 수 있도록 몇 군데만 연결해주면 돼요.

---

## 1단계. 백엔드 - MARC 수정 시 표지 URL도 함께 저장하기

**파일**: `backend/src/materials/materials.service.ts`

**찾기:**

```typescript
  // MARC 편집기에서 수정한 내용을 서지(Material)에 다시 저장 (칸 자동추출도 다시 실행)
  async updateMaterialMarc(libraryId: number, materialId: number, marc: any) {
    const material = await this.prisma.material.findFirst({ where: { id: materialId, libraryId } });
    if (!material) {
      throw new BadRequestException("자료를 찾을 수 없습니다.");
    }
    if (!Array.isArray(marc) || marc.length === 0) {
      throw new BadRequestException("MARC 데이터가 없습니다.");
    }
    const fields: any = extractColumns(marc);
    fields.marc = marc;
    if (!fields.title || !String(fields.title).trim()) {
      throw new BadRequestException("제목(서명)은 필수입니다. MARC라면 245 ▼a를 확인하세요.");
    }
    return this.prisma.material.update({
      where: { id: materialId },
      data: fields,
    });
  }

}
```

**이렇게 바꿔주세요:**

```typescript
  // MARC 편집기에서 수정한 내용을 서지(Material)에 다시 저장 (칸 자동추출도 다시 실행)
  async updateMaterialMarc(libraryId: number, materialId: number, marc: any, coverUrl?: string) {
    const material = await this.prisma.material.findFirst({ where: { id: materialId, libraryId } });
    if (!material) {
      throw new BadRequestException("자료를 찾을 수 없습니다.");
    }
    if (!Array.isArray(marc) || marc.length === 0) {
      throw new BadRequestException("MARC 데이터가 없습니다.");
    }
    const fields: any = extractColumns(marc);
    fields.marc = marc;
    if (coverUrl !== undefined) fields.coverUrl = coverUrl || null; // 표지 URL은 MARC에서 자동으로 뽑히지 않아서 따로 받아 저장해요.
    if (!fields.title || !String(fields.title).trim()) {
      throw new BadRequestException("제목(서명)은 필수입니다. MARC라면 245 ▼a를 확인하세요.");
    }
    return this.prisma.material.update({
      where: { id: materialId },
      data: fields,
    });
  }

}
```

---

## 2단계. 백엔드 - 컨트롤러에서 표지 URL도 함께 전달하기

**파일**: `backend/src/materials/materials.controller.ts`

**찾기:**

```typescript
  @Patch(':id')
  @UseGuards(AdminGuard)
  updateMaterial(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.materialsService.updateMaterialMarc(req.user.libraryId, parseInt(id, 10), body.marc);
  }
```

**이렇게 바꿔주세요:**

```typescript
  @Patch(':id')
  @UseGuards(AdminGuard)
  updateMaterial(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.materialsService.updateMaterialMarc(req.user.libraryId, parseInt(id, 10), body.marc, body.coverUrl);
  }
```

---

## 3단계. 화면 수정하기

**파일**: `frontend/src/app/admin/materials/copies/page.tsx`

### 1) MARC 저장할 때 표지 URL도 함께 보내기

**찾기:**

```tsx
  async function handleSaveMarc() {
    if (!material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${material.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ marc }),
    });
```

**이렇게 바꿔주세요:**

```tsx
  async function handleSaveMarc() {
    if (!material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${material.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ marc, coverUrl: simpleForm.coverUrl }),
    });
```

### 2) MARC 화면에도 표지 URL 입력칸 보여주기

**찾기:**

```tsx
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
```

**이렇게 바꿔주세요:**

```tsx
            {usesMarc ? (
              <>
                <label className="mb-3 block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("materials.new.field.coverUrl")}</span>
                  <input
                    value={simpleForm.coverUrl}
                    onChange={(e) => setSimpleForm({ ...simpleForm, coverUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
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

### 무슨 코드인가요?

- 개선33에서 만든 `simpleForm.coverUrl`은 도서·DVD를 포함한 모든 자료를 불러올 때 이미 함께 채워지고 있었어요. 이번엔 그 값을 MARC 화면 위쪽에 입력칸으로 보여주기만 하면 됐어요.
- 'MARC 수정' 버튼을 누르면 `marc` 배열과 함께 `simpleForm.coverUrl`도 같이 서버로 보내요.
- 서버(`updateMaterialMarc`)는 MARC에서 자동으로 뽑아낸 값들(`extractColumns(marc)`)에, 따로 받은 `coverUrl`을 덧붙여서 저장해요. `coverUrl`을 아예 안 보낸 경우(`undefined`)는 기존 값을 그대로 두고, 빈 문자열로 지운 경우(`""`)는 `null`로 저장해서 표지를 없앨 수도 있어요.

---

## ✅ 확인하기

1. 백엔드와 프론트엔드를 모두 재시작해주세요.
2. 자료 검색에서 도서나 DVD 하나를 눌러 들어가보세요.
3. MARC 편집기 위쪽에 '표지 이미지 URL' 입력칸이 보이고, 등록할 때 입력했던 값이 그대로 채워져 있는지 확인해주세요.
4. 값을 바꿔서 'MARC 수정' 버튼을 누르고, 저장이 잘 되는지 확인해주세요.
5. 화면을 벗어났다가 다시 들어와서, 바뀐 표지 URL이 잘 유지되는지 확인해주세요.

---

## 📌 GitHub에 저장하기

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선34: 도서·DVD 자료 상세 화면에 표지 이미지 URL 표시 및 수정 기능 추가"
git push
```

---

## 📋 최종 점검표

- [ ] `materials.service.ts`의 `updateMaterialMarc()`가 `coverUrl`을 함께 받아 저장한다
- [ ] `materials.controller.ts`에서 `body.coverUrl`을 함께 전달한다
- [ ] MARC 화면 위쪽에 표지 이미지 URL 입력칸이 보인다
- [ ] 표지 URL 수정이 정상적으로 저장된다
- [ ] GitHub에 커밋 & 푸시를 완료했다

수고하셨습니다! 이제 도서·DVD도 검색해서 들어간 화면에서 표지 이미지 URL을 바로 확인하고 수정할 수 있어요.
