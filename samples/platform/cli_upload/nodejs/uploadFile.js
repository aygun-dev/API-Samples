#!/usr/local/bin/node
/***
 * @fileoverview: used to upload a file to Lagoa.
 */

var request = require('request')
  , async   = require('async')
  , util    = require('util')
  , fs      = require('fs')
  , path    = require('path')
  , _       = require('underscore')
  , ProgressBar = require('progress')
  , args    = require("optimist").argv;


var host = 'https://api.lagoa.com',
  api_path = '/v1',
  ACCESS_TOKEN = process.env.LAGOA_ACCESS_TOKEN;

var filename = args.name;
var filepath = args.path;

if (!filename || !filepath) {
  console.log('node uploadFile --name=friendly_file_name --path=file_path');
  process.exit(0);
}

if ( !ACCESS_TOKEN ) {
  console.log('Please configure the ACCESS_TOKEN.');
  process.exit(0);
}

/***
* Pull out the user user options
*/

var options = {};
for (var itr in args) {
  if (itr.indexOf('image') != -1){
    options.image = options.image || {};
    options.image[itr.split('-')[1]] = args[itr];
  }
}

console.log(filename + ', ' + filepath);
console.log(options);

async.waterfall([
  function (cb) { cb(null, filename, filepath);}
  , createNewSession
  , uploadToS3   // not part of the test but has to be done
  , commitSession]);

//---------------------------------------------------------------------------
// Functions
//---------------------------------------------------------------------------

function createNewSession(asset_name, asset_path, cb) {
  request.post({
    url: util.format("%s%s%s.json", host, api_path, "/upload_sessions"),
    json: {
      access_token: ACCESS_TOKEN,
      files: [{ name: asset_name, options: options}]
    }
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
      cb(error, result, body, asset_name, session_token);
    }
  );
}
