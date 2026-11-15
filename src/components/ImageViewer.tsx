import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Sliders,
  Sun,
  Eye
} from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  fileName: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, fileName }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [filterMode, setFilterMode] = useState<'normal' | 'contrast' | 'invert' | 'grayscale'>('normal');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFilterMode('normal');
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const getFilterStyle = () => {
    switch (filterMode) {
      case 'contrast':
        return 'contrast(180%) brightness(105%) grayscale(50%)';
      case 'invert':
        return 'invert(100%) contrast(150%)';
      case 'grayscale':
        return 'grayscale(100%) contrast(120%)';
      default:
        return 'none';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 border-r border-slate-800 overflow-hidden relative select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg pointer-events-auto text-xs text-slate-300 font-medium truncate max-w-xs flex items-center space-x-2">
          <Eye className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="truncate">{fileName || 'Bill Preview'}</span>
        </div>

        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 p-1 rounded-xl shadow-lg pointer-events-auto flex items-center space-x-1">
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            onClick={handleRotate}
            title="Rotate 90°"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          {/* Visual enhancement filter */}
          <button
            onClick={() => {
              const modes: Array<'normal' | 'contrast' | 'invert' | 'grayscale'> = ['normal', 'contrast', 'grayscale', 'invert'];
              const next = modes[(modes.indexOf(filterMode) + 1) % modes.length];
              setFilterMode(next);
            }}
            title={`Enhance Image (Current: ${filterMode})`}
            className={`p-1.5 rounded-lg transition-colors flex items-center space-x-1 text-xs ${
              filterMode !== 'normal'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[10px] capitalize">{filterMode}</span>
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            onClick={handleReset}
            title="Reset View"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {imageUrl ? (
          <div
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className="flex items-center justify-center shadow-2xl rounded-lg overflow-hidden border border-slate-700/50"
          >
            <img
              src={imageUrl}
              alt="Bill document"
              style={{ filter: getFilterStyle() }}
              className="max-h-[75vh] max-w-[45vw] object-contain rounded bg-white"
            />
          </div>
        ) : (
          <div className="text-center text-slate-600">
            <Sun className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No bill image preview available</p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-slate-900 bg-slate-900/60 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Tip: Toggle "Enhance" mode for faded thermal receipts.</span>
        <span>Rotation: {rotation}°</span>
      </div>
    </div>
  );
};
