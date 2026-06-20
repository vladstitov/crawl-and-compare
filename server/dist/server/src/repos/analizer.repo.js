"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalizerRepo = void 0;
var AnalizerRepo;
(function (AnalizerRepo) {
    async function AnalizePage(url, html) {
        const normalizedUrl = url.trim();
        const isLinkedInProfile = normalizedUrl.includes('/in/');
        return {
            url: normalizedUrl,
            htmlSizeInBytes: html.length,
            isLinkedInProfile,
            nextAction: isLinkedInProfile ? 'NONE' : 'OPEN_ABOUT_SECTION'
        };
    }
    AnalizerRepo.AnalizePage = AnalizePage;
})(AnalizerRepo || (exports.AnalizerRepo = AnalizerRepo = {}));
//# sourceMappingURL=analizer.repo.js.map