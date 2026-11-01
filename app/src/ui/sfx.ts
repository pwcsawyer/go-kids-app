import { Image } from 'react-native';
import { assetSource, sfxIds, type SfxId } from './assets';

const cache = new Map<SfxId, HTMLAudioElement>();

function uriOf(id: SfxId): string | undefined {
  const resolved = Image.resolveAssetSource(assetSource(id));
  return resolved?.uri;
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

preloadSfx();
