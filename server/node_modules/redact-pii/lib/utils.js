"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSyncRedactor = exports.isSimpleRegexpCustomRedactorConfig = void 0;
function isSimpleRegexpCustomRedactorConfig(redactor) {
    return typeof redactor.regexpPattern !== 'undefined';
}
exports.isSimpleRegexpCustomRedactorConfig = isSimpleRegexpCustomRedactorConfig;
function isSyncRedactor(redactor) {
    return typeof redactor.redact === 'function';
}
exports.isSyncRedactor = isSyncRedactor;
//# sourceMappingURL=utils.js.map