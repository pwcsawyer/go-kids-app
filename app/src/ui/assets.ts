import type { ImageSourcePropType } from 'react-native';
import manifest from '../../../assets/manifest.json';

interface ManifestAsset {
  id: string;
  path: string;
}

/** 与 assets/manifest.json 的 id、path 对齐。换同名文件即可，不必改这里的键。 */
const bundled = {
  capture_bird_wing_down: {
    path: 'fx/capture_bird_wing_down.svg',
    module: require('../../../assets/fx/capture_bird_wing_down.svg') as number,
  },
  capture_bird_wing_up: {
    path: 'fx/capture_bird_wing_up.svg',
    module: require('../../../assets/fx/capture_bird_wing_up.svg') as number,
  },
  sfx_capture_bird: {
    path: 'sfx/sfx_capture_bird.m4a',
    module: require('../../../assets/sfx/sfx_capture_bird.m4a') as number,
  },
  sfx_complete: {
    path: 'sfx/sfx_complete.m4a',
    module: require('../../../assets/sfx/sfx_complete.m4a') as number,
  },
  sfx_connect: {
    path: 'sfx/sfx_connect.m4a',
    module: require('../../../assets/sfx/sfx_connect.m4a') as number,
  },
  sfx_correct: {
    path: 'sfx/sfx_correct.m4a',
    module: require('../../../assets/sfx/sfx_correct.m4a') as number,
  },
  sfx_place: {
    path: 'sfx/sfx_place.m4a',
    module: require('../../../assets/sfx/sfx_place.m4a') as number,
  },
  sfx_preview: {
    path: 'sfx/sfx_preview.m4a',
    module: require('../../../assets/sfx/sfx_preview.m4a') as number,
  },
  sfx_sticker: {
    path: 'sfx/sfx_sticker.m4a',
    module: require('../../../assets/sfx/sfx_sticker.m4a') as number,
  },
  sfx_tap_invalid: {
    path: 'sfx/sfx_tap_invalid.m4a',
    module: require('../../../assets/sfx/sfx_tap_invalid.m4a') as number,
  },
  sfx_try_again: {
    path: 'sfx/sfx_try_again.m4a',
    module: require('../../../assets/sfx/sfx_try_again.m4a') as number,
  },
} as const;

export type BundledAssetId = keyof typeof bundled;
export type SfxId = {
  [K in BundledAssetId]: K extends `sfx_${string}` ? K : never;
}[BundledAssetId];

const listed = new Map((manifest.assets as ManifestAsset[]).map((item) => [item.id, item.path]));

for (const [id, item] of Object.entries(bundled)) {
  if (listed.get(id) !== item.path) {
    throw new Error(`素材 ${id} 与 assets/manifest.json 不一致`);
  }
}

export function assetSource(id: BundledAssetId): ImageSourcePropType {
  return bundled[id].module;
}

export const sfxIds = (Object.keys(bundled) as BundledAssetId[]).filter((id): id is SfxId => id.startsWith('sfx_'));
