"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsCollection = void 0;
const nedb_connector_1 = require("./nedb.connector");
exports.jobsCollection = (0, nedb_connector_1.createNeDbConnector)({
    filename: 'jobs.db'
});
//# sourceMappingURL=database.js.map