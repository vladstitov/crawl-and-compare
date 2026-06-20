import { HTMLElement, type Node as HtmlNode, parse } from 'node-html-parser';
import type { JobDocument } from '../core/database';

export namespace AnalizerRepo {
  export interface PageContainsRule {
    tag: string;
    text: string;
  }

  export interface HtmlJsonNode {
    type: 'element' | 'text';
    tag?: string;
    attributes?: Record<string, string>;
    text?: string;
    children?: HtmlJsonNode[];
  }

  export interface ParsedHtmlJson {
    title: string | null;
    links: string[];
    headings: string[];
    rootNodes: HtmlJsonNode[];
  }

  export type AnalizePageResult = Partial<JobDocument>;

  function normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function findMatchingTags(html: string, rules: PageContainsRule[]): PageContainsRule[] {
    const documentRoot = parse(html, {
      lowerCaseTagName: true,
      comment: false
    });

    return rules.filter((rule) => {
      const normalizedTag = normalizeText(rule.tag);
      const normalizedRuleText = normalizeText(rule.text);

      if (!normalizedTag || !normalizedRuleText) {
        return false;
      }

      return documentRoot
        .querySelectorAll(normalizedTag)
        .some((node) => normalizeText(node.text).includes(normalizedRuleText));
    });
  }

  function toJsonNode(node: HtmlNode): HtmlJsonNode | null {
    if (node.nodeType === 3) {
      const text = node.rawText.trim();
      if (!text) {
        return null;
      }

      return {
        type: 'text',
        text
      };
    }

    if (!(node instanceof HTMLElement)) {
      return null;
    }

    const children = node.childNodes
      .map(toJsonNode)
      .filter((child): child is HtmlJsonNode => child !== null);

    const attributes = node.attributes;
    const hasAttributes = Object.keys(attributes).length > 0;

    return {
      type: 'element',
      tag: node.tagName.toLowerCase(),
      attributes: hasAttributes ? attributes : undefined,
      children: children.length > 0 ? children : undefined
    };
  }

  export function ParseHtmlToJson(html: string): ParsedHtmlJson | null {
    if(!html || typeof html !== 'string') return null;
    

    const documentRoot = parse(html, {
      lowerCaseTagName: true,
      comment: false,
      blockTextElements: {
        script: true,
        style: true,
        pre: true,
        noscript: true
      }
    });

    const rootNodes = documentRoot.childNodes
      .map(toJsonNode)
      .filter((node): node is HtmlJsonNode => node !== null);

    const links = documentRoot
      .querySelectorAll('a[href]')
      .map((anchor) => anchor.getAttribute('href') ?? '')
      .filter((href) => href.length > 0);

    const headings = documentRoot
      .querySelectorAll('h1, h2, h3')
      .map((heading) => heading.text.trim())
      .filter((text) => text.length > 0);

    const title = documentRoot.querySelector('title')?.text.trim() || null;

    return {
      title,
      links,
      headings,
      rootNodes
    };
  }

  export async function AnalizePage( data: {_id: string, url?: string, title?: string, sourceName?: string, html?: string}, 
    pageContains: PageContainsRule[] = [] ): Promise<AnalizePageResult> {
      
    const normalizedUrl = (data.url ?? '').trim();
    const parsedHtml = ParseHtmlToJson(data.html ?? '');

    const matchedTags = findMatchingTags(data.html ?? '', pageContains);
    return {
      _id: data._id,
      url: normalizedUrl,
      title: data.title,
      sourceName: data.sourceName,
      htmlPage: data.html,
      htmlData: parsedHtml,
      hasTags: matchedTags,
      status: 'downloaded'
    };
  }
}