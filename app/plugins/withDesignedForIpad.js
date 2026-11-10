const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const BEGIN = '// @generated-mac-window begin';
const END = '// @generated-mac-window end';
const ANCHOR = '// Extension point for config plugins.';

/** 从 src/ui/macWindow.ts 读窗口尺寸，避免和测试各写一套数字。 */
function readMacWindow() {
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/macWindow.ts'), 'utf8');
  const read = (key) => {
    const match = source.match(new RegExp(`${key}\\s*:\\s*(\\d+)`));
    if (!match) {
      throw new Error(`src/ui/macWindow.ts 里找不到 ${key}`);
    }
    return Number(match[1]);
  };
  const window = {
    minWidth: read('minWidth'),
    minHeight: read('minHeight'),
    defaultWidth: read('defaultWidth'),
    defaultHeight: read('defaultHeight'),
  };
  if (
    !(
      window.defaultWidth > window.defaultHeight &&
      window.minWidth > window.minHeight &&
      window.defaultWidth >= window.minWidth &&
      window.defaultHeight >= window.minHeight
    )
  ) {
    throw new Error('Mac 窗口必须横屏打开，并且默认尺寸不能小于最小尺寸');
  }
  return window;
}

function swiftBlock(window) {
  return `  ${BEGIN}
  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    pinMacWindow(scene, toPreferred: true)
    super.scene(scene, willConnectTo: session, options: connectionOptions)
    pinMacWindow(scene, toPreferred: true)
    DispatchQueue.main.async {
      self.pinMacWindow(scene, toPreferred: false)
    }
  }

  /// Designed for iPad：先锁成横屏默认尺寸，下一轮再放开，让窗口可以放大，
  /// 也可以缩小到仍能放下 9 路、每格至少 56pt 的尺寸。仅在 Mac 上生效。
  private func pinMacWindow(_ scene: UIScene, toPreferred: Bool) {
    guard ProcessInfo.processInfo.isiOSAppOnMac,
          let windowScene = scene as? UIWindowScene,
          let restrictions = windowScene.sizeRestrictions else { return }
    if toPreferred {
      let preferred = CGSize(width: ${window.defaultWidth}, height: ${window.defaultHeight})
      restrictions.minimumSize = preferred
      restrictions.maximumSize = preferred
    } else {
      restrictions.minimumSize = CGSize(width: ${window.minWidth}, height: ${window.minHeight})
      restrictions.maximumSize = CGSize(width: 8192, height: 8192)
    }
  }
  ${END}`;
}

function withMacBuildSettings(config) {
  return withXcodeProject(config, (mod) => {
    const configurations = mod.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const entry = configurations[key];
      if (!entry || typeof entry.buildSettings?.PRODUCT_NAME === 'undefined') continue;
      // 显式打开 Designed for iPad，并关掉 Mac Catalyst。不要改成 react-native-macos。
      entry.buildSettings.SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = 'YES';
      entry.buildSettings.SUPPORTS_MACCATALYST = 'NO';
    }
    return mod;
  });
}

function withMacScene(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const file = path.join(mod.modRequest.platformProjectRoot, mod.modRequest.projectName, 'SceneDelegate.swift');
      if (!fs.existsSync(file)) {
        throw new Error(`找不到 SceneDelegate.swift：${file}`);
      }
      let source = fs.readFileSync(file, 'utf8');
      if (!source.includes('import UIKit')) {
        source = `import UIKit\n${source}`;
      }
      const block = swiftBlock(readMacWindow());
      if (source.includes(BEGIN)) {
        source = source.replace(new RegExp(`\\s*${BEGIN}[\\s\\S]*?${END}`), `\n${block}`);
      } else if (source.includes(ANCHOR)) {
        source = source.replace(ANCHOR, `${ANCHOR}\n${block}`);
      } else {
        throw new Error('SceneDelegate.swift 没有 Expo 预留的扩展点，无法写入 Mac 窗口尺寸。');
      }
      fs.writeFileSync(file, source);
      return mod;
    },
  ]);
}

/** 生成 iOS 工程时：允许 Apple 芯片 Mac 以 Designed for iPad 运行，并限制窗口大小。 */
function withDesignedForIpad(config) {
  return withMacScene(withMacBuildSettings(config));
}

module.exports = withDesignedForIpad;
