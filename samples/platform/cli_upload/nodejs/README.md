# CLI Asset Upload - Sample

This sample app can be used to upload an asset to Lagoa via the command line.

## Install

* npm install
* Set the variable ACCESS_TOKEN (uploadFile.js:18) your user access token

    ACCESS_TOKEN = 'thisismytoken';

If available, we'll use an environment variable called LAGOA_ACCESS_TOKEN.

## How to use

node uploadFile.js --name=<Friendly File Name.ext> --path=<path to file>

Additionally there are some optional parameters:

Folder:
    --folder=<folder id>

Tags:
    --tags=<comma separated tag names, no spaces between tags>

2D images
  --image-gamma=<number>


Note: The friendly file name needs to have a [supported file extension](http://support.lagoa.com/document/file-formats-2/)

