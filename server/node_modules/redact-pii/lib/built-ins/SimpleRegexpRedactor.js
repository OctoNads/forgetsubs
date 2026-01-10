"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleRegexpRedactor = void 0;
const lodash_1 = require("lodash");
class SimpleRegexpRedactor {
    constructor({ replaceWith = (0, lodash_1.snakeCase)().toUpperCase(), regexpPattern: regexpMatcher, }) {
        this.replaceWith = replaceWith;
        this.regexpMatcher = regexpMatcher;
    }
    redact(textToRedact) {
        return textToRedact.replace(this.regexpMatcher, this.replaceWith);
    }
}
exports.SimpleRegexpRedactor = SimpleRegexpRedactor;
//# sourceMappingURL=SimpleRegexpRedactor.js.map