# 개선85: 탭 전환 시 뜨는 "setShowDatePicker is not defined" 오류 수정

## 목표

개선84에서 탭을 전환할 때마다 `resetAll()`이 자동으로 실행되도록 만들었는데, 이 `resetAll()` 함수 안에 원래부터(개선84 이전부터) `setShowDatePicker(false)`라는 줄이 남아있었습니다. 그런데 이 파일에는 `showDatePicker`라는 상태 자체가 없어서, 이 줄이 실행되는 순간 오류가 납니다.

지금까지는 `resetAll()`이 사용자가 '초기화' 버튼을 눌렀을 때만 실행됐는데, 아마 그동안은 이 버튼을 누를 일이 적어서 이 오류가 눈에 띄지 않았던 것으로 보입니다. 개선84로 `resetAll()`이 페이지에 들어오자마자 자동으로 실행되게 되면서, 존재하지 않는 함수를 호출하는 이 오래된 문제가 이제 바로 드러난 것입니다. 이 가이드는 존재하지 않는 상태를 가리키는 그 한 줄을 지웁니다.

---

## 1단계: `frontend/src/app/admin/loans/page.tsx` 수정하기

`frontend/src/app/admin/loans/page.tsx` 파일을 여세요.

아래 내용을 찾으세요.

```typescript
  function resetAll() {
    setSelectedMember(null);
    setResults([]);
    setKeyword("");
    setRegistrationNo("");
    setShowSearchModal(false);
    setLoanedItems([]);
    setRestrictions([]);
    setShowRestrictionModal(false);
    setLoanDateStr(todayStr());
    lastValidLoanDateRef.current = todayStr();
    setShowDatePicker(false);
    setLastLoanId(null);
    keywordInputRef.current?.focus();
  }
```

이 내용을 아래 내용으로 바꿔주세요.

```typescript
  function resetAll() {
    setSelectedMember(null);
    setResults([]);
    setKeyword("");
    setRegistrationNo("");
    setShowSearchModal(false);
    setLoanedItems([]);
    setRestrictions([]);
    setShowRestrictionModal(false);
    setLoanDateStr(todayStr());
    lastValidLoanDateRef.current = todayStr();
    setLastLoanId(null);
    keywordInputRef.current?.focus();
  }
```

**설명:** `setShowDatePicker(false);` 한 줄만 지웠습니다. 이 파일에는 `showDatePicker`라는 상태가 정의되어 있지 않으므로(달력 팝업은 `hiddenDateInputRef`라는 별도의 방식으로 열고 닫습니다), 이 줄은 애초에 아무 역할도 하지 못하고 오류만 내는 잘못된 줄이었습니다.

---

## 확인하기

1. `frontend` 서버를 재시작해 주세요.
2. 대출/반납 화면에 접속했을 때 더 이상 "setShowDatePicker is not defined" 오류가 뜨지 않는지 확인해 주세요.
3. '대출' 탭과 '반납' 탭을 여러 번 오가며, 개선84에서 확인했던 내용(탭을 옮기면 이전 기록이 초기화되는 것)이 여전히 잘 동작하는지 확인해 주세요.
4. 대출 처리, 반납 처리가 각각 정상적으로 되는지도 다시 한번 확인해 주세요.

---

## GitHub 커밋

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선85: resetAll 함수의 존재하지 않는 상태 참조 오류 수정"
git push
```

---

## 최종 점검표

- [ ] `resetAll()` 함수에서 `setShowDatePicker(false);` 줄을 지웠다.
- [ ] 페이지 접속 시 더 이상 오류가 뜨지 않는다.
- [ ] 대출/반납 탭 전환 시 기록이 정상적으로 초기화된다.
- [ ] 대출 처리와 반납 처리가 정상적으로 동작한다.
- [ ] GitHub에 커밋 및 푸시를 완료했다.
