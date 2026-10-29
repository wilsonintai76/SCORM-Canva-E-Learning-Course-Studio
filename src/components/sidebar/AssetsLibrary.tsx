import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { AssetItem } from '../../types/schema';
import {
  Shield,
  Target,
  Award,
  Lightbulb,
  Zap,
  Terminal,
  Cpu,
  Globe,
  Plus,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  Upload,
  Search,
  Sparkles,
  Layers,
  Check,
  X,
  GripVertical,
} from 'lucide-react';

// Map icon names to Lucide icon components
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Shield,
  Target,
  Award,
  Lightbulb,
  Zap,
  Terminal,
  Cpu,
  Globe,
};

export const AssetsLibrary: React.FC = () => {
  const { assets, addCustomAsset, deleteAsset, bulkRenameAssets, addNode } = useCourseStore();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isBulkRenameOpen, setIsBulkRenameOpen] = useState(false);

  // Bulk Rename options
  const [renameMode, setRenameMode] = useState<'prefix' | 'replace' | 'sequence'>('prefix');
  const [renamePrefix, setRenamePrefix] = useState('mod1_');
  const [renameFind, setRenameFind] = useState('');
  const [renameReplaceWith, setRenameReplaceWith] = useState('');
  const [renameBaseName, setRenameBaseName] = useState('asset');

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    if (activeCategory !== 'all' && asset.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = asset.name.toLowerCase().includes(q);
      const matchTag = asset.tags.some((t) => t.toLowerCase().includes(q));
      return matchName || matchTag;
    }
    return true;
  });

  // Toggle selection for an asset
  const toggleSelectAsset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all visible assets
  const handleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map((a) => a.id));
    }
  };

  // Drag start handler for assets
  const handleDragStart = (e: React.DragEvent, asset: AssetItem) => {
    e.dataTransfer.setData('application/scorm-asset', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Click to add asset to active canvas slide
  const handleAddAssetToCanvas = (asset: AssetItem) => {
    if (asset.type === 'image' && asset.url) {
      addNode('image', { x: 120, y: 120 });
    } else if (asset.type === 'shape') {
      addNode('shape', { x: 140, y: 140 });
    } else {
      addNode('shape', { x: 160, y: 160 });
    }
  };

  // Upload Custom Asset
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const newAsset: AssetItem = {
        id: 'custom_asset_' + Date.now(),
        name: cleanName,
        category: 'images',
        type: 'image',
        url: dataUrl,
        width: 320,
        height: 200,
        tags: ['custom', 'uploaded', cleanName.toLowerCase()],
        isCustom: true,
      };
      addCustomAsset(newAsset);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Execute Bulk Rename
  const handleApplyBulkRename = () => {
    if (selectedAssetIds.length === 0) return;
    bulkRenameAssets(selectedAssetIds, {
      mode: renameMode,
      prefix: renamePrefix,
      find: renameFind,
      replaceWith: renameReplaceWith,
      baseName: renameBaseName,
    });
    setIsBulkRenameOpen(false);
    setSelectedAssetIds([]);
    setIsMultiSelectMode(false);
  };

  return (
    <div className="space-y-3.5">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-200">Assets & Graphics</h4>
          <span className="text-[10px] text-blue-400 font-medium">Drag to Canvas</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* File Upload Button */}
          <label
            title="Upload custom image asset"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs flex items-center cursor-pointer transition-colors border border-slate-700"
          >
            <Upload className="w-3.5 h-3.5" />
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Multi-select toggle */}
          <button
            onClick={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              if (isMultiSelectMode) setSelectedAssetIds([]);
            }}
            title="Toggle Multi-Select for Bulk Rename"
            className={`p-1.5 rounded text-xs flex items-center transition-colors border ${
              isMultiSelectMode
                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search icons, shapes, images..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'icons', label: 'Icons' },
          { id: 'shapes', label: 'Shapes' },
          { id: 'badges', label: 'Badges' },
          { id: 'images', label: 'Images' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Multi-select Action Bar */}
      {isMultiSelectMode && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-2 flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-[11px] text-blue-400 hover:underline font-medium"
            >
              {selectedAssetIds.length === filteredAssets.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-[11px] text-slate-400">
              ({selectedAssetIds.length} selected)
            </span>
          </div>

          <button
            disabled={selectedAssetIds.length === 0}
            onClick={() => setIsBulkRenameOpen(true)}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
          >
            <Edit2 className="w-3 h-3" />
            <span>Bulk Rename</span>
          </button>
        </div>
      )}

      {/* Bulk Rename Modal */}
      {isBulkRenameOpen && (
        <div className="bg-slate-950 border border-blue-500/50 rounded-xl p-3 shadow-xl space-y-3 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
              Bulk Rename ({selectedAssetIds.length} assets)
            </span>
            <button
              onClick={() => setIsBulkRenameOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg text-[10px] font-medium">
            <button
              onClick={() => setRenameMode('prefix')}
              className={`py-1 rounded text-center transition-colors ${
                renameMode === 'prefix' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Add Prefix
            </button>
            <button
              onClick={() => setRenameMode('replace')}
              className={`py-1 rounded text-center transition-colors ${
                renameMode === 'replace' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Find & Replace
            </button>
            <button
              onClick={() => setRenameMode('sequence')}
              className={`py-1 rounded text-center transition-colors ${
                renameMode === 'sequence' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sequential
            </button>
          </div>

          {/* Form fields by mode */}
          {renameMode === 'prefix' && (
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Prefix String:</label>
              <input
                type="text"
                value={renamePrefix}
                onChange={(e) => setRenamePrefix(e.target.value)}
                placeholder="e.g. mod1_"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {renameMode === 'replace' && (
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Find text:</label>
                <input
                  type="text"
                  value={renameFind}
                  onChange={(e) => setRenameFind(e.target.value)}
                  placeholder="e.g. asset_"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Replace with:</label>
                <input
                  type="text"
                  value={renameReplaceWith}
                  onChange={(e) => setRenameReplaceWith(e.target.value)}
                  placeholder="e.g. security_"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {renameMode === 'sequence' && (
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Base Name:</label>
              <input
                type="text"
                value={renameBaseName}
                onChange={(e) => setRenameBaseName(e.target.value)}
                placeholder="e.g. cyber_graphic"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                Will output: {renameBaseName}_01, {renameBaseName}_02...
              </span>
            </div>
          )}

          <div className="flex justify-end gap-1.5 pt-1">
            <button
              onClick={() => setIsBulkRenameOpen(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyBulkRename}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
            >
              Apply Rename
            </button>
          </div>
        </div>
      )}

      {/* Assets Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-0.5">
        {filteredAssets.map((asset) => {
          const isSelected = selectedAssetIds.includes(asset.id);
          const IconComponent = asset.iconName ? ICON_MAP[asset.iconName] : null;

          return (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => handleDragStart(e, asset)}
              onClick={() => {
                if (isMultiSelectMode) {
                  toggleSelectAsset(asset.id, {} as any);
                } else {
                  handleAddAssetToCanvas(asset);
                }
              }}
              className={`group relative p-2.5 rounded-lg border bg-slate-950/70 hover:bg-slate-800/90 cursor-grab active:cursor-grabbing transition-all flex flex-col items-center justify-between text-center min-h-[95px] ${
                isSelected
                  ? 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-950/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Checkbox for Multi-select */}
              {isMultiSelectMode && (
                <button
                  onClick={(e) => toggleSelectAsset(asset.id, e)}
                  className="absolute top-1.5 left-1.5 text-blue-400"
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400" />
                  )}
                </button>
              )}

              {/* Delete Custom Asset Button */}
              {asset.isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAsset(asset.id);
                  }}
                  title="Delete custom asset"
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              {/* Graphic Icon / Shape / Image Preview */}
              <div className="flex-1 flex items-center justify-center py-1">
                {asset.type === 'icon' && IconComponent && (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: `${asset.color || '#38bdf8'}20` }}
                  >
                    <IconComponent
                      className="w-5 h-5"
                    />
                  </div>
                )}

                {asset.type === 'shape' && (
                  <div
                    className="w-14 h-8 rounded shadow-sm border border-slate-700/60"
                    style={{
                      backgroundColor: asset.color || '#3b82f6',
                      borderRadius:
                        asset.shapeType === 'circle'
                          ? '9999px'
                          : asset.shapeType === 'badge'
                          ? '9999px'
                          : '4px',
                    }}
                  />
                )}

                {asset.type === 'image' && asset.url && (
                  <div className="w-16 h-10 rounded overflow-hidden border border-slate-700 bg-slate-900">
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Name Label */}
              <span className="text-[11px] font-medium text-slate-300 group-hover:text-white truncate max-w-full block mt-1">
                {asset.name}
              </span>
            </div>
          );
        })}

        {filteredAssets.length === 0 && (
          <div className="col-span-2 text-center py-8 text-slate-500 text-xs">
            No assets found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};
