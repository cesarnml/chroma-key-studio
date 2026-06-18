/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Pipette, 
  Split, 
  Eye, 
  Download, 
  Check, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { ChromaParams, FileData } from '../types';
import { applyChromaKey, hexToRgb, rgbToHex } from '../utils/chromaKey';

interface EditorWorkspaceProps {
  imageFile: FileData | null;
  onImageLoad: (data: FileData, imgElement: HTMLImageElement) => void;
  onUploadClick: () => void;
  onSampleColor: (hex: string) => void;
  isEyedropperActive: boolean;
  setIsEyedropperActive: (active: boolean) => void;
  params: ChromaParams;
  onDownloadFull: () => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  imageFile,
  onImageLoad,
  onSampleColor,
  isEyedropperActive,
  setIsEyedropperActive,
  params,
  onDownloadFull,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Compare mode states
  const [useCompare, setUseCompare] = useState<boolean>(false);
  const [splitRatio, setSplitRatio] = useState<number>(0.5);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Handle local image file load
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        onImageLoad({
          url,
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
        }, img);
        imageElementRef.current = img;
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Run chroma key on canvas
  useEffect(() => {
    if (!canvasRef.current || !imageFile || !imageElementRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageElementRef.current;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    canvas.width = w;
    canvas.height = h;

    // Create temp canvases for source and destination buffer processing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw original image to temp canvas
    tempCtx.drawImage(img, 0, 0, w, h);
    const sourceData = tempCtx.getImageData(0, 0, w, h);
    
    // Create output buffer
    const targetData = ctx.createImageData(w, h);

    // Run custom high performance keying calculations
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

    // Prepare buffer render
    const keyedCanvas = document.createElement('canvas');
    keyedCanvas.width = w;
    keyedCanvas.height = h;
    const keyedCtx = keyedCanvas.getContext('2d');
    if (keyedCtx) {
      keyedCtx.putImageData(targetData, 0, 0);
    }

    // Now render on output visible canvas based on view states
    ctx.clearRect(0, 0, w, h);

    // Helper functions to draw backgrounds
    const fillBackground = (c: CanvasRenderingContext2D) => {
      if (params.maskOnly) {
        c.fillStyle = '#000000';
        c.fillRect(0, 0, w, h);
        return;
      }

      if (params.bgColor === 'grid') {
        const size = Math.max(8, Math.round(w / 80)); // scale grid checkerboard proportionally
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#e2e8f0'; // light gray checkers
        for (let y = 0; y < h; y += size * 2) {
          for (let x = 0; x < w; x += size * 2) {
            c.fillRect(x, y, size, size);
            c.fillRect(x + size, y + size, size, size);
          }
        }
      } else if (params.bgColor === 'black') {
        c.fillStyle = '#000000';
        c.fillRect(0, 0, w, h);
      } else if (params.bgColor === 'white') {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
      } else if (params.bgColor === 'custom') {
        c.fillStyle = params.customBgColor;
        c.fillRect(0, 0, w, h);
      }
    };

    if (useCompare && !params.maskOnly) {
      // SPLIT COMPARE VIEW
      const boundaryX = Math.round(w * splitRatio);

      // Draw original green screen image on the LEFT side of canvas
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, boundaryX, h);
      ctx.clip();
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();

      // Draw transparency background and keyed image on the RIGHT side
      ctx.save();
      ctx.beginPath();
      ctx.rect(boundaryX, 0, w - boundaryX, h);
      ctx.clip();
      fillBackground(ctx);
      ctx.drawImage(keyedCanvas, 0, 0, w, h);
      ctx.restore();

      // Draw division boundary marker
      ctx.lineWidth = Math.max(2, Math.round(w / 250));
      ctx.strokeStyle = '#34d399'; // Emerald-400
      ctx.beginPath();
      ctx.moveTo(boundaryX, 0);
      ctx.lineTo(boundaryX, h);
      ctx.stroke();

      // Draw slider control circle
      const radius = Math.max(10, Math.round(w / 40));
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(boundaryX, h / 2, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.lineWidth = Math.max(1, Math.round(w / 400));
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(boundaryX, h / 2, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw split indicator symbol (< > inside handle)
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(radius * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↔', boundaryX, h / 2);
    } else {
      // FULL OUTPUT VIEW
      fillBackground(ctx);
      ctx.drawImage(keyedCanvas, 0, 0, w, h);
    }

  }, [imageFile, params, useCompare, splitRatio]);

  // Handle image mouse movements/clicks for Eyedropper sampling or Compare slider
  const handleCanvasInteraction = (
    clientX: number,
    clientY: number,
    type: 'down' | 'move' | 'up'
  ) => {
    if (!canvasRef.current || !imageElementRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Interpolate screen coordinates to actual native canvas pixel locations
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = Math.round((clientX - rect.left) * scaleX);
    const clickY = Math.round((clientY - rect.top) * scaleY);

    if (isEyedropperActive) {
      if (type === 'down' || type === 'move') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx && imageElementRef.current) {
          tempCtx.drawImage(imageElementRef.current, 0, 0);
          try {
            const pixel = tempCtx.getImageData(clickX, clickY, 1, 1).data;
            const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
            setHoveredColor(hex);
            
            if (type === 'down') {
              onSampleColor(hex);
              setIsEyedropperActive(false);
              setHoveredColor(null);
            }
          } catch (err) {
            console.error('Error fetching pixel color', err);
          }
        }
      }
      return;
    }

    if (useCompare && !params.maskOnly) {
      const sliderX = canvas.width * splitRatio;
      const clickTolerance = rect.width * 0.05 * scaleX; // 5% area hover grab tolerance

      if (type === 'down' && Math.abs(clickX - sliderX) < clickTolerance) {
        setIsDraggingSlider(true);
      } else if (type === 'move' && isDraggingSlider) {
        const ratio = Math.max(0, Math.min(1, clickX / canvas.width));
        setSplitRatio(ratio);
      } else if (type === 'up') {
        setIsDraggingSlider(false);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleCanvasInteraction(e.clientX, e.clientY, 'down');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleCanvasInteraction(e.clientX, e.clientY, 'move');
  };

  const handleMouseUp = () => {
    handleCanvasInteraction(0, 0, 'up');
  };

  // Pre-load reference so that when component mounts we attach the loaded Image
  useEffect(() => {
    if (imageFile && !imageElementRef.current) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageElementRef.current = img;
        onImageLoad(imageFile, img);
      };
      img.src = imageFile.url;
    }
  }, [imageFile]);

  return (
    <div className="flex flex-col gap-4 h-full" ref={containerRef}>
      {/* Visual Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800/80 rounded-lg text-emerald-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-200 truncate max-w-[200px] md:max-w-[320px]">
              {imageFile ? imageFile.name : 'Upload Sprite Sheet / Image'}
            </h1>
            {imageFile && (
              <p className="text-[11px] text-slate-400 font-mono">
                Canvas size: {imageFile.width}x{imageFile.height}px
              </p>
            )}
          </div>
        </div>

        {imageFile && (
          <div className="flex items-center gap-2">
            {/* Compare sliding split toggle */}
            {!params.maskOnly && (
              <button
                onClick={() => setUseCompare(!useCompare)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  useCompare 
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                    : 'bg-slate-850/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="Toggle interactive sliding compare view (Before vs After)"
                id="btn-compare-split"
              >
                <Split className="w-3.5 h-3.5" />
                <span>Compare split</span>
              </button>
            )}

            {/* Direct download fully keyed transparent sprite sheet */}
            <button
              onClick={onDownloadFull}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-all shadow-md active:scale-95"
              title="Download full transparent sheet as PNG"
              id="btn-download-full"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Transparent Sheet</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Workboard Area */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 min-h-[380px] flex items-center justify-center border-2 rounded-2xl relative transition-all duration-300 overflow-hidden ${
          isDragOver 
            ? 'border-emerald-500 bg-emerald-950/15'
            : 'border-dashed border-slate-800 bg-slate-950 shadow-inner'
        }`}
        onMouseUp={handleMouseUp}
      >
        {imageFile ? (
          <div className="relative max-w-full max-h-full p-6 flex flex-col items-center justify-center">
            {/* Display Canvas with exact coordinates sampling */}
            <div className="relative border border-slate-850 rounded-xl overflow-hidden shadow-2xl bg-neutral-900 group">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                className={`max-w-full block select-none h-auto transition-transform ${
                  isEyedropperActive ? 'cursor-cell border-2 border-emerald-400' : 'cursor-default'
                }`}
                style={{ maxHeight: '600px' }}
                id="workspace-main-canvas"
              />

              {/* Eyedropper Live Hover Magnifier Badge */}
              {isEyedropperActive && hoveredColor && (
                <div 
                  className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl"
                  id="eyedropper-color-badge"
                >
                  <span 
                    className="w-4.5 h-4.5 rounded-full border border-slate-600 block animate-pulse" 
                    style={{ backgroundColor: hoveredColor }}
                  />
                  <span className="text-xs text-slate-300 font-mono uppercase font-bold">
                    {hoveredColor}
                  </span>
                </div>
              )}
            </div>

            {/* Help Overlay when Interactive Eyedropper is Active */}
            {isEyedropperActive && (
              <div 
                className="absolute inset-0 bg-slate-950/25 pointer-events-none flex items-center justify-center"
                id="eyedropper-help-overlay"
              >
                <div className="text-center bg-slate-900 border border-slate-800 py-3 px-5 rounded-xl flex items-center gap-2.5 shadow-2xl">
                  <Pipette className="w-5 h-5 text-emerald-400 animate-bounce" />
                  <span className="text-xs text-slate-200 font-semibold font-sans">
                    Click anywhere on the green screen inside the picture to clear it!
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty / Upload Invitation Area */
          <div className="flex flex-col items-center text-center p-8 max-w-md animate-fadeIn" id="upload-invitation-area">
            <div className="mb-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-emerald-400">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-1 leading-snug">
              Key Out Your Greenscreen Image
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Drag and drop any green screen image or sprite sheet here, or click upload to select.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
              id="btn-upload-file-selector"
            >
              Select Image File
            </button>
            <p className="text-[10px] text-slate-500 mt-4 select-none font-sans flex items-center gap-1.5 justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              PNG, JPG, WebP, SVG supported
            </p>
          </div>
        )}

        {/* Input file selector element */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          id="file-input-element"
        />
      </div>
    </div>
  );
};
