var OAuth = require('OAuth')
  , express = require('express')
  , app = express();

var PORT       = 9001
   , CLIENT_ID = 'your_client_id_here'
   , SECRET    = 'your_secret_here'
   , CALLBACK  = 'http://your-call-back-here/callback'
   , OAUTH_URL = 'https://api.lagoa.com/oauth2/'
   , AUTHORIZATION_CODE_PATH = "authorize"
   , ACCESS_TOKEN_PATH       = "token";

var oauth2 = new OAuth.OAuth2(
  CLIENT_ID,
  SECRET,
  OAUTH_URL,
  AUTHORIZATION_CODE_PATH,
  ACCESS_TOKEN_PATH,
  null
);

/* Step 1: Direct the user to the authorization page */
app.get('/', function (req, res) {
  var params = { response_type: "code", redirect_uri: CALLBACK };
  res.redirect(oauth2.getAuthorizeUrl(params));
});

/* Step 2: Receive the authorization code and use it to request an access_token */
app.get('/callback', function(req, res) {
  if (req.query.code) {
    // User authorized
    var code   = req.query.code;
    var params = { grant_type: 'authorization_code', redirect_uri: CALLBACK };
    oauth2.getOAuthAccessToken(
      code,
      params,
      function (e, access_token, refresh_token, results){
        res.send(200, {
          error: e,
          access_token: access_token
        });
        res.end();
      }
    );
  } else {
    // User denied
    res.send(200, req.query);
    res.end();
  }
});

app.listen(PORT);