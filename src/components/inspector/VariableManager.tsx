import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { CourseVariable, TextNode } from '../../types/schema';
import { interpolateVariables } from '../../utils/variableInterpolator';
import {
  Code2,
  Plus,
  Trash2,
  Edit2,
  Check,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

export const VariableManager: React.FC = () => {
  const {
    course,
    selectedNode,
    showVariablePreview,
    setShowVariablePreview,
    updateNode,
    addVariable,
    updateVariable,
    deleteVariable,
  } = useCourseStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<'string' | 'number' | 'boolean'>('string');
  const [newVarDefault, setNewVarDefault] = useState('');
  const [newVarDesc, setNewVarDesc] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<CourseVariable>>({});
  const [sandboxExpr, setSandboxExpr] = useState(
    'Welcome {{user_name}}! Your score is {{score}}% (Pass: {{passingScore}}%).'
  );

  const variables = course.variables || [];

  const handleCreateVariable = () => {
    if (!newVarName.trim()) return;
    addVariable({
      name: newVarName.trim().replace(/\s+/g, '_'),
      type: newVarType,
      defaultValue: newVarDefault || (newVarType === 'number' ? '0' : newVarType === 'boolean' ? 'false' : 'Value'),
      currentValue: newVarDefault || (newVarType === 'number' ? '0' : newVarType === 'boolean' ? 'false' : 'Value'),
      description: newVarDesc.trim() || undefined,
    });
    setNewVarName('');
    setNewVarDefault('');
    setNewVarDesc('');
    setIsAddOpen(false);
  };

  const handleStartEdit = (v: CourseVariable) => {
    setEditingVarId(v.id);
    setEditDraft({
      name: v.name,
      type: v.type,
      defaultValue: v.defaultValue,
      currentValue: v.currentValue ?? v.defaultValue,
      description: v.description || '',
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editDraft.name?.trim()) return;
    updateVariable(id, {
      name: editDraft.name.trim().replace(/[^a-zA-Z0-9_-]/g, ''),
      type: editDraft.type || 'string',
      defaultValue: editDraft.defaultValue ?? '',
      currentValue: editDraft.currentValue ?? editDraft.defaultValue ?? '',
      description: editDraft.description?.trim() || undefined,
    });
    setEditingVarId(null);
  };

  // Insert {{variable}} token into currently selected text element if available
  const handleInsertToken = (varName: string) => {
    const token = `{{${varName}}}`;
    if (selectedNode && selectedNode.type === 'text') {
      const textNode = selectedNode as TextNode;
      updateNode(textNode.id, {
        content: `${textNode.content} ${token}`,
      });
    } else {
      navigator.clipboard.writeText(token);
      setCopiedVar(token);
      setTimeout(() => setCopiedVar(null), 2000);
    }
  };

  const quickPresets: { name: string; type: 'string' | 'number'; defaultValue: string; currentValue: string; description: string }[] = [
    { name: 'score', type: 'number', defaultValue: '0', currentValue: '85', description: 'Learner quiz score (%)' },
    { name: 'user_name', type: 'string', defaultValue: 'Learner', currentValue: 'Alex Rivera', description: 'Learner display name' },
    { name: 'learner_role', type: 'string', defaultValue: 'Specialist', currentValue: 'Security Analyst', description: 'Learner job role' },
  ];

  const missingPresets = quickPresets.filter(
    (p) => !variables.some((v) => v.name === p.name)
  );

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold text-slate-200">Global Variables</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowVariablePreview(!showVariablePreview)}
            title="Toggle live variable value preview on canvas vs raw {{token}} view"
            className={`px-1.5 py-1 rounded text-[10px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
              showVariablePreview
                ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {showVariablePreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>{showVariablePreview ? 'Live' : 'Raw'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(!isAddOpen)}
            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-tight">
        Define custom variables and inject <code className="text-blue-400 font-mono text-[10px]">{'{{score}}'}</code> or{' '}
        <code className="text-blue-400 font-mono text-[10px]">{'{{user_name}}'}</code> into any slide text element.
      </p>

      {/* Quick Starter Presets if missing */}
      {missingPresets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[10px] text-slate-500 mr-0.5">Quick add:</span>
          {missingPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => addVariable(preset)}
              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-blue-950 border border-slate-700 hover:border-blue-500/60 text-[10px] font-mono text-sky-300 transition-colors cursor-pointer"
            >
              + {preset.name}
            </button>
          ))}
        </div>
      )}

      {/* Add Variable Form Drawer */}
      {isAddOpen && (
        <div className="p-2.5 rounded-lg bg-slate-900 border border-blue-500/50 space-y-2 animate-in zoom-in-95 duration-150">
          <span className="text-[11px] font-bold text-white block">Create Global Variable</span>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Variable Identifier:</label>
            <input
              type="text"
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              placeholder="e.g. score, user_name, badge_level"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Type:</label>
              <select
                value={newVarType}
                onChange={(e) => setNewVarType(e.target.value as 'string' | 'number' | 'boolean')}
                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-200 outline-none"
              >
                <option value="string">Text (String)</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Default Value:</label>
              <input
                type="text"
                value={newVarDefault}
                onChange={(e) => setNewVarDefault(e.target.value)}
                placeholder="Default val"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Description (optional):</label>
            <input
              type="text"
              value={newVarDesc}
              onChange={(e) => setNewVarDesc(e.target.value)}
              placeholder="Purpose in course"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-2 py-0.5 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateVariable}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Variables List */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
        {variables.map((v) => {
          const isEditing = editingVarId === v.id;

          if (isEditing) {
            return (
              <div
                key={v.id}
                className="p-2.5 rounded-lg bg-slate-900 border border-sky-500/60 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-sky-400">Edit Variable</span>
                  <button
                    type="button"
                    onClick={() => setEditingVarId(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9px] text-slate-400 block">Name</label>
                    <input
                      type="text"
                      value={editDraft.name || ''}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Type</label>
                    <select
                      value={editDraft.type || 'string'}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          type: e.target.value as 'string' | 'number' | 'boolean',
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-white"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9px] text-slate-400 block">Default</label>
                    <input
                      type="text"
                      value={editDraft.defaultValue || ''}
                      onChange={(e) => setEditDraft({ ...editDraft, defaultValue: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Preview Value</label>
                    <input
                      type="text"
                      value={editDraft.currentValue || ''}
                      onChange={(e) => setEditDraft({ ...editDraft, currentValue: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-emerald-300"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(v.id)}
                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-semibold cursor-pointer"
                  >
                    Update
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={v.id}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs group"
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-blue-400 font-semibold truncate text-[11px]">
                    {'{{' + v.name + '}}'}
                  </span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                    {v.type}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  Default: <span className="text-slate-300 font-medium">"{v.defaultValue}"</span>
                  {v.currentValue !== undefined && v.currentValue !== v.defaultValue && (
                    <span className="ml-1 text-emerald-400">(Live: {v.currentValue})</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleInsertToken(v.name)}
                  title={
                    selectedNode?.type === 'text'
                      ? 'Inject into selected text element'
                      : 'Copy {{token}} to clipboard'
                  }
                  className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 hover:text-white rounded text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedVar === `{{${v.name}}}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Inject</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleStartEdit(v)}
                  title="Edit variable default / preview value"
                  className="p-1 text-slate-500 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => deleteVariable(v.id)}
                  title="Delete variable"
                  className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Live Variable Evaluation Sandbox */}
      <div className="pt-2 border-t border-slate-800 space-y-1.5">
        <span className="text-[10px] uppercase font-bold text-slate-400 block">
          Live Expression Tester:
        </span>
        <input
          type="text"
          value={sandboxExpr}
          onChange={(e) => setSandboxExpr(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] font-mono text-sky-300 outline-none focus:border-blue-500"
        />
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2 text-[11px] font-sans text-emerald-300 leading-relaxed">
          {interpolateVariables(sandboxExpr, variables)}
        </div>
      </div>
    </div>
  );
};
