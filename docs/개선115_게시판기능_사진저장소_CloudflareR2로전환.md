# 개선115 - 게시판 사진 저장소를 로컬 디스크에서 Cloudflare R2로 전환

## 목표

3단계-a에서 만든 사진 업로드 기능은 지금 서버가 돌아가는 컴퓨터의 디스크(`backend/uploads/boards` 폴더)에 사진을 저장합니다. 나중에 실제 서비스로 배포하면, 서버가 재시작되거나 재배포될 때 이 폴더의 사진이 사라질 수 있고, 서버를 여러 대로 늘리면 사진이 뒤섞이는 문제가 생길 수 있습니다.

그래서 사진 파일은 Cloudflare R2(아마존 S3와 호환되는 저장소, 다운로드 비용이 없어서 저렴함)에 저장하고, 우리 시스템은 그 사진의 주소(URL)만 데이터베이스에 저장해서 보여주는 방식으로 바꿉니다. 아직 실제로 올라간 사진이 거의 없는 지금 시점에 바꿔두는 게 가장 손이 적게 갑니다.

이번 가이드는 두 부분으로 나뉩니다.

- **1부**: Cloudflare 웹사이트에서 직접 하셔야 하는 작업 (버킷 만들기, API 키 발급, 공개 주소 만들기)
- **2부**: 코드에서 사진 업로드 기능을 R2로 연결하는 작업

---

# 1부. Cloudflare R2 설정하기 (웹사이트에서 직접 진행)

## 1단계: Cloudflare 계정 만들기 (이미 있다면 건너뛰기)

1. https://dash.cloudflare.com/sign-up 로 접속해서 이메일로 계정을 만듭니다.
2. 로그인 후 왼쪽 메뉴에서 **R2 Object Storage** 항목을 찾습니다. (없다면 검색창에 "R2"를 입력해서 찾을 수 있습니다.)
3. R2를 처음 쓰는 것이면 결제 정보(카드) 등록을 요구할 수 있습니다. R2는 매달 일정 용량까지 무료이고, 그 이상 써야 과금되는 구조입니다. (2026년 기준 대략 10GB 저장까지 무료였으나, 정확한 무료 한도는 Cloudflare 요금제 페이지에서 다시 확인해 주세요.)

## 2단계: 버킷(Bucket) 만들기

1. R2 화면에서 **Create bucket**(버킷 만들기) 버튼을 누릅니다.
2. 버킷 이름을 입력합니다. 예: `librarynearme-boards`
3. Location(위치)은 기본값(Automatic)을 그대로 두고 만듭니다.

## 3단계: 이 버킷의 '계정 ID' 확인하기

R2 개요 화면 오른쪽 위 또는 버킷 상세 화면에 **Account ID**(계정 ID)가 보입니다. 이 값을 메모장에 복사해둡니다. (나중에 `R2_ACCOUNT_ID` 값으로 씁니다.)

## 4단계: API 토큰 발급받기

1. R2 화면에서 **Manage R2 API Tokens**(또는 API 토큰 관리) 메뉴로 들어갑니다.
2. **Create API Token**을 누릅니다.
3. 권한(Permissions)은 **Object Read & Write**(읽기+쓰기)로 선택합니다.
4. 적용 범위는 "특정 버킷에만 적용"을 선택할 수 있으면, 방금 만든 `librarynearme-boards` 버킷만 선택합니다.
5. 만들고 나면 **Access Key ID**와 **Secret Access Key** 두 값이 화면에 딱 한 번 보입니다. 반드시 메모장에 복사해두세요. (닫으면 다시 볼 수 없고, 잃어버리면 토큰을 새로 만들어야 합니다.)

## 5단계: 사진을 브라우저에서 볼 수 있도록 공개 주소 켜기

1. 방금 만든 버킷으로 들어가서 **Settings**(설정) 탭을 엽니다.
2. **Public Access**(공개 접근) 항목을 찾아서, **Allow Access**(또는 R2.dev 서브도메인 켜기)를 눌러 활성화합니다.
3. 활성화하면 `https://pub-xxxxxxxxxxxx.r2.dev` 같은 모양의 공개 주소가 하나 생깁니다. 이 주소 전체를 메모장에 복사해둡니다. (나중에 `R2_PUBLIC_URL` 값으로 씁니다.)

> 참고: 이 `r2.dev` 주소는 테스트/소규모 서비스용으로 충분합니다. 나중에 방문자가 많이 늘어나면, 도서관이 가진 도메인(예: `img.우리도서관.com`)을 이 버킷에 연결하는 "커스텀 도메인" 방식으로 바꿀 수 있습니다. (지금은 그 단계까지 가지 않아도 됩니다.)

