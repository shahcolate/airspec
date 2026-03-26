#!/bin/bash
# Reproduce the airspec score for Express.js
# Requires: node >= 20, git

set -e

tmpdir=$(mktemp -d)
trap "rm -rf $tmpdir" EXIT

echo "Cloning Express..."
git clone --depth 50 https://github.com/expressjs/express.git "$tmpdir/express" 2>&1 | tail -1

echo ""
echo "Running airspec..."
echo ""

npx airspec score --dir "$tmpdir/express"
