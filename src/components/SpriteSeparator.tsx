/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Grid3X3, 
  Download, 
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { SpriteGridConfig, FileData, ChromaParams } from '../types';
import { applyChromaKey } from '../utils/chromaKey';

interface SpriteSeparatorProps {
  imageFile: FileData | null;
  params: ChromaParams;
  imageElement: HTMLImageElement | null;
}

export const SpriteSeparator: React.FC<SpriteSeparatorProps> = ({
  imageFile,
  params,
  imageElement,
}) => {
  // Local slicing presets
  const [enabled, setEnabled] = useState<boolean>(true); // Preleased enabled for sprite sheet analysis!
  const [rows, setRows] = useState<number>(2); // 2 rows (perfect matches user picture!)
  const [cols, setCols] = useState<number>(4); // 4 columns (perfect matches user picture!)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(8);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  
  const playerCanvasRef = useRef<HTMLCanvasElement>(null);

  const totalFrames = rows * cols;

  // Frame Animation Loop Tick
  useEffect(() => {
    if (!enabled || !isPlaying) return;

    const intervalMs = 1000 / fps;
    const timer = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, isPlaying, fps, totalFrames]);

  // Keep frame index clamped inside boundaries when grid size changes
  useEffect(() => {
    if (currentFrame >= totalFrames) {
      setCurrentFrame(0);
    }
  }, [totalFrames, currentFrame]);

  // Draw current animated/sliced sprite frame on the active player canvas
  useEffect(() => {
    if (!playerCanvasRef.current || !imageFile || !imageElement || !enabled) return;

    const canvas = playerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    // Dimensions of each individual grid frame
    const frameWidth = Math.floor(w / cols);
    const frameHeight = Math.floor(h / rows);

    if (frameWidth <= 0 || frameHeight <= 0) return;

    canvas.width = frameWidth;
    canvas.height = frameHeight;

    // 1. Process entire spritesheet in offscreen canvas first so the frame has chroma-key applied
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(img, 0, 0, w, h);
    const sourceData = tempCtx.getImageData(0, 0, w, h);
    const targetData = ctx.createImageData(w, h);

    applyChromaKey(
      sourceData,
      targetData,
      params.keyColor,
      params.tolerance,
      params.smoothness,
      params.spill,
      params.colorSpace,
      params.maskOnly
    );

    const fullKeyedCanvas = document.createElement('canvas');
    fullKeyedCanvas.width = w;
    fullKeyedCanvas.height = h;
    const fullKeyedCtx = fullKeyedCanvas.getContext('2d');
    if (fullKeyedCtx) {
      fullKeyedCtx.putImageData(targetData, 0, 0);
    }

    // 2. Identify coordinates for the active frame in the grids
    const frameIndex = currentFrame;
    const fx = (frameIndex % cols) * frameWidth;
    const fy = Math.floor(frameIndex / cols) * frameHeight;

    // 3. Clear player canvas and draw background grid or color
    ctx.clearRect(0, 0, frameWidth, frameHeight);

    if (!params.maskOnly) {
      if (params.bgColor === 'grid') {
        const checkerSize = Math.max(4, Math.round(frameWidth / 15));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, frameWidth, frameHeight);
        ctx.fillStyle = '#e2e8f0';
        for (let y = 0; y < frameHeight; y += checkerSize * 2) {
          for (let x = 0; x < frameWidth; x += checkerSize * 2) {
            ctx.fillRect(x, y, checkerSize, checkerSize);
            ctx.fillRect(x + checkerSize, y + checkerSize, checkerSize, checkerSize);
          }
        }
      } else if (params.bgColor === 'black') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, frameWidth, frameHeight);
      } else if (params.bgColor === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, frameWidth, frameHeight);
      } else if (params.bgColor === 'custom') {
        ctx.fillStyle = params.customBgColor;
        ctx.fillRect(0, 0, frameWidth, frameHeight);
      }
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, frameWidth, frameHeight);
    }

    // 4. Draw the specific keyed frame coordinates to viewer
    ctx.drawImage(
      fullKeyedCanvas,
      fx, fy, frameWidth, frameHeight, // source coordinate box
      0, 0, frameWidth, frameHeight // output target coordinates
    );

  }, [imageFile, params, imageElement, enabled, currentFrame, rows, cols]);

  // Download individual active frame as a transparent file
  const downloadSingleFrame = (frameIdx: number) => {
    if (!playerCanvasRef.current || !imageFile) return;

    // To handle arbitrary frame requested, we compile it on-demand
    const tempCanvas = document.createElement('canvas');
    const displayCanvas = playerCanvasRef.current;
    
    // Create download link
    const link = document.createElement('a');
    link.download = `${imageFile.name.split('.')[0]}_frame_${frameIdx + 1}.png`;
    link.href = displayCanvas.toDataURL('image/png');
    link.click();
  };

  // Sequential batch triggers for downloading all frames in one click
  const downloadAllFrames = () => {
    if (!imageElement || !imageFile) return;

    setEnabled(true);
    const img = imageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const frameWidth = Math.floor(w / cols);
    const frameHeight = Math.floor(h / rows);

    // Compile keyed sprite sheet
    const processCanvas = document.createElement('canvas');
    processCanvas.width = w;
    processCanvas.height = h;
    const processCtx = processCanvas.getContext('2d');
    if (!processCtx) return;

    processCtx.drawImage(img, 0, 0, w, h);
    const sourceData = processCtx.getImageData(0, 0, w, h);
    const targetData = processCtx.createImageData(w, h);

    applyChromaKey(
      sourceData,
      targetData,
      params.keyColor,
      params.tolerance,
      params.smoothness,
      params.spill,
      params.colorSpace,
      params.maskOnly
    );

    const keyedSrcCanvas = document.createElement('canvas');
    keyedSrcCanvas.width = w;
    keyedSrcCanvas.height = h;
    const keyedSrcCtx = keyedSrcCanvas.getContext('2d');
    if (keyedSrcCtx) {
      keyedSrcCtx.putImageData(targetData, 0, 0);
    }

    // Sequentially download each slice as standalone image
    for (let f = 0; f < totalFrames; f++) {
      const singleCanvas = document.createElement('canvas');
      singleCanvas.width = frameWidth;
      singleCanvas.height = frameHeight;
      const sCtx = singleCanvas.getContext('2d');
      if (sCtx) {
        const fx = (f % cols) * frameWidth;
        const fy = Math.floor(f / cols) * frameHeight;
        sCtx.drawImage(keyedSrcCanvas, fx, fy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        
        // Trigger download
        const link = document.createElement('a');
        link.download = `${imageFile.name.split('.')[0]}_frame_${f + 1}.png`;
        link.href = singleCanvas.toDataURL('image/png');
        link.click();
      }
    }
  };

  if (!imageFile) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-200 shadow-2xl flex flex-col gap-5 animate-fadeIn">
      {/* Slicing header toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3" id="sprite-slicing-header">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold font-sans tracking-tight">Sprite Sheet Slicer</h2>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
            enabled 
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' 
              : 'bg-slate-800 border-slate-700 text-slate-350'
          }`}
          id="btn-slice-enable-toggle"
        >
          {enabled ? 'Active' : 'Disabled'}
        </button>
      </div>

      {enabled && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="slicing-workspace-grid">
          {/* Slicing Controls - 5 columns */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Columns (Vertical Slices)</span>
                <span className="font-mono text-emerald-400 font-bold">{cols}</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={cols}
                onChange={(e) => {
                  setCols(parseInt(e.target.value));
                  setCurrentFrame(0);
                }}
                className="w-full accent-emerald-400 bg-slate-950 border border-slate-850 h-2 rounded-lg cursor-pointer animate-fadeIn"
                id="slice-input-cols"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Rows (Horizontal Slices)</span>
                <span className="font-mono text-emerald-400 font-bold">{rows}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={rows}
                onChange={(e) => {
                  setRows(parseInt(e.target.value));
                  setCurrentFrame(0);
                }}
                className="w-full accent-emerald-400 bg-slate-950 border border-slate-850 h-2 rounded-lg cursor-pointer"
                id="slice-input-rows"
              />
            </div>

            <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl text-slate-350 text-[11px] leading-relaxed flex flex-col gap-1">
              <div className="font-semibold text-slate-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                <span>Detection Info</span>
              </div>
              <p>
                This sprite contains <strong className="text-slate-200">{totalFrames} frames</strong> total. {imageFile && `Each frame is isolated to ${Math.floor(imageFile.width / cols)}x${Math.floor(imageFile.height / rows)} pixels.`}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Tip: The default characters have 2 rows and 4 columns.
              </p>
            </div>
          </div>

          {/* Sliced Frame Animation player - 7 columns */}
          <div className="lg:col-span-7 flex flex-col md:flex-row gap-5 bg-slate-950 p-4 rounded-xl border border-slate-850">
            {/* Anim playback Canvas */}
            <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-lg p-2 max-w-[170px] min-w-[130px] self-center">
              <canvas
                ref={playerCanvasRef}
                className="max-w-full h-auto block rounded"
                style={{ width: '110px', height: '110px', imageRendering: 'pixelated' }}
                id="sprite-player-canvas"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-2" id="sprite-frame-index-badge">
                FRAME {currentFrame + 1} / {totalFrames}
              </span>
            </div>

            {/* Micro Controls & Scrubbing */}
            <div className="flex-1 flex flex-col justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-300">Live Frame Playback</span>
                
                {/* Control Buttons row */}
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentFrame((prev) => (prev - 1 + totalFrames) % totalFrames);
                    }}
                    className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 transition-all font-sans cursor-pointer text-xs"
                    id="btn-playback-prev"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-1.5 px-3 rounded text-xs flex items-center gap-1 font-bold cursor-pointer transition-all ${
                      isPlaying 
                        ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                    id="btn-playback-play-toggle"
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-slate-950" />}
                    <span>{isPlaying ? 'Pause' : 'Animate'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentFrame((prev) => (prev + 1) % totalFrames);
                    }}
                    className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 transition-all font-sans cursor-pointer text-xs"
                    id="btn-playback-next"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrubber slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 leading-none">
                  <span>Playback Frame Selector</span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-slate-900 px-1 rounded">
                    Index {currentFrame}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={totalFrames - 1}
                  step="1"
                  value={currentFrame}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentFrame(parseInt(e.target.value));
                  }}
                  className="w-full accent-emerald-400 bg-slate-900 h-1.5 rounded cursor-pointer"
                  id="scrubber-timeline"
                />
              </div>

              {/* FPS Speed slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 leading-none">
                  <span>Speed (Frames per Sec)</span>
                  <span className="font-mono text-[10px] text-amber-400 bg-slate-900 px-1 rounded">
                    {fps} FPS
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded cursor-pointer"
                  id="scrubber-fps"
                />
              </div>

              {/* Sliced Exports operations */}
              <div className="flex flex-col min-[350px]:flex-row gap-2 border-t border-slate-850/80 pt-2 bg-slate-950">
                <button
                  onClick={() => downloadSingleFrame(currentFrame)}
                  className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] h-7 font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 transition-all cursor-pointer"
                  title="Download current active frame as transparent asset"
                  id="btn-export-current-frame"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Frame</span>
                </button>
                
                <button
                  onClick={downloadAllFrames}
                  className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] h-7 font-bold text-emerald-400 hover:text-emerald-300 bg-slate-900 hover:bg-slate-800 border border-emerald-950 rounded transition-all cursor-pointer"
                  title="Export all grid animation frames in sequential single files"
                  id="btn-export-all-frames-sequential"
                >
                  <FolderOpen className="w-3 h-3 text-emerald-400" />
                  <span>Download All Slices</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
