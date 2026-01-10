"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDLPRedactor = exports.AsyncRedactor = exports.SyncRedactor = void 0;
const SyncCompositeRedactor_1 = require("./SyncCompositeRedactor");
Object.defineProperty(exports, "SyncRedactor", { enumerable: true, get: function () { return SyncCompositeRedactor_1.SyncCompositeRedactor; } });
const AsyncCompositeRedactor_1 = require("./AsyncCompositeRedactor");
Object.defineProperty(exports, "AsyncRedactor", { enumerable: true, get: function () { return AsyncCompositeRedactor_1.AsyncCompositeRedactor; } });
const GoogleDLPRedactor_1 = require("./custom/GoogleDLPRedactor");
Object.defineProperty(exports, "GoogleDLPRedactor", { enumerable: true, get: function () { return GoogleDLPRedactor_1.GoogleDLPRedactor; } });
//# sourceMappingURL=index.js.map