여기까지 하면 아래 5가지 값이 메모장에 모여 있어야 합니다.

- R2_ACCOUNT_ID (계정 ID)
- R2_ACCESS_KEY_ID (Access Key ID)
- R2_SECRET_ACCESS_KEY (Secret Access Key)
- R2_BUCKET_NAME (버킷 이름, 예: librarynearme-boards)
- R2_PUBLIC_URL (공개 주소, 예: https://pub-xxxxxxxxxxxx.r2.dev)

---

# 2부. 코드에서 R2로 연결하기

## 1단계: `.env` 파일에 값 추가하기

`backend/.env` 파일을 엽니다. (이 파일은 Git에 올라가지 않으니, 방금 메모장에 적어둔 실제 값을 그대로 넣으시면 됩니다.) 맨 아래에 아래 내용을 추가합니다. (`xxxxx` 부분을 1부에서 메모해둔 실제 값으로 바꿔주세요.)

```
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=librarynearme-boards
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev
```

## 2단계: 패키지 설치하기

```
cd C:\projects\LibraryNearMe\backend
npm install @aws-sdk/client-s3
```

(R2는 아마존 S3와 사용법이 똑같이 호환되도록 만들어져 있어서, S3용 패키지를 그대로 쓸 수 있습니다.)

## 3단계: R2 업로드 서비스 새로 만들기

`backend/src/uploads` 폴더 안에 `uploads.service.ts` 파일을 새로 만들어서 아래 내용을 붙여넣습니다.

```typescript
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class UploadsService {
  // R2는 아마존 S3와 호환되는 방식이라, S3Client에 R2의 주소(endpoint)만 알려주면 그대로 씁니다.
  private s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });

  private extname(filename: string): string {
    const idx = filename.lastIndexOf('.');
    return idx >= 0 ? filename.slice(idx) : '';
  }

  // 게시판 사진을 R2에 올리고, 브라우저에서 바로 볼 수 있는 공개 주소를 돌려줍니다.
  async uploadBoardImage(file: Express.Multer.File): Promise<string> {
    const key = `boards/${Date.now()}-${Math.round(Math.random() * 1e9)}${this.extname(file.originalname)}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    return `${publicUrl}/${key}`;
  }
}
```

## 4단계: 업로드 컨트롤러를 R2를 쓰도록 교체하기

`backend/src/uploads/uploads.controller.ts` 파일을 열어서, 전체 내용을 아래 내용으로 **전부 교체**합니다. (파일을 서버 디스크에 저장하던 부분이, R2에 올리는 방식으로 바뀐 것입니다.)

```typescript
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../auth/admin.guard';
import { UploadsService } from './uploads.service';

