import { Image } from 'react-native';
import { assetSource, sfxIds, type SfxId } from './assets';

const cache = new Map<SfxId, HTMLAudioElement>();

/**
 * 原生 require 得到资源编号，要用 resolveAssetSource。
 * Web 导出直接是 { uri }，而 react-native-web 的 Image 没有 resolveAssetSource。
 */
function uriOf(id: SfxId): string | undefined {
  const source = assetSource(id);
  if (typeof source === 'string') return source;
  if (typeof source === 'object' && source != null && 'uri' in source && typeof source.uri === 'string') {
    return source.uri;
  }
  const resolve = (Image as { resolveAssetSource?: (asset: number) => { uri?: string } | undefined }).resolveAssetSource;
  if (typeof source === 'number' && typeof resolve === 'function') return resolve(source)?.uri;
  return undefined;
}

/** 启动时预加载 manifest 里的音效，点击时不再临时读文件。 */
export function preloadSfx() {
  if (typeof Audio === 'undefined') return;
  for (const id of sfxIds) {
    if (cache.has(id)) continue;
    const uri = uriOf(id);
    if (!uri) continue;
    const audio = new Audio(uri);
    audio.preload = 'auto';
    cache.set(id, audio);
  }
}

/** 播放 assets/manifest.json 中的一条音效。没有音频设备时静默跳过。 */
export function playSfx(id: SfxId) {
  if (typeof Audio === 'undefined') return;
  try {
    let audio = cache.get(id);
    if (!audio) {
      const uri = uriOf(id);
      if (!uri) return;
      audio = new Audio(uri);
      cache.set(id, audio);
    }
    audio.currentTime = 0;
    void audio.play();
  } catch {
    /* 静音或自动播放被拦住时，视觉反馈仍然在 */
  }
}

try {
  preloadSfx();
} catch {
  /* 音效读不出来时，棋盘和落子仍然可用 */
}
