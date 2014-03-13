# CLI Asset Upload - Sample

This sample app can be used to upload an asset to Lagoa via the command line.

## Install

* npm install
* Set the variable ACCESS_TOKEN (uploadFile.js:18) your user access token

    ACCESS_TOKEN = 'thisismytoken';

## How to use

node uploadFile.js --name=<Friendly File Name.ext> --path=<path to file>

Note: The friendly file name needs to have a [supported file extension](http://support.lagoa.com/document/file-formats-2/)

