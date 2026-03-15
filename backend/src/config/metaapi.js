const MetaApi = require("metaapi.cloud-sdk").default;

let _api = null;

function getMetaApi() {
  if (!_api) {
    _api = new MetaApi(process.env.METAAPI_TOKEN);
  }
  return _api;
}

module.exports = { getMetaApi };
