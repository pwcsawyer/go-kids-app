#!/usr/bin/env bash
# 在 Apple 芯片 Mac 上生成 iPad 工程，并打开 Xcode 的 Designed for iPad 目标。
# 不会编出原生 macOS AppKit 应用。Linux 上会直接退出。
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "要在 Apple 芯片 Mac 上运行这个脚本。当前不是 macOS，编不出可签名的 .app。"
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "需要 Apple 芯片（arm64）。Designed for iPad 不能在 Intel Mac 上运行。"
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "没有找到 xcodebuild。请安装 Xcode 26.4 或更新版本，然后执行："
  echo "  sudo xcode-select -s /Applications/Xcode.app"
  exit 1
fi

xcode_ver="$(xcodebuild -version 2>/dev/null | awk 'NR==1 { print $2 }')"
if [[ -z "$xcode_ver" ]]; then
  echo "xcodebuild 没有返回版本。请确认 xcode-select 指向完整的 Xcode，而不是 Command Line Tools。"
  exit 1
fi
# macOS 自带的 sort 没有 -V，用 awk 比较主版本和次版本。
if ! awk -v got="$xcode_ver" 'BEGIN {
  split(got, g, "."); split("26.4", n, ".");
  for (i = 1; i <= 3; i++) {
    gi = g[i] + 0; ni = n[i] + 0;
    if (gi > ni) exit 0;
    if (gi < ni) exit 1;
  }
  exit 0;
}'; then
  echo "当前 Xcode 是 ${xcode_ver}。Expo SDK 58 需要 Xcode 26.4 或更新（https://docs.expo.dev/versions/v58.0.0/）。"
  exit 1
fi

node_ver="$(node -v 2>/dev/null | sed 's/^v//')"
node_major="${node_ver%%.*}"
node_minor="$(printf '%s' "$node_ver" | cut -d. -f2)"
node_ok=0
if [[ "$node_major" -eq 22 && "$node_minor" -ge 13 ]]; then node_ok=1; fi
if [[ "$node_major" -eq 24 && "$node_minor" -ge 3 ]]; then node_ok=1; fi
if [[ "$node_major" -ge 26 && $((node_major % 2)) -eq 0 ]]; then node_ok=1; fi
if [[ "$node_ok" -ne 1 ]]; then
  echo "当前 Node 是 ${node_ver}。Expo SDK 58 需要 Node 22.13+、24.3+，或 26 及以上的偶数版本。"
  exit 1
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "没有找到 CocoaPods。安装后再运行："
  echo "  sudo gem install cocoapods"
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm install
fi

# 默认跳过「工作区不干净」的确认。ios/ 由 prebuild 生成，不需要提交。
export EXPO_NO_GIT_STATUS=1
npx expo prebuild -p ios

workspace=""
for candidate in ios/*.xcworkspace; do
  if [[ -d "$candidate" ]]; then
    workspace="$candidate"
    break
  fi
done
if [[ -z "$workspace" ]]; then
  echo "没有找到 xcworkspace。CocoaPods 可能没装好。安装后重新运行："
  echo "  sudo gem install cocoapods"
  exit 1
fi

open "$workspace"

cat <<'EOF'

Xcode 已经打开。接下来：

  1. 顶部运行目标选 My Mac (Designed for iPad)。
     不要选 iPhone / iPad 模拟器，也不要选 Mac Catalyst。
  2. 按 Run。
  3. 保持这个终端开着。Debug 包从 Metro 加载界面。

窗口会以横屏 1180×820 打开，可以拖大，最小约 1000×760。
触控板单击等于点一下：先出预览，再点同一点才落子。
这是 iPad 应用在 Apple 芯片 Mac 上运行，不是原生 macOS 应用。

EOF

exec npx expo start
