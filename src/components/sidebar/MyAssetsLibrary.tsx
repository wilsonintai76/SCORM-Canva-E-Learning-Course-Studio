import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { SavedCustomAsset, CanvasNode } from '../../types/schema';
import {
  Bookmark,
  BookmarkPlus,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  GripVertical,
  Layers,
  Sparkles,
  Square,
  Type,
  Image as ImageIcon,
  CreditCard,
  FolderHeart,
} from 'lucide-react';

export const MyAssetsLibrary: React.FC = () => {
  const {
    myAssets,
    saveSelectionToMyAssets,
    deleteMyAsset,
    renameMyAsset,
    addMyAssetToCanvas,
    selectedNodeIds,
    selectedNodeId,
    currentPage,
  } = useCourseStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSavingOpen, setIsSavingOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState<SavedCustomAsset['category']>('cards');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [justSavedNotice, setJustSavedNotice] = useState<string | null>(null);

  // Compute selected nodes from canvas
  const effectiveSelectionIds =
    selectedNodeIds && selectedNodeIds.length > 0
      ? selectedNodeIds
      : selectedNodeId
      ? [selectedNodeId]
      : [];
  const selectedNodes = currentPage?.nodes.filter((n) => effectiveSelectionIds.includes(n.id)) || [];

  const handleOpenSave = () => {
    if (selectedNodes.length === 0) return;
    // Suggest a default name
    let defaultName = 'Custom Asset';
    if (selectedNodes.length === 1) {
      const single = selectedNodes[0];
      if (single.type === 'text') {
        defaultName = (single as any).content?.slice(0, 24) || 'Custom Text Block';
      } else if (single.type === 'shape') {
        defaultName = `Custom ${(single as any).shapeType || 'Shape'}`;
      } else if (single.type === 'callout') {
        defaultName = (single as any).title || 'Custom Callout Card';
      } else if (single.type === 'image') {
        defaultName = 'Custom Image Badge';
      }
    } else {
      defaultName = `Group of ${selectedNodes.length} Elements`;
    }

    setSaveName(defaultName);
    if (selectedNodes.length > 1) {
      setSaveCategory('groups');
    } else {
      const type = selectedNodes[0].type;
      if (type === 'shape') setSaveCategory('shapes');
      else if (type === 'text') setSaveCategory('text');
      else if (type === 'image') setSaveCategory('icons');
      else setSaveCategory('cards');
    }
    setIsSavingOpen(true);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim() || selectedNodes.length === 0) return;
    const created = saveSelectionToMyAssets(saveName.trim(), saveCategory, effectiveSelectionIds);
    if (created) {
      setJustSavedNotice(`Saved "${created.name}"!`);
      setTimeout(() => setJustSavedNotice(null), 3000);
      setIsSavingOpen(false);
      setSaveName('');
    }
  };

  const handleStartRename = (asset: SavedCustomAsset) => {
    setEditingAssetId(asset.id);
    setEditingName(asset.name);
  };

  const handleSaveRename = (assetId: string) => {
    if (editingName.trim()) {
      renameMyAsset(assetId, editingName.trim());
    }
    setEditingAssetId(null);
  };

  const filteredAssets = myAssets.filter((asset) => {
    if (selectedCategory !== 'all' && asset.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = asset.name.toLowerCase().includes(q);
      const matchCat = asset.category.toLowerCase().includes(q);
      const matchDesc = asset.description?.toLowerCase().includes(q);
      const matchTags = asset.tags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchCat || matchDesc || matchTags;
    }
    return true;
  });

  const getCategoryIcon = (category: SavedCustomAsset['category']) => {
    switch (category) {
      case 'shapes':
        return <Square className="w-3.5 h-3.5 text-blue-400" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-indigo-400" />;
      case 'icons':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />;
      case 'groups':
        return <Layers className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <FolderHeart className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-slate-200">My Assets Library</h4>
          </div>
          <span className="text-[10px] text-sky-400 font-mono font-medium">
            {myAssets.length} Saved
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Save custom shapes, text blocks, badges, or grouped elements for drag-and-drop reuse across any slide.
        </p>
      </div>

      {/* Save Selection CTA Card */}
      <div className="p-2.5 rounded-xl border border-sky-500/30 bg-sky-950/20 backdrop-blur-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
            <BookmarkPlus className="w-4 h-4 text-sky-400" />
            <span>Save to My Assets</span>
          </div>
          {selectedNodes.length > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30">
              {selectedNodes.length} element{selectedNodes.length > 1 ? 's' : ''} selected
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">None selected</span>
          )}
        </div>

        {justSavedNotice && (
          <div className="p-1.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{justSavedNotice}</span>
          </div>
        )}

        {isSavingOpen ? (
          <form onSubmit={handleConfirmSave} className="space-y-2 pt-1 border-t border-sky-900/50">
            <div>
              <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Asset Name</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Branded Callout Card"
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Category</label>
              <select
                value={saveCategory}
                onChange={(e) => setSaveCategory(e.target.value as SavedCustomAsset['category'])}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-sky-500"
              >
                <option value="cards">Cards &amp; Callouts</option>
                <option value="groups">Groups</option>
                <option value="shapes">Shapes</option>
                <option value="text">Text Blocks</option>
                <option value="icons">Icons &amp; Badges</option>
              </select>
            </div>
            <div className="flex gap-1.5 pt-1">
              <button
                type="submit"
                disabled={!saveName.trim()}
                className="flex-1 py-1 px-2.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-[11px] flex items-center justify-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Save Asset</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSavingOpen(false)}
                className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            {selectedNodes.length > 0 ? (
              <button
                onClick={handleOpenSave}
                className="w-full py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save Current Selection</span>
              </button>
            ) : (
              <p className="text-[10px] text-slate-400 leading-normal italic">
                Select one or more items on the canvas to save them as a custom reusable asset.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter saved assets..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-slate-200 text-xs placeholder:text-slate-500 outline-none focus:border-sky-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'cards', label: 'Cards' },
          { id: 'groups', label: 'Groups' },
          { id: 'shapes', label: 'Shapes' },
          { id: 'text', label: 'Text' },
          { id: 'icons', label: 'Icons' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              selectedCategory === cat.id
                ? 'bg-sky-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Assets Grid */}
      <div className="space-y-3">
        {filteredAssets.map((asset) => {
          const isEditing = editingAssetId === asset.id;
          return (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/scorm-my-asset', JSON.stringify(asset));
                e.dataTransfer.setData(
                  'application/scorm-component-template',
                  JSON.stringify({ title: asset.name, nodes: asset.nodes })
                );
                e.dataTransfer.setData('text/plain', asset.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-sky-500/70 transition-all group shadow-sm cursor-grab active:cursor-grabbing relative select-none"
            >
              {/* Header / Title */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                  {getCategoryIcon(asset.category)}
                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="bg-slate-900 border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(asset.id);
                          if (e.key === 'Escape') setEditingAssetId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveRename(asset.id)}
                        className="p-1 rounded bg-sky-600 text-white hover:bg-sky-500"
                        title="Save name"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingAssetId(null)}
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-200 truncate" title={asset.name}>
                      {asset.name}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 uppercase font-mono">
                      {asset.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(asset);
                      }}
                      title="Rename Asset"
                      className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${asset.name}" from My Assets?`)) {
                          deleteMyAsset(asset.id);
                        }
                      }}
                      title="Delete Asset"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Miniature Scaled Preview Box */}
              <div
                onClick={() => addMyAssetToCanvas(asset.id)}
                className="w-full h-24 rounded-lg border border-slate-800/80 bg-slate-900/60 overflow-hidden relative mb-2 p-2 flex items-center justify-center cursor-pointer hover:border-sky-500/50 transition-colors"
              >
                {/* Visual miniature representation */}
                <div
                  className="relative pointer-events-none"
                  style={{
                    width: Math.min(220, asset.width),
                    height: Math.min(76, asset.height),
                    transform: `scale(${Math.min(1, 200 / Math.max(1, asset.width), 70 / Math.max(1, asset.height))})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {asset.nodes.map((node, i) => (
                    <div
                      key={node.id || i}
                      className="absolute overflow-hidden truncate"
                      style={{
                        left: node.x,
                        top: node.y,
                        width: node.width,
                        height: node.height,
                        zIndex: node.zIndex || 1,
                        background:
                          node.type === 'shape'
                            ? (node as any).fill || '#3b82f6'
                            : node.type === 'callout'
                            ? '#1e293b'
                            : 'transparent',
                        borderColor:
                          node.type === 'shape'
                            ? (node as any).stroke || 'transparent'
                            : node.type === 'callout'
                            ? '#38bdf8'
                            : 'transparent',
                        borderWidth: (node as any).strokeWidth || 1,
                        borderRadius: (node as any).borderRadius || 6,
                        color: (node as any).color || '#e2e8f0',
                        fontSize: Math.max(9, ((node as any).fontSize || 14) * 0.8),
                        fontWeight: (node as any).fontWeight || 'normal',
                        padding: 4,
                      }}
                    >
                      {node.type === 'text' && (node as any).content}
                      {node.type === 'callout' && (
                        <div className="text-[10px] leading-tight">
                          <strong className="block text-sky-400">{(node as any).title}</strong>
                          <span className="text-[9px] text-slate-300">{(node as any).content}</span>
                        </div>
                      )}
                      {node.type === 'shape' && (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-300/80">
                          {(node as any).shapeType || 'shape'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Drag Hint Overlay on hover */}
                <div className="absolute inset-0 bg-sky-950/80 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-sky-600 px-2.5 py-1 rounded-md shadow-lg">
                    <GripVertical className="w-3.5 h-3.5" />
                    <span>Drag or Click to Insert</span>
                  </div>
                </div>
              </div>

              {/* Meta & Insert CTA */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900">
                <span className="text-[10px] text-slate-500">
                  {asset.nodes.length} node{asset.nodes.length > 1 ? 's' : ''} ({asset.width}×{asset.height}px)
                </span>
                <button
                  onClick={() => addMyAssetToCanvas(asset.id)}
                  className="py-1 px-2 rounded bg-sky-900/60 hover:bg-sky-600 text-sky-200 hover:text-white font-medium transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Insert to Slide</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredAssets.length === 0 && (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 space-y-2">
            <Bookmark className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
            <p className="text-xs font-medium text-slate-400">No custom assets found</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Select any elements on your slide canvas and click "Save to My Assets" above to start building your library.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
