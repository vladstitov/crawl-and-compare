"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
require("./core/database");
const browser_repo_1 = require("./repos/browser.repo");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});
browser_repo_1.BrowserRepo.StartBridgeServer(app, PORT);
//# sourceMappingURL=index.js.map