#!/bin/bash

# === CONFIG ===
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# === SCRIPT ===
echo "🚀 Reinstalling your iOS app with Expo..."
cd "$PROJECT_DIR" || {
  echo "❌ Project directory not found: $PROJECT_DIR"
  exit 1
}

git pull origin main

npx expo prebuild

npx expo run:ios --device --configuration Release

if [ $? -eq 0 ]; then
  echo "✅ App successfully reinstalled!"
else
  echo "⚠️ Something went wrong during installation."
fi

echo ""
read -p "Press Enter to close this window..."