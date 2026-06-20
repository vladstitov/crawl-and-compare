export namespace AnalizerRepo {
  export interface AnalizePageResult {
    url: string;
    htmlSizeInBytes: number;
    isLinkedInProfile: boolean;
    nextAction: 'NONE' | 'OPEN_ABOUT_SECTION';
  }

  export async function AnalizePage(url: string, html: string): Promise<AnalizePageResult> {
    const normalizedUrl = url.trim();
    const isLinkedInProfile = normalizedUrl.includes('/in/');

    return {
      url: normalizedUrl,
      htmlSizeInBytes: html.length,
      isLinkedInProfile,
      nextAction: isLinkedInProfile ? 'NONE' : 'OPEN_ABOUT_SECTION'
    };
  }
}