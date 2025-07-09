#!/usr/bin/env bash
# exit on error
set -e

echo "Running custom build script"

# 1. Install Deno into the Render environment
export DENO_INSTALL="/opt/render/project/.deno"
curl -fsSL https://deno.land/install.sh | sh
export PATH="$DENO_INSTALL/bin:$PATH"

# 3. Install npm dependencies
deno install

# 4. Build the project using the script from your package.json
deno task build