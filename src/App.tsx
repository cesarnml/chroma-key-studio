/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  HelpCircle, 
  Layers, 
  Wand2, 
  AlertCircle,
  FolderLock
} from 'lucide-react';
import { ControlPanel } from './components/ControlPanel';
import { EditorWorkspace } from './components/EditorWorkspace';
import { SpriteSeparator } from './components/SpriteSeparator';
import { ChromaParams, FileData } from './types';
import { applyChromaKey } from './utils/chromaKey';

// Import our custom generated high-quality greenscreen spritesheet sample
import sampleImage from './assets/images/sample_spritesheet_1781776687253.jpg';

export default function App() {
  // 1. Core State Managers
  const [params, setParams] = useState<ChromaParams>({
    keyColor: '#00b140', // Professional industrial Chroma Green standard (Pantone 354 C)
    tolerance: 0.38,
    smoothness: 0.12,
    spill: 0.28,
    colorSpace: 'hsv', // Resilient HSV chromatic indexing (configured as default for custom hue selectivity)
    maskOnly: false,
    bgColor: 'grid',
    customBgColor: '#0ea5e9', // Deep sky blue for custom backdrops
  });

  // Track loaded asset meta
  const [imageFile, setImageFile] = useState<FileData | null>({
    url: sampleImage,
    name: 'sample_anime_girl_spritesheet.jpg',
    width: 1024,
    height: 683,
    aspectRatio: 1.5,
  });

  // Keep a reference to the active HTMLImageElement to synchronize drawings between widgets
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  // Toggle state to help users sample color
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);

  // 2. Action Handlers
  const handleImageLoad = (fileData: FileData, imgElement: HTMLImageElement) => {
    setImageFile(fileData);
    setImageElement(imgElement);

    // Dynamic keying adaptation:
    // When a user loads an image, inspect the central/side boundaries to see if we can pre-identify the chroma color
    // This is a premium "smart keying" feature that gets the background color automatically!
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgElement.naturalWidth;
      canvas.height = imgElement.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgElement, 0, 0);
        // sample point near top-left (e.g. 5% inset)
        const x = Math.round(imgElement.naturalWidth * 0.05);
        const y = Math.round(imgElement.naturalHeight * 0.05);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        // Verify we got a real color and convert to hex
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
        const hex = '#' + [clamp(r), clamp(g), clamp(b)].map(val => {
          const s = val.toString(16);
          return s.length === 1 ? '0' + s : s;
        }).join('');
        
        // Auto adapt primary settings
        setParams(prev => ({
          ...prev,
          keyColor: hex,
        }));
      }
    } catch (err) {
      console.warn('Unable to run smart-key auto detection:', err);
    }
  };

  const resetToSample = () => {
    setIsEyedropperActive(false);
    
    // Create new image container for sample refresh
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageFile({
        url: sampleImage,
        name: 'sample_anime_girl_spritesheet.jpg',
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });
      setImageElement(img);
      setParams({
        keyColor: '#00b140', // Professional industrial Chroma Green standard (Pantone 354 C)
        tolerance: 0.38,
        smoothness: 0.12,
        spill: 0.28,
        colorSpace: 'hsv',
        maskOnly: false,
        bgColor: 'grid',
        customBgColor: '#0ea5e9',
      });
    };
    img.src = sampleImage;
  };

  const handleSampleColor = (hex: string) => {
    setParams(prev => ({
      ...prev,
      keyColor: hex,
    }));
  };

  const downloadTransformedSheet = () => {
    if (!imageElement || !imageFile) return;

    const canvas = document.createElement('canvas');
    canvas.width = imageFile.width;
    canvas.height = imageFile.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw offscreen to generate raw buffer
    ctx.drawImage(imageElement, 0, 0);
    const sourceData = ctx.getImageData(0, 0, imageFile.width, imageFile.height);
    const targetData = ctx.createImageData(imageFile.width, imageFile.height);

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

    // Paint onto canvas bounds
    ctx.putImageData(targetData, 0, 0);

    // Format download anchors
    const anchor = document.createElement('a');
    anchor.download = `${imageFile.name.split('.')[0]}_transparent.png`;
    anchor.href = canvas.toDataURL('image/png');
    anchor.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">
      {/* Visual Top Branding Bar */}
      <header className="border-b border-slate-900 bg-slate-950 p-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 rounded-xl text-slate-950 shadow-md flex items-center justify-center font-bold">
              <Layers className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold font-sans tracking-tight text-slate-100">Chroma Key Studio</span>
                <span className="text-[10px] bg-slate-900 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-slate-800">
                  v1.2 PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Professional greenscreen remover & sprite sheet transparency generator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Reset Defaults button */}
            {imageFile?.name !== 'sample_anime_girl_spritesheet.jpg' && (
              <button
                onClick={resetToSample}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-all border border-slate-900"
                title="Discard your custom file and return to sample anime girl character sheet"
                id="btn-return-to-sample"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Sample</span>
              </button>
            )}
            
            {/* Quick documentation badge */}
            <div className="hidden min-[480px]:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span>Full Client-Side GPU Processing</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Welcome Instructions bar */}
        <div className="relative bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-slate-900/20 border border-emerald-950/50 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl" id="studio-welcome-instructions">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl mt-0.5 flex-shrink-0">
              <Wand2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                How to use Chroma key tool:
              </h3>
              <p className="text-xs text-slate-400 leading-normal max-w-3xl mt-0.5">
                Our pre-loaded sample spritesheet (resembling the character you provided!) has been loaded and keyed out automatically. Feel free to adjust the sliders on the right, click
                the <strong className="text-emerald-400">Eyedropper</strong> to choose any custom shade, drag around the compare split slider, or load your own customized games asset files!
              </p>
            </div>
          </div>
        </div>

        {/* Layout Grid: Workspace Board & Control Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Workboard Canvas Component - spans 8/12ths */}
          <div className="lg:col-span-8 flex flex-col h-full" id="board-workspace-container">
            <EditorWorkspace
              imageFile={imageFile}
              onImageLoad={handleImageLoad}
              onUploadClick={resetToSample}
              onSampleColor={handleSampleColor}
              isEyedropperActive={isEyedropperActive}
              setIsEyedropperActive={setIsEyedropperActive}
              params={params}
              onDownloadFull={downloadTransformedSheet}
            />
          </div>

          {/* Control parameters panel - spans 4/12ths */}
          <div className="lg:col-span-4 h-full" id="board-controls-container">
            <ControlPanel
              params={params}
              onChangeParams={setParams}
              onReset={resetToSample}
              isEyedropperActive={isEyedropperActive}
              setIsEyedropperActive={setIsEyedropperActive}
            />
          </div>

        </div>

        {/* Sprite sheets Slicer module - Visible when image is loaded */}
        {imageFile && (
          <div className="mt-2" id="workspace-slicing-and-previews">
            <SpriteSeparator
              imageFile={imageFile}
              params={params}
              imageElement={imageElement}
            />
          </div>
        )}

      </main>

      {/* Humble Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center mt-auto text-xs text-slate-500 select-none">
        <p className="font-medium">Chroma Key Studio • Pure Client-Side Frame Generation</p>
        <p className="text-[10px] text-slate-600 mt-1">
          Secure. All pixel manipulation runs fully within your local browser sandbox.
        </p>
      </footer>
    </div>
  );
}
