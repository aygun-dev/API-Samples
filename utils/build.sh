#!/bin/sh
python build.py --include common --output ../build/lapi.js

#echo * Building docs...
jsdoc ../build --recurse --verbose -t docs/templates/docstrap-master/template/ -c docs/jsdoc.conf.json -d ../docs/