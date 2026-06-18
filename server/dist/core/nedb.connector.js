"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNeDbConnector = createNeDbConnector;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const nedb_1 = __importDefault(require("@seald-io/nedb"));
const DB_DIRECTORY = path_1.default.resolve(__dirname, '..', '..', 'db');
function ensureDbDirectory() {
    if (!fs_1.default.existsSync(DB_DIRECTORY)) {
        fs_1.default.mkdirSync(DB_DIRECTORY, { recursive: true });
    }
}
function createNeDbConnector(options) {
    const { filename, inMemoryOnly = false, autoload = true, timestampData = true } = options;
    if (!inMemoryOnly) {
        ensureDbDirectory();
    }
    return new nedb_1.default({
        filename: inMemoryOnly ? undefined : path_1.default.join(DB_DIRECTORY, filename),
        inMemoryOnly,
        autoload,
        timestampData
    });
}
//# sourceMappingURL=nedb.connector.js.map