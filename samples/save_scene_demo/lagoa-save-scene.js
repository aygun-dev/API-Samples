var fs         = require('fs')
  , formidable = require('formidable')
  , request    = require('request')
  , path       = require('path')
  , async      = require('async')
  , util       = require('util');

var PORT            = 9001
  , HOST            = "https://api.lagoa.com"
  , API_EMBED_PATH  = "/v1/embeds"
  , API_UPLOAD_PATH = "/v1/upload_sessions"
  , API_ASSET_PATH  = "/v1/assets"
  , ACCESS_TOKEN    = 'insert you access token here';


module.exports = function(app) {

  //--------------------------------------------------------------------
  // Handle new scenes
  //--------------------------------------------------------------------
  app.post('/scenes', function(req, res) {
    var form = new formidable.IncomingForm();

    form.on('error', function(err){
      response.writeHead(200, {'content-type': 'text/plain'});
      response.end('error:\n\n' + util.inspect(err));
    });

    form.on('file', function(field, file){
      req.file = file;
    });

    form.on('end', function() {
      res.writeHead(200, {'content-type': 'text/plain'});
      startLagoaUpload(req.file.name, req.file.path, function uploaded(result) {
        res.write(result);
        res.end();
      });

    });

    form.encoding = 'utf-8';
    form.uploadDir = './tmp';
    form.keepExtensions = true;
    form.parse(req);
  });

  //--------------------------------------------------------------------
  // Upload to lagoa
  //--------------------------------------------------------------------

  function startLagoaUpload(assetName, assetPath, cb) {
    async.waterfall([
      (function (assetName, assetPath, cb) { cb(null, assetName, assetPath); }).bind(null, assetName, assetPath)
      , createNewSession
      , uploadToS3
      , commitSession
      , checkSessionStatus
      , makeAssetPublic
      , getNewEmbedLink],
      function (error, result) {
        if (!error) {
          cb(result);
        }
      });
  }

  function createNewSession(assetName, assetPath, cb) {
    request.post({
      url: util.format("%s%s.json", HOST, API_UPLOAD_PATH),
      json: {
        access_token: ACCESS_TOKEN,
        files: [{ name: assetName }]
      }
    }, function(error, response, body) {
      cb(error, response, body, assetPath);
    });
  }

  var uploadToS3 = function(response, body, assetPath, cb) {
    if (response.statusCode == 200) {

      var url = body.files[0].url;
      var sessionToken = body.session_token;
      var stats = fs.statSync(assetPath);

      /* Step 2: Upload the file to the signed url */
      fs.createReadStream(assetPath)
        .pipe(request.put({
          url: url,
          headers: {
            'content-type': '',
            'Content-Length': stats.size
          }
        }, function(error, response, body) {
          fs.unlinkSync(assetPath);
          cb(error, response, sessionToken);
        })

        );
    } else {
      console.log(response);
      console.log(body);
    }
  };

  var commitSession = function(response, sessionToken, cb) {
    if(response.statusCode === 200) {
      /* Step 3: Commit the upload session */
      request.put({
        url: util.format("%s%s/%s.json", HOST, API_UPLOAD_PATH, sessionToken),
        json: {
          access_token: ACCESS_TOKEN
        }
      }, function(error, result, body) {
        cb(error, result, body, sessionToken);
      });
    }
  };

  var checkSessionStatus = function(response, body, sessionToken, cb) {

    var status = 'new';
    var assetId = '';

    var poll = function() {
      if (status !== 'done') {
        request.get({
          url: util.format("%s%s/%s.json", HOST, API_UPLOAD_PATH , sessionToken),
          json: {
            access_token: ACCESS_TOKEN
          }
        }, function(error, response, body) {
          var files = body.files;
          if (typeof files !== 'undefined') {
            status = files[0].status;
            if (status === 'done') {
              assetId = files[0].assets[0].id
            }
          }
        });

        setTimeout(function(){ poll() }, 1000);
      } else {
        var error = status === 'error' ? 'error' : null;
        cb(error, assetId);
      }
    }

    poll();
  }
}

function makeAssetPublic(assetId, cb) {
  request.put({
    url: util.format("%s%s/%s.json", HOST, API_ASSET_PATH, assetId),
    json: {
      access_token: ACCESS_TOKEN,
      asset: {
        private: false
      }
    }
  }, function(error, response, body) {
    cb(error, assetId);
  });
}

function getNewEmbedLink(asset_id, cb) {
  request.post({
    url: util.format("%s%s.json", HOST, API_EMBED_PATH),
    json: {
      access_token: ACCESS_TOKEN,
      embed_links: [{
        asset_id: asset_id,
        settings: [
          {type: "scene", parameter_name: "render", parameter_value: true},      // Enable rendering
          {type: "scene", parameter_name: "nav_tools", parameter_value: true}    // Display navigation tool
        ],
        options: {}
      }]
    }
  }, function(error, response, body) {
    console.log(response.body.embed_links[0].embed_code);
    cb(error, response.body.embed_links[0].embed_code);
  });
}
