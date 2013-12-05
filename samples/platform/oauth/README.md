# OAuth2 - Samples

This samples demonstrates how to get an access token from Lagoa to interact with the Lagoa Platform API.

Lagoa uses OAuth2 [version 22](http://tools.ietf.org/html/draft-ietf-oauth-v2-22).

## Requirements
1. Client ID
2. Secret Key
3. Node ~0.8.x

## Workflows

The workflow to get an access token differs slightly whenever you are using a web application or a native one.

### Web Applications
  1. Ask the user to authorize access to his account
  2. Setup a callback to receive the authorization code
  3. Use the authorization code to request an access token

### Native Applications
  1. Ask the user to authorize access to his account
  2. Get the authorization code:
    1. If opening a new browser, ask the user to copy/paste the authorization code to your application
    2. If using an embedded browser, intercept the redirect and parse the url
  3. Use the authorization code to request an access token

## Resources
[node-oauth](https://github.com/ciaranj/node-oauth)
