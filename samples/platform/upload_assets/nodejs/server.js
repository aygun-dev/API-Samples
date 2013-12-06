var express = require('express')
   , request = require('request')
   , fs     = require('fs')
   , path   = require('path')
   , util   = require('util');

var PORT       = 9001
    , HOST     = "https://api.lagoa.com"
    , API_PATH = "/v1/upload_sessions"
    , FILE     = path.join( __dirname, 'assets', 'cube.obj.zip')
    , ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE'
    , ASSET_NAME   = 'box.zip';

var app = express();
var session_token = null;

var request_session_callback = function(error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log("Step 1: Done");
    var stats = fs.statSync(FILE);
    session_token = body.session_token;

    /* Step 2: Upload the file to the signed url */
    fs.createReadStream(FILE)
      .pipe(request.put({
        url: body.files[0].url,
        headers: {
          'content-type': '',
          'Content-Length': stats.size
        }
      },
      aws_callback
      ));
  } else {
    console.log(error);
    console.log(response);
    console.log(body);
  }
};

var aws_callback = function(error, response, body) {
  if(error) {
    console.log('error', error);
  } else {
    console.log("Step 2: Done");
    if(response.statusCode === 200) {
      /* Step 3: Commit the upload session */
      request.put({
        url: util.format("%s%s/%s.json", HOST, API_PATH, session_token),
        json: {
          access_token: ACCESS_TOKEN
        }
      }, commit_callback);
    }
  }
};

var commit_callback = function(error, response, body) {
  console.log("Step 3: Done");
  console.log({body: body});
  console.log({error: error});
}

/* Step 1: Request a new upload session */
request.post({
  url: util.format("%s%s.json", HOST, API_PATH),
  json: {
    access_token: ACCESS_TOKEN,
    files: [{
      name: ASSET_NAME
    }]
  }
}, request_session_callback);

app.use(express.bodyParser());

/* Step 4: Wait for the callback with the status of the upload session */
app.post('/callback', function(response, request) {
  console.log("Step 4: Done");
  console.log({body: response.body});
  request.send(200, 'OK');
  request.end();
});

app.listen(PORT);

