# 개선29. `backend/tsconfig.json`의 `baseUrl` 경고 없애기

## 🎯 원인 설명

VS Code에 뜬 메시지를 그대로 풀면 이런 뜻이에요.

> `baseUrl` 옵션은 더 이상 쓰이지 않을 예정이고(deprecated), TypeScript 7.0부터는 아예 작동하지 않게 됩니다.

TypeScript 팀이 앞으로 나올 버전(6.0, 7.0)을 준비하면서, 예전에 쓰이던 오래된 설정 몇 가지를 순차적으로 없애고 있어요. `baseUrl`도 그중 하나로 지정된 거예요. (지금 당장 빌드가 안 되거나 프로그램이 멈추는 심각한 오류는 아니고, "이 설정은 나중에 없어질 거예요"라고 미리 알려주는 경고예요.)

`baseUrl`은 원래 `paths`(예: `@/`처럼 짧은 별칭으로 폴더를 가리키는 기능)와 함께 써야 의미가 있는 옵션인데, 지금 `backend/tsconfig.json`에는 `paths` 설정이 아예 없어요. 즉 지금은 `baseUrl`이 있어도 실제로 아무 역할을 하고 있지 않은 상태예요. 그래서 가장 깔끔한 해결책은, 경고를 숨기는 옵션을 추가하는 대신 **`baseUrl` 줄을 그냥 지우는 것**이에요.

> 💡 참고로 프론트엔드(`frontend/tsconfig.json`)는 `@/`로 시작하는 import를 실제로 많이 쓰고 있어서 `paths`와 `baseUrl`이 함께 필요할 가능성이 높아요. 이번 수정은 **백엔드 파일에만** 해당돼요. 혹시 프론트엔드에서도 같은 경고가 뜨면 그때 다시 확인해서 알려드릴게요.

---

## 수정하기

**파일**: `backend/tsconfig.json`

**찾기:**

```json
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
```

**이렇게 바꿔주세요:**

```json
    "outDir": "./dist",
    "incremental": true,
```

`"baseUrl": "./",` 이 한 줄만 지워주시면 됩니다.

---

## ✅ 확인하기

1. 파일을 저장한 뒤, VS Code에서 `backend/tsconfig.json`의 빨간 밑줄이 사라졌는지 확인해주세요.
2. 백엔드를 재시작해서(`npm run start:dev` 등) 평소처럼 잘 실행되는지 확인해주세요. (`paths`를 안 쓰고 있었기 때문에 동작에는 영향이 없어야 해요.)

---

## 📌 GitHub에 저장하기

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선29: 백엔드 tsconfig.json의 사용하지 않는 baseUrl 옵션 제거"
git push
```

---

## 📋 최종 점검표

- [ ] `backend/tsconfig.json`에서 `baseUrl` 줄을 지웠다
- [ ] VS Code의 빨간 밑줄 경고가 사라졌다
- [ ] 백엔드가 평소처럼 정상 실행된다
- [ ] GitHub에 커밋 & 푸시를 완료했다

간단한 정리라서 오래 걸리지 않으셨을 거예요. 수고하셨습니다!
