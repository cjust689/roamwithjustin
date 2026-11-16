// The editorial compiler owns records.json. This adapter lets Node native ESM
// and Vue CLI consume the generated snapshot without separate copies.
module.exports = require("./records.json")
