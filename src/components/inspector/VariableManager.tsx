import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { CourseVariable, TextNode } from '../../types/schema';
import { interpolateVariables } from '../../utils/variableInterpolator';
import {
  Code2,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  FileCode,
} from 'lucide-react';

export const VariableManager: React.FC = () => {
  const { course, selectedNode, updateNode, addVariable, updateVariable, deleteVariable } =
    useCourseStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<'string' | 'number' | 'boolean'>('string');
  const [newVarDefault, setNewVarDefault] = useState('');
  const [newVarDesc, setNewVarDesc] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const variables = course.variables || [];

  const handleCreateVariable = () => {
    if (!newVarName.trim()) return;
    addVariable({
      name: newVarName.trim().replace(/\s+/g, '_'),
      type: newVarType,
      defaultValue: newVarDefault || (newVarType === 'number' ? '0' : 'Value'),
      currentValue: newVarDefault || (newVarType === 'number' ? '0' : 'Value'),
      description: newVarDesc.trim() || undefined,
    });
    setNewVarName('');
    setNewVarDefault('');
    setNewVarDesc('');
    setIsAddOpen(false);
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

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold text-slate-200">Dynamic Variables</span>
        </div>
        <button
          onClick={() => setIsAddOpen(!isAddOpen)}
          className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>New Variable</span>
        </button>
      </div>

      <p className="text-[11px] text-slate-400 leading-tight">
        Insert <code className="text-blue-400 font-mono text-[10px]">{'{{variableName}}'}</code> into
        text boxes to dynamically render personalized learner data.
      </p>

      {/* Add Variable Form Drawer */}
      {isAddOpen && (
        <div className="p-2.5 rounded-lg bg-slate-900 border border-blue-500/50 space-y-2 animate-in zoom-in-95 duration-150">
          <span className="text-[11px] font-bold text-white block">Create Course Variable</span>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Variable Identifier:</label>
            <input
              type="text"
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              placeholder="e.g. employeeRole, passingMark"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Type:</label>
              <select
                value={newVarType}
                onChange={(e) => setNewVarType(e.target.value as any)}
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
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              onClick={() => setIsAddOpen(false)}
              className="px-2 py-0.5 text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateVariable}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Variables List */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
        {variables.map((v) => (
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
                {v.currentValue && v.currentValue !== v.defaultValue && (
                  <span className="ml-1 text-emerald-400">(Live: {v.currentValue})</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleInsertToken(v.name)}
                title={
                  selectedNode?.type === 'text'
                    ? 'Insert into selected text box'
                    : 'Copy {{token}} to clipboard'
                }
                className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 hover:text-white rounded text-[10px] font-medium flex items-center gap-1 transition-colors"
              >
                {copiedVar === `{{${v.name}}}` ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>Insert</span>
                  </>
                )}
              </button>

              <button
                onClick={() => deleteVariable(v.id)}
                title="Delete variable"
                className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live Variable Evaluation Sandbox */}
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
          Live Expression Evaluator:
        </span>
        <div className="bg-slate-900 border border-slate-800 rounded p-2 text-[11px] font-sans text-slate-300 leading-relaxed">
          {interpolateVariables(
            'Welcome {{userName}}! Current department: {{department}}. Passing threshold: {{passingScore}}%.',
            variables
          )}
        </div>
      </div>
    </div>
  );
};
