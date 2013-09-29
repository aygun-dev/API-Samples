#!/usr/bin/env python

import sys

if sys.version_info < (2, 7):
	print("This script requires at least Python 2.7.")
	print("Please, update to a newer version: http://www.python.org/download/releases/")
	exit()

import argparse
import json
import os
import shutil
import tempfile
from os import listdir
from os.path import isfile, join

def grabSrc():
	srcPath = '../embed_api'
	onlyfiles = [ f for f in listdir(mypath) if isfile(join(mypath,f)) ]

def main(argv=None):

	parser = argparse.ArgumentParser()
	parser.add_argument('--include', action='append', required=True)
	parser.add_argument('--output', default='../build/lapi.js')

	args = parser.parse_args()

	output = args.output

	# merge

	print(' * Building ' + output)

	fd, path = tempfile.mkstemp()
	tmp = open(path, 'w')
	sources = []

	for include in args.include:
		with open('includes/' + include + '.json','r') as f:
			files = json.load(f)
		for filename in files:
			filename = '../' + filename;
			sources.append(filename)
			with open(filename, 'r') as f:
				tmp.write(f.read())
				tmp.write('\n')

	tmp.close()

	# save
	shutil.copy(path, output)
	os.chmod(output, 0o664); # temp files would usually get 0600

	os.close(fd)
	os.remove(path)

if __name__ == "__main__":
	main()