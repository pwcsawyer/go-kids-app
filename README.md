# go-kids-app

五岁小朋友围棋学习 App（Expo SDK 58 + React Native + TypeScript）。

v1 发行一份 **iPad 应用**。在 Apple 芯片 Mac 上用 Apple 的 **「Designed for iPad」** 运行同一份包。这不是 Mac Catalyst，也不是 react-native-macos / AppKit。Expo SDK 58 还不能做原生 macOS，因为 react-native-macos 还没跟上 React Native 0.88。iPhone 和 Android 不在 v1。

首个内测目标是 MacBook Pro（M3 Pro）。

## 在 Mac 上编译运行

需要：

- Apple 芯片 Mac
- [Xcode 26.4 或更新](https://docs.expo.dev/versions/v58.0.0/)（Expo SDK 58 用 iOS 27 SDK 编译）
- Node.js 22.13+（24 要用 24.3+；26 及以上的偶数版本也可以。不要用 23 或 25）
- CocoaPods（`sudo gem install cocoapods`，或用 Homebrew）

```bash
cd app
npm install
npm run mac
```

脚本会检查系统和 Xcode 版本，生成 `app/ios/`，打开 Xcode 工程，并在当前终端启动 Metro。

然后在 Xcode：

1. 顶部运行目标选 **My Mac (Designed for iPad)**。不要选 iPhone / iPad 模拟器，也不要选 Mac Catalyst。
2. 按 Run。Debug 包从 Metro 加载界面，所以这个终端要一直开着。
3. 第一次如果要签名，用自己的 Apple ID 自动签名即可。Bundle ID 是 `com.pwcsawyer.gokids`。

Linux 或云端虚拟机编不出可签名的 Mac `.app`。必须在这台 Mac 上编。

### 窗口和操作

- 启动时窗口是横屏 **1180×820** 点（10.9 英寸 iPad 的横屏尺寸）。可以拖大，最小 **1000×760**。
- 最小尺寸下 9 路棋盘每一格仍然 ≥ 56pt。
- 方向没有锁死。窗口拉得比宽更高时，按钮会挪到棋盘下面，和 iPad 竖屏是同一套布局。
- 触控板或鼠标单击等于点一下。落子还是先出预览，再点同一交叉点才确认。
- `ios.requireFullScreen` 是 `false`。Apple 从 iPadOS 26 / iOS 27 起不再用 `UIRequiresFullScreen` 退出缩放（[TN3192](https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key)，以及 Expo SDK 58 的说明）。可缩放的 Mac 窗口需要关掉这个全屏兼容模式，并声明 iPad 的四个方向。应用仍然只支持 iPad（`supportsTablet` 和 `isTabletOnly`），部署目标是 iPadOS 16.4。

### 手动命令

```bash
cd app
npx expo prebuild -p ios
open ios/app.xcworkspace
npx expo start
```

`ios/` 由 prebuild 生成，不要提交。`npm run ios` 会编 iOS 模拟器或真机，不是 Mac 窗口。内测请用 `npm run mac`。

## 测试

```bash
cd app
npm test
npx tsc --noEmit
```
