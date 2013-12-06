# Asset Upload - Sample

This sample demonstrates how to upload an asset to the Lagoa Platform API.


## Requirements
1. Oauth2 Access Token
3. Node ~0.8.x

## Workflows

1. Request an upload session
2. Upload file to the signed url returned in #1
3. Commit the upload session using the session_token from #1
4. Wait for a webhook callback containing the status of the upload (comming soon)


