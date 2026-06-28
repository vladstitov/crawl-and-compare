"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalizerRepo = void 0;
const node_html_parser_1 = require("node-html-parser");
var AnalizerRepo;
(function (AnalizerRepo) {
    function normalizeText(value) {
        return value.replace(/\s+/g, ' ').trim().toLowerCase();
    }
    function findMatchingTags(html, rules) {
        const documentRoot = (0, node_html_parser_1.parse)(html, {
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
    function toJsonNode(node) {
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
        if (!(node instanceof node_html_parser_1.HTMLElement)) {
            return null;
        }
        const children = node.childNodes
            .map(toJsonNode)
            .filter((child) => child !== null);
        const attributes = node.attributes;
        const hasAttributes = Object.keys(attributes).length > 0;
        return {
            type: 'element',
            tag: node.tagName.toLowerCase(),
            attributes: hasAttributes ? attributes : undefined,
            children: children.length > 0 ? children : undefined
        };
    }
    function ParseHtmlToJson(html) {
        if (!html || typeof html !== 'string')
            return null;
        const documentRoot = (0, node_html_parser_1.parse)(html, {
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
            .filter((node) => node !== null);
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
    AnalizerRepo.ParseHtmlToJson = ParseHtmlToJson;
    async function AnalizePage(data, pageContains = []) {
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
    AnalizerRepo.AnalizePage = AnalizePage;
})(AnalizerRepo || (exports.AnalizerRepo = AnalizerRepo = {}));
//# sourceMappingURL=analizer.repo.js.map