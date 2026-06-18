/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Sliders, 
  Pipette, 
  Eye, 
  Sparkles, 
  RotateCcw,
  Info
} from 'lucide-react';
import { ChromaParams, ColorSpaceType, BackgroundStyle } from '../types';

interface ControlPanelProps {
  params: ChromaParams;
  onChangeParams: (params: ChromaParams) => void;
  onReset: () => void;
  isEyedropperActive: boolean;
  setIsEyedropperActive: (active: boolean) => void;
}

const PRESET_COLORS = [
  { name: 'Chroma Green', r: 0, g: 177, b: 64, hex: '#00b140' },
  { name: 'Chroma Blue', r: 0, g: 71, b: 187, hex: '#0047bb' },
  { name: 'Chroma Magenta', r: 255, g: 0, b: 255, hex: '#ff00ff' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onChangeParams,
  onReset,
  isEyedropperActive,
  setIsEyedropperActive,
}) => {
  const updateParam = <K extends keyof ChromaParams>(key: K, value: ChromaParams[K]) => {
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-col gap-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-200 shadow-2xl h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold font-sans tracking-tight">Keying Settings</h2>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 border border-slate-800 hover:border-emerald-950/50 transition-all duration-200"
          title="Restore default parameters"
          id="btn-parameters-reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {/* Segment 1: Key Color Selector */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Target Screen Color</span>
          {isEyedropperActive && (
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded-full animate-pulse font-normal">
              Click photo to sample
            </span>
          )}
        </label>
        
        <div className="flex gap-2 items-stretch">
          {/* Eyedropper Picker */}
          <button
            onClick={() => setIsEyedropperActive(!isEyedropperActive)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl border font-medium cursor-pointer transition-all duration-200 ${
              isEyedropperActive 
                ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
            }`}
            title="Click here, then click anywhere on the left picture to key out that color"
            id="btn-eyedropper"
          >
            <Pipette className={`w-4 h-4 ${isEyedropperActive ? 'animate-bounce' : ''}`} />
            <span>{isEyedropperActive ? 'Sampling...' : 'Eyedropper'}</span>
          </button>

          {/* Native HTML color input */}
          <div className="relative flex-1 flex items-center min-w-[100px] bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden px-2.5 py-1 text-xs gap-2">
            <input
              type="color"
              value={params.keyColor}
              onChange={(e) => updateParam('keyColor', e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0 overflow-hidden outline-none flex-shrink-0"
              style={{ padding: 0 }}
              id="color-key-input"
            />
            <input
              type="text"
              value={params.keyColor.toUpperCase()}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  updateParam('keyColor', val);
                }
              }}
              className="w-full bg-transparent font-mono tracking-wider text-slate-300 uppercase outline-none focus:text-white"
              placeholder="#00FF00"
              maxLength={7}
              id="color-key-text"
            />
          </div>
        </div>

        {/* Color Presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.hex}
              onClick={() => {
                updateParam('keyColor', preset.hex);
                setIsEyedropperActive(false);
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all ${
                params.keyColor.toLowerCase() === preset.hex.toLowerCase()
                  ? 'bg-slate-800 border-slate-500 text-white'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
              id={`preset-${preset.name.toLowerCase().replace(' ', '-')}`}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full border border-black/20" 
                style={{ backgroundColor: preset.hex }} 
              />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Segment 2: Color Space Math Mode */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Chroma Color Engine
        </label>
        <div className="grid grid-cols-3 bg-slate-950 p-1 rounded-xl border border-slate-800/80 text-xs">
          {(['yuv', 'rgb', 'hsv'] as ColorSpaceType[]).map((space) => (
            <button
              key={space}
              onClick={() => updateParam('colorSpace', space)}
              className={`py-1.5 px-2 rounded-lg font-medium capitalize transition-all ${
                params.colorSpace === space
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              id={`space-btn-${space}`}
            >
              {space}
            </button>
          ))}
        </div>
        <div className="flex items-start gap-1.5 bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl text-[11px] text-slate-400 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
          <span>
            {params.colorSpace === 'yuv' && 'YUV: Matches chrominance while ignoring brightness. Excellent for uneven lighting screens.'}
            {params.colorSpace === 'rgb' && 'RGB: Measures linear Euclidean distance. Simplest but susceptible to heavy shadows.'}
            {params.colorSpace === 'hsv' && 'HSV: Targets hue/saturation clusters. Best for removing specific custom hues.'}
          </span>
        </div>
      </div>

      {/* Segment 3: Sliders */}
      <div className="flex flex-col gap-5 border-t border-slate-800/80 pt-5">
        {/* Sliders Title */}
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Matte Extraction Controls</span>
        </div>

        {/* Tolerance / Similarity */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Tolerance (Similarity)</span>
            <span className="font-mono text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-950">
              {Math.round(params.tolerance * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.tolerance}
            onChange={(e) => updateParam('tolerance', parseFloat(e.target.value))}
            className="w-full accent-emerald-400 bg-slate-950 border border-slate-850 h-2.5 rounded-lg cursor-pointer"
            id="input-tolerance"
          />
          <span className="text-[10px] text-slate-500">
            Enlarges the color spectrum threshold to erase. Increase if green background sections remain.
          </span>
        </div>

        {/* Smoothness */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Edge Smoothness</span>
            <span className="font-mono text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-950">
              {Math.round(params.smoothness * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.smoothness}
            onChange={(e) => updateParam('smoothness', parseFloat(e.target.value))}
            className="w-full accent-emerald-400 bg-slate-950 border border-slate-850 h-2.5 rounded-lg cursor-pointer"
            id="input-smoothness"
          />
          <span className="text-[10px] text-slate-500">
            Softens edge alpha feathering to blend pixels. High values prevent jagged borders.
          </span>
        </div>

        {/* Despill */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Spill Suppression</span>
            <span className="font-mono text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-950">
              {Math.round(params.spill * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.spill}
            onChange={(e) => updateParam('spill', parseFloat(e.target.value))}
            className="w-full accent-emerald-400 bg-slate-950 border border-slate-850 h-2.5 rounded-lg cursor-pointer"
            id="input-despill"
          />
          <span className="text-[10px] text-slate-500">
            Eliminates surrounding glow reflecting skin or hair. Replaces green with neutral hues.
          </span>
        </div>
      </div>

      {/* Segment 4: Composite / Output Options */}
      <div className="flex flex-col gap-4 border-t border-slate-800/80 pt-5 mt-auto">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>Composition & Display</span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300">Show Matte Alpha Mask</span>
          <button
            onClick={() => updateParam('maskOnly', !params.maskOnly)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 outline-none ${
              params.maskOnly ? 'bg-emerald-500' : 'bg-slate-755 border border-slate-700'
            }`}
            title="Toggle between transparency output and black & white alpha mask"
            id="btn-mask-toggle"
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                params.maskOnly ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Backdrop presets */}
        {!params.maskOnly && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate-300">Keyed Backdrop View</span>
            <div className="grid grid-cols-4 bg-slate-950 p-1 rounded-xl border border-slate-850 text-xs">
              {(['grid', 'black', 'white', 'custom'] as BackgroundStyle[]).map((bg) => (
                <button
                  key={bg}
                  onClick={() => updateParam('bgColor', bg)}
                  className={`py-1.5 rounded-lg text-[11px] font-medium transition-all capitalize ${
                    params.bgColor === bg
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  id={`bg-btn-${bg}`}
                >
                  {bg}
                </button>
              ))}
            </div>

            {/* Custom Background Color Picker */}
            {params.bgColor === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-955 p-2 rounded-xl border border-slate-800 animate-fadeIn">
                <input
                  type="color"
                  value={params.customBgColor}
                  onChange={(e) => updateParam('customBgColor', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  id="custom-bg-color-input"
                />
                <span className="text-xs text-slate-400 font-mono select-none">
                  Backdrop: {params.customBgColor.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
