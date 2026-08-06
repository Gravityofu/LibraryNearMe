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

  // class 속성 안에 이 이름이 '포함'되어 있는 태그 하나를 통째로 찾습니다.
  // (예전에는 이 이름과 완전히 똑같아야만 찾을 수 있었는데, 그러면 뒤에 다른 이름이
  // 하나라도 더 붙어있는 경우 못 찾는 문제가 있었습니다. 이제는 그런 경우에도 찾습니다.)
  private findTagByClassToken(html: string, classToken: string): string | null {
    const re = new RegExp(`<[a-zA-Z0-9]+[^>]*class=["'][^"']*\\b${classToken}\\b[^"']*["'][^>]*>`, 'i');
    const m = html.match(re);
    return m ? m[0] : null;
  }

  // class 속성 안에 이 이름이 포함된 태그를 페이지에서 하나씩 찾아보면서, 태그 바로 뒤에
  // 실제 글자(공백이 아닌 내용)가 있는 첫 번째 자리를 찾아서 그 글자를 돌려줍니다.
  // (같은 class 이름이 여러 군데 있고, 그중 일부는 글자 없이 다른 태그로 바로 이어지는
  // 경우가 있어서, 그런 자리는 건너뛰고 진짜 글자가 있는 자리를 찾습니다.)
  private findTextAfterClassToken(html: string, classToken: string): string | null {
    const re = new RegExp(
      `<[a-zA-Z0-9]+[^>]*class=["'][^"']*\\b${classToken}\\b[^"']*["'][^>]*>\\s*([^<\\s][^<]*)`,
      'gi',
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const text = m[1].trim();
      if (text) return this.decodeHtmlEntities(text);
    }
    return null;
  }

  // 네이버 뉴스 화면에만 있는 표시(매체 로고 alt글자, 기자명, 작성시각)를 최대한 찾아봅니다.
  // (네이버가 화면 구조를 바꾸면 이 부분이 안 맞을 수도 있는데, 그런 경우에도
  // 위에서 이미 찾은 일반 정보(og:title 등)는 그대로 살아있습니다.)
  private findNaverExtras(html: string) {
    let media: string | null = null;
    let reporter: string | null = null;
    let date: string | null = null;

    // 날짜: 'media_end_head_info_datestamp_time'이 포함된 태그를 통째로 찾은 뒤,
    // 그 안에서 data-date-time 속성 값을 꺼냅니다.
    const dateTag = this.findTagByClassToken(html, 'media_end_head_info_datestamp_time');
    if (dateTag) {
      const m = dateTag.match(/data-date-time=["']([^"']+)["']/i);
      if (m) date = m[1];
    }

    // 기자명: 'media_end_head_journalist_name'이 포함된 태그가 페이지에 여러 군데 있을 수 있어서,
    // 첫 번째 자리만 보지 않고 하나씩 확인하면서 실제로 이름 글자가 바로 뒤에 있는 첫 번째 자리를 씁니다.
    // (어떤 자리는 이름 없이 바로 다른 태그로 이어지기도 해서, 그런 자리는 건너뜁니다.)
    const reporter2 = this.findTextAfterClassToken(html, 'media_end_head_journalist_name');
    if (reporter2) reporter = reporter2;

    // 매체명: 'media_end_head_top_logo'가 포함된 태그를 통째로 찾은 뒤, 그 태그 바로 다음
    // 400글자 안에서 이미지의 alt 글자(로고 이미지의 대체 텍스트, 보통 언론사 이름)를 꺼냅니다.
    // (예전에는 '>' 바로 뒤에 <img가 나와야만 찾을 수 있었는데, 태그와 이미지 사이에
    // 다른 요소가 껴 있으면 못 찾는 문제가 있었습니다. 이제는 그런 경우에도 찾습니다.)
    const logoTag = this.findTagByClassToken(html, 'media_end_head_top_logo');
    if (logoTag) {
      const startIndex = html.indexOf(logoTag);
      const nearby = html.slice(startIndex, startIndex + 400);
      const m = nearby.match(/alt=["']([^"']+)["']/i);
      if (m) media = this.decodeHtmlEntities(m[1]);
    }

    // 그래도 매체를 못 찾았다면, 서버 실행 중인 터미널 화면에 그 부분 HTML을 그대로
    // 출력해줍니다. (사용자에게는 보이지 않고, 개발자 확인용입니다.) 혹시 이번 수정으로도
    // 매체가 계속 비어있으면, 이 로그를 확인해서 원인을 더 정확히 찾을 수 있습니다.
    if (!media) {
      const hintIndex = html.indexOf('media_end_head_top');
      if (hintIndex >= 0) {
        console.log(
          '[스크랩] 매체명을 찾지 못했습니다. 아래 내용을 개발자에게 전달해 주세요:\n',
          html.slice(hintIndex, hintIndex + 500),
        );
      } else {
        console.log('[스크랩] 매체명을 찾지 못했습니다. (media_end_head_top 관련 표시 자체가 페이지에 없습니다.)');
      }
    }

    return { media, reporter, date };
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