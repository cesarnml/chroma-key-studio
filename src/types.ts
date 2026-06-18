/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ColorSpaceType = 'yuv' | 'rgb' | 'hsv';

export type BackgroundStyle = 'grid' | 'black' | 'white' | 'custom';

export interface ChromaParams {
  keyColor: string; // Hex color string, e.g., "#00ff00"
  tolerance: number; // 0.0 to 1.0 (or 0 to 100)
  smoothness: number; // 0.0 to 1.0
  spill: number; // 0.0 to 1.0 (spill suppression level)
  colorSpace: ColorSpaceType;
  maskOnly: boolean; // overlay black/white alpha matte
  bgColor: BackgroundStyle;
  customBgColor: string;
}

export interface SpriteGridConfig {
  enabled: boolean;
  rows: number;
  cols: number;
  isPlaying: boolean;
  activeFrame: number;
  fps: number;
}

export interface FileData {
  url: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
}
