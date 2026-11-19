// The Gear image publication CLI owns images.json. This adapter lets both
// Node's native ESM loader and Vue CLI consume the generated JSON consistently.
module.exports = require("./images.json")