// 업로드를 허용할 사진 형식입니다.
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
// 사진 하나당 최대 크기 (5MB)입니다.
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  // 게시판 글쓰기(리치 텍스트 에디터)에서 사진을 삽입할 때 쓰는 업로드 기능입니다.
  // 지금은 관리자만 글을 쓸 수 있으므로 관리자만 쓸 수 있게 막아두었습니다.
  // (나중에 회원도 글을 쓰는 게시판이 실제로 열리면, 이 부분을 회원도 통과할 수 있도록 손봐야 합니다.)
  @Post('board-image')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // 디스크에 저장하지 않고, 메모리에 잠깐 담았다가 바로 R2로 올립니다.
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadBoardImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('사진 파일(png, jpg, gif, webp)만 올릴 수 있습니다.');
    }
    const url = await this.uploadsService.uploadBoardImage(file);
    return { url };
  }
}
```

## 5단계: app.module.ts에 UploadsService 등록하기

`backend/src/app.module.ts` 파일을 열어서, 전체 내용을 아래 내용으로 **전부 교체**합니다. (`UploadsService` import 1줄과 등록 1줄만 추가된 것입니다.)

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { LibraryController } from './library/library.controller';
import { LibraryService } from './library/library.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { MaterialsController } from './materials/materials.controller';
import { MaterialsService } from './materials/materials.service';
import { CopiesController } from './materials/copies.controller';
import { KormarcTagsController } from './settings/kormarc-tags.controller';
import { KormarcTagsService } from './settings/kormarc-tags.service';
import { CopyOptionsController } from './settings/copy-options.controller';
import { CopyOptionsService } from './settings/copy-options.service';
import { MaterialTypesController } from './settings/material-types.controller';
import { MaterialTypesService } from './settings/material-types.service';
import { MemberTypesController } from './settings/member-types.controller';
import { MemberTypesService } from './settings/member-types.service';
import { LoanSettingsController } from './settings/loan-settings.controller';
import { LoanSettingsService } from './settings/loan-settings.service';
import { LoansController } from './loans/loans.controller';
import { LoansService } from './loans/loans.service';
import { LoanRestrictionsController } from './loan-restrictions/loan-restrictions.controller';
import { LoanRestrictionsService } from './loan-restrictions/loan-restrictions.service';
import { ReservationsController } from './reservations/reservations.controller';
import { ReservationsService } from './reservations/reservations.service';
import { BoardsController } from './settings/boards.controller';
import { BoardsService } from './settings/boards.service';
import { UploadsController } from './uploads/uploads.controller';
import { UploadsService } from './uploads/uploads.service';
import { PostsController } from './posts/posts.controller';
import { PostsService } from './posts/posts.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    LibraryController,
    UsersController,
    AuthController,
    MaterialsController,
    CopiesController,
    KormarcTagsController,
    CopyOptionsController,
    MaterialTypesController,
    MemberTypesController,
    LoanSettingsController,
    LoansController,
    LoanRestrictionsController,
    ReservationsController,
    BoardsController,
    UploadsController,
    PostsController,
  ],
  providers: [
    AppService,
    PrismaService,
    LibraryService,
    UsersService,
    AuthService,
    MaterialsService,
    KormarcTagsService,
    CopyOptionsService,
    MaterialTypesService,
    MemberTypesService,
    LoanSettingsService,
    LoansService,
    LoanRestrictionsService,
    ReservationsService,
    BoardsService,
    UploadsService,
    PostsService,
  ],
})
export class AppModule {}
```

> 참고: `backend/uploads/boards` 폴더와 `main.ts`의 로컬 파일 제공 설정은 그대로 남겨둬도 괜찮습니다. 앞으로 올리는 게시판 사진은 전부 R2로 가고, 이 폴더는 더 이상 쓰이지 않을 뿐이라 지워도 되고 남겨둬도 문제는 없습니다.

---

## 확인하기

1. `.env` 파일에 5가지 값을 모두 정확히 넣었는지 다시 한번 확인합니다. (오타가 있으면 업로드가 실패합니다.)
2. `npm install @aws-sdk/client-s3` 를 실행했는지 확인합니다.
3. 백엔드 서버를 재시작합니다. 에러 없이 켜지는지 확인합니다.
4. 아직 화면(3단계-b)이 없어서 눈으로 직접 사진을 올려보는 테스트는 다음 가이드에서 하게 됩니다. 지금은 "서버가 에러 없이 켜지는지"만 확인하면 충분합니다.
5. (선택) Cloudflare R2 대시보드의 버킷 화면에서 **Objects** 탭을 열어보면, 지금은 파일이 하나도 없는 빈 버킷인 것이 정상입니다.

---

## GitHub 커밋

`.env` 파일은 Git에 올라가지 않으니 안심하고 커밋해도 됩니다.

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "게시판 사진 저장소를 로컬 디스크에서 Cloudflare R2로 전환"
git push
```

---

## 최종 점검표

- [ ] Cloudflare 계정을 만들고 R2 버킷을 만들었다
- [ ] API 토큰을 발급받아 Access Key ID / Secret Access Key를 메모해두었다
- [ ] 버킷의 공개 접근(Public Access)을 켜서 공개 주소를 확인했다
- [ ] `backend/.env`에 5가지 값(R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)을 넣었다
- [ ] `npm install @aws-sdk/client-s3` 를 실행했다
- [ ] `backend/src/uploads/uploads.service.ts` 파일을 새로 만들었다
- [ ] `backend/src/uploads/uploads.controller.ts`를 안내한 내용으로 전체 교체했다
- [ ] `backend/src/app.module.ts`를 안내한 내용으로 전체 교체했다
- [ ] 백엔드 서버가 에러 없이 켜진다
- [ ] GitHub에 커밋하고 푸시했다 (.env 파일 제외하고 정상적으로 커밋됨)

다음 가이드(3단계-b)에서는 리치 텍스트 에디터(사진 첨부 포함) 컴포넌트를 만들고, 관리자 페이지에 실제 게시판 글 목록/작성/수정/삭제 화면을 연결합니다. 이때 화면에서 직접 사진을 올려보면서 R2에 잘 올라가는지 눈으로 확인하게 됩니다.
