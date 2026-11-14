#!/usr/bin/env bash
# 냥검객 키우기 — 안드로이드 릴리스 빌드 (AAB + APK)
# 필요: JDK 21, Android SDK (ANDROID_HOME), release/upload-keystore.jks + release/keystore.properties
set -euo pipefail
cd "$(dirname "$0")"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
[ -f release/keystore.properties ] || { echo "release/keystore.properties 가 없습니다 (업로드 키 필요)"; exit 1; }
VER=$(node -p "require('./package.json').version")
[ -d node_modules ] || npm install --no-audit --no-fund
npx cap sync android
cd android
./gradlew --no-daemon bundleRelease assembleRelease
cd ..
cp android/app/build/outputs/bundle/release/app-release.aab "release/nyang-$VER.aab"
cp android/app/build/outputs/apk/release/app-release.apk "release/nyang-$VER.apk"
ls -la release/*.aab release/*.apk
