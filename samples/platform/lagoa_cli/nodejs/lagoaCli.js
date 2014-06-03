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

var filename = args.name;
var filepath = args.path;

if (!args.delete && !args.upload) {
  printUsageDelete();
  console.log('Or');
  printUsageUpload();
  process.exit(0);

} else {
  if(args.delete && (!assetId || !folderId))){
   printUsageDelete();
   process.exit(0);
  } else if(args.upload && (!filename || !filepath)){
   printUsageUpload();
   process.exit(0);
  }
}

/***
* Pull out the user user options
*/

var options = {};
var tags = [];


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
  for (var itr in args) {
    if (itr.indexOf('image') != -1){
      options.image = options.image || {};
      options.image[itr.split('-')[1]] = args[itr];
    } else if (itr.indexOf('tags') != -1){
      tags =  args["tags"].split(',');
    }
  }
  console.log(filename + ', ' + filepath);
  console.log(tags);
  console.log(options);

  async.waterfall([
    function (cb) { cb(null, filename, filepath);}
    , createNewSession
    , uploadToS3   // not part of the test but has to be done
    , commitSession
    , checkSessionStatus
    , setTags
  ] , function onDone(error, result) {
      if (error) {
        console.log(JSON.stringify(error, undefined, 2));
      } else {
        console.log("Done");
        console.log(JSON.stringify(result, undefined, 2));
      }
    }
  );
}

function printUsageDelete() {
  console.log('node lagoaCli --delete --assetId=<id of the asset> --folderId=<id of the project>');
}

function printUsageUpload() {
  console.log('node lagoaCli --upload --name=friendly_file_name --path=file_path');
  console.log('  --folder=<folderID> (optional)');
  console.log('  --tags=<comma separated tag names, no spaces between tags> (optional)');
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

function createNewSession(asset_name, asset_path, cb) {

  var file = {
    access_token: ACCESS_TOKEN,
    files: [{ name: asset_name, options: options}]
  };

  if (args.folder){
    file.files[0].folder_id = args.folder;
  }
  request.post({
    url: util.format("%s%s%s.json", host, api_path, "/upload_sessions"),
    json: file
  }, function(error, response, body) {
    cb(error, body.files[0].url, asset_name, asset_path, body.session_token);
  });
}

function uploadToS3(url, asset_name, asset_path, session_token, cb) {
  // Upload the file to S3 (not part of the test but has to be done)
  var stats = fs.statSync(asset_path);
  var fsFile = fs.createReadStream(asset_path);

  var bar = new ProgressBar('  uploading [:bar] :percent :etas', {
    complete: '='
    , incomplete: ' '
    , width: 20
    , total: stats.size
  });

  fsFile.on('data', function(dat){
    bar.tick(dat.length);
  });

  fsFile.pipe(request.put({
      url: url,
      headers: {
        'content-type': '',
        'Content-Length': stats.size
      }
    }, function(error, response, body) {
      cb(error, asset_name, session_token);
    })
  );
}

function commitSession(asset_name, session_token, cb) {

  request.put({
      url: util.format("%s%s%s/%s.json", host, api_path, "/upload_sessions" , session_token),
      json: {
        access_token: ACCESS_TOKEN
      }
    }, function(error, result, body) {
      cb(error, result, body, session_token);
    }
  );
}

function checkSessionStatus(response, body, session_token, cb) {

  var status = 'new';
  var result = [];

  var poll = function() {

    if (status !== 'done') {
      request.get({
        url: util.format("%s%s%s/%s.json", host, api_path, "/upload_sessions", session_token),
        json: {
          access_token: ACCESS_TOKEN
        }
      }, function(error, response, body) {
        var files = body.files;
        if (typeof files !== 'undefined') {
          var all_done = _.every(files, function(value) { return value.status !== 'transcoding'; });
          if (all_done) {
            status = files[0].status;
            result = files[0].assets;
          }
        }
      });

      setTimeout(function(){ poll() }, 1000);
    } else {
      var error = status === 'error' ? new Error('error') : null;
      cb(error, result);
    }
  }

  poll();
}

function setTags(assets, cb) {
  if (assets.length === 0) {
    cb(null);
  } else {
    var completed = 0
      , total = assets.length;

    var tagAttributes = _.reject(tags, function(tag) { return tag === ''})
                         .map(function(tag) { return { name: tag }; });

    assets.forEach(function(asset) {
      request.put({
        url: util.format("%s%s%s/%s.json", host, api_path, "/assets", asset.id),
        json: {
          access_token: ACCESS_TOKEN,
          asset: {
            tags_attributes: tagAttributes
          }
        }
      }, function(error, response, body) {
        if (error) { return cb(error); }
        completed += 1;
        if (total === completed) {
          cb(error, assets);
        }
      });
    });
  }
}
