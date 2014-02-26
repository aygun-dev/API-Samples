var request    = require('request')
  , path       = require('path')
  , util       = require('util');

var HOST            = "https://api.lagoa.com"
  , API_ASSET_PATH  = "/v1/assets"
  , ACCESS_TOKEN    = 'insert your access token here'
  , ASSET_ID        = null
  , PROJECT_ID      = null;


function copyToProject(assetId, projectId, cb) {
  request.put({
    url: util.format("%s%s/%s.json", HOST, API_ASSET_PATH, assetId),
    json: {
      access_token: ACCESS_TOKEN,
      asset: {
        project_id: projectId
      }
    }
  }, function(error, response, body) {
    cb(error, response, body);
  });
}

copyToProject(ASSET_ID, PROJECT_ID, function (error, response, body) {
  if (error) {
    console.log(error);
  } else {
    if (typeof body.id === 'undefined') {
      console.log("Failed: are you sure you have permission to the project id?");
    } else {
      console.log("Success! New Asset ID: " + body.id);
    }
  }
});

