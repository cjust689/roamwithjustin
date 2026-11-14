// The media ingestion CLI owns records.json. This adapter lets both Node's
// native ESM loader and Vue CLI consume the generated JSON consistently.
module.exports = require("./records.json")
