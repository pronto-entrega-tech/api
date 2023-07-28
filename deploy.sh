#!/bin/bash
set -euo pipefail

EXCLUDED=".env, .env.test, .eslintignore, .eslintrc.json, .git, .gitignore, .prettierrc, .vscode, babel.config.js, src, tsconfig.json, pnpm-lock.yaml"
rsycn -az --delete --exclude="${EXCLUDED}" ./ "${API_USER}@${API_SERVER}:deploy-cache"

ssh "${API_USER}@${API_SERVER}" "zx deploy.mjs"
