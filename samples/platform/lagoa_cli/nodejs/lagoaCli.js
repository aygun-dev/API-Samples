var request = require('request')
  , async   = require('async')
  , util    = require('util')
  , args    = require("optimist").argv;


var host = 'https://api.lagoa.com',
  api_path = '/v1',
  ACCESS_TOKEN = process.env.LAGOA_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.log('Please configure the ACCESS_TOKEN.');
  process.exit(0);
}

var assetId = args.assetId;
var folderId = args.folderId;

if (!args.delete || !assetId || !folderId) {
  printUsage();
  process.exit(0);
}

if (args.delete) {
  async.waterfall([
    function (cb) { cb(null, assetId, folderId);},
    removeFromProject,
    deleteAsset
  ], function (error, result) {
    if (error) {
      console.log("Error: " + error.message);
    } else {
      console.log(util.format("Asset ID '%s' deleted.", result));
    }
  });
} else {
  printUsage();
}

function printUsage() {
  console.log('node lagoaCli --delete --assetId=<id of the asset> --folderId=<id of the project>');
}

function removeFromProject(assetId, folderId, cb) {
  request.del({
    url: util.format("%s%s%s/%s.json", host, api_path, "/assets", assetId),
    json: {
      access_token: ACCESS_TOKEN,
      project_id: folderId
    }
  }, function(error, response, body) {
    if (response.statusCode === 200) {
      cb(error, assetId);
    } else {
      cb(new Error("Status Code: " + response.statusCode), assetId);
    };
  });
}

function deleteAsset(assetId, cb) {
  request.del({
    url: util.format("%s%s%s/%s.json", host, api_path, "/assets", assetId),
    json: {
      access_token: ACCESS_TOKEN
    }
  }, function(error, response, body) {
    if (response.statusCode === 200) {
      cb(error, assetId);
    } else {
      cb(new Error("Status Code: " + response.statusCode), assetId);
    }
  });
}

