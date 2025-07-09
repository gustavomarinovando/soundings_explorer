#!/usr/bin/env bash
# exit on error
set -o errexit

# Install backend dependencies
pip install -r requirements.txt

# Navigate to the frontend directory and build it
cd scientific-platform-frontend
npm install
npm run build