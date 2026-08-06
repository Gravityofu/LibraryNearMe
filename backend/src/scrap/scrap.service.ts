import { Injectable } from '@nestjs/common';

// 기사 주소(URL)에서 제목/매체/기자/날짜를 최대한 읽어오는 서비스입니다.
// 뉴스 사이트 대부분이 페이스북·카카오톡 공유 미리보기를 위해 페이지 안에
// 'Open Graph'라는 표준 정보(og:title 등)를 넣어두는데, 이걸 읽어오는 방식입니다.
// 네이버 뉴스는 여기에 더해, 네이버 뉴스 화면에서만 쓰는 특별한 표시(기자명·시각 등)도
// 추가로 한 번 더 찾아봅니다.
@Injectable()
export class ScrapService {
  // HTML 문자열 안에서 <meta property="이름" content="값"> 형태를 찾습니다.
  private findMetaByProperty(html: string, property: string): string | null {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m) return this.decodeHtmlEntities(m[1]);
    }
    return null;
  }

  // HTML 문자열 안에서 <meta name="이름" content="값"> 형태를 찾습니다.
  private findMetaByName(html: string, name: string): string | null {
    const patterns = [
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m) return this.decodeHtmlEntities(m[1]);
    }
    return null;
  }

  // HTML에 흔히 섞여 있는 &amp; &quot; 같은 기호를 원래 글자로 되돌립니다.
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  // 네이버 뉴스 화면에만 있는 표시(매체 로고 alt글자, 기자명, 작성시각)를 최대한 찾아봅니다.
  // (네이버가 화면 구조를 바꾸면 이 부분이 안 맞을 수도 있는데, 그런 경우에도
  // 위에서 이미 찾은 일반 정보(og:title 등)는 그대로 살아있습니다.)
  private findNaverExtras(html: string) {
    const mediaMatch = html.match(/media_end_head_top_logo[^>]*>\s*<img[^>]+alt=["']([^"']+)["']/i);
    const reporterMatch = html.match(/media_end_head_journalist_name["'][^>]*>\s*([^<]+)</i);
    const dateMatch = html.match(/media_end_head_info_datestamp_time["'][^>]*data-date-time=["']([^"']+)["']/i);
    return {
      media: mediaMatch ? this.decodeHtmlEntities(mediaMatch[1]) : null,
      reporter: reporterMatch ? this.decodeHtmlEntities(reporterMatch[1]) : null,
      date: dateMatch ? dateMatch[1] : null,
    };
  }

  // 기사 주소로 정보를 가져옵니다.
  // 성공: { ok: true, title, media, reporter, date }
  // 실패: { ok: false, reasonScope: 'site' | 'article', message }
  //   - reasonScope 'site'  → 이 사이트 자체가 지원되지 않는 것 같음
  //   - reasonScope 'article' → 이 기사만 일부 정보가 부족한 것 같음
  async fetchArticle(source: string, url: string) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { ok: false, reasonScope: 'article', message: '올바른 주소 형식이 아닙니다. 주소를 다시 확인해 주세요.' };
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { ok: false, reasonScope: 'article', message: '올바른 주소 형식이 아닙니다. 주소를 다시 확인해 주세요.' };
    }

    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return {
          ok: false,
          reasonScope: 'site',
          message: `이 사이트에서 접근을 막고 있는 것 같습니다. (응답 코드: ${res.status}) 직접 입력해 주세요.`,
        };
      }
      html = await res.text();
    } catch {
      return {
        ok: false,
        reasonScope: 'site',
        message: '이 사이트에 연결할 수 없습니다. 주소가 정확한지, 사이트가 접속 가능한지 확인 후 직접 입력해 주세요.',
      };
    }

    let title = this.findMetaByProperty(html, 'og:title');
    let media = this.findMetaByProperty(html, 'og:site_name');
    let date =
      this.findMetaByProperty(html, 'article:published_time') ||
      this.findMetaByName(html, 'date') ||
      this.findMetaByName(html, 'pubdate') ||
      this.findMetaByName(html, 'article:published_time');
    let reporter = this.findMetaByName(html, 'author') || this.findMetaByProperty(html, 'article:author');

    if (source === 'naver') {
      const extras = this.findNaverExtras(html);
      media = extras.media || media;
      reporter = extras.reporter || reporter;
      date = extras.date || date;
    }

    if (!title) {
      return {
        ok: false,
        reasonScope: 'site',
        message:
          '이 사이트에서는 기사 정보를 자동으로 읽어올 수 없는 것 같습니다. (최신 기술로 화면을 그리는 사이트는 지원되지 않을 수 있습니다.) 직접 입력해 주세요.',
      };
    }
    if (!media && !reporter && !date) {
      return {
        ok: false,
        reasonScope: 'article',
        message: '제목 외의 정보(매체·기자·날짜)를 이 기사에서는 찾지 못했습니다. 직접 입력해 주세요.',
      };
    }

    return { ok: true, title, media: media || '', reporter: reporter || '', date: date || '' };
  }
}