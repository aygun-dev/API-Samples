# Lagoa CLI - Sample

This sample app can be used to upload an asset to Lagoa via the command line.

## Install

* npm install
* Set the variable ACCESS_TOKEN (lagoaCli.js:9) your user access token

    ACCESS_TOKEN = 'thisismytoken';

If available, we'll use an environment variable called LAGOA_ACCESS_TOKEN.

## How to use

node lagoaCli --delete --assetId=<id of the asset> --folderId=<id of the project>

