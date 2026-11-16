// The explicit Place registration command owns records.json. This adapter
// lets Node native ESM and Vue CLI consume the generated snapshot consistently.
module.exports = require("./records.json")
