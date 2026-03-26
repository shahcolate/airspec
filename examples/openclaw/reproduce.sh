#!/bin/bash
# Reproduce the airspec score for OpenClaw (formerly Moltbot)
# Requires: node >= 20, git
# Note: this is a large repo (~10k files), clone takes a minute

set -e

tmpdir=$(mktemp -d)
trap "rm -rf $tmpdir" EXIT

echo "Cloning OpenClaw (this takes a minute)..."
git clone --depth 50 https://github.com/openclaw/openclaw.git "$tmpdir/openclaw" 2>&1 | tail -1

echo ""
echo "Running airspec..."
echo ""

npx airspec score --dir "$tmpdir/openclaw"
