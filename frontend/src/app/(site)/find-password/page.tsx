import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FindPasswordPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>비밀번호 찾기</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">
            비밀번호 찾기는 휴대폰 문자 인증 기능이 준비되면 이용하실 수 있어요. 그 전까지는 도서관에 문의해주세요.
          </p>
          <Link href="/login" className="text-center text-sm text-neutral-500 hover:text-neutral-800">
            로그인으로 돌아가기
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}