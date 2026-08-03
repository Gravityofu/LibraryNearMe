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