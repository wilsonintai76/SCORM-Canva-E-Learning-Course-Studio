import React, { useEffect, useState } from 'react';
import {
  AI_PROVIDERS,
  AiProviderId,
  AiSettings,
  loadAiSettings,
  providerInfo,
  resolveAiSettings,
  saveAiSettings,
  validateAiSettings,
} from '../../services/aiSettings';
import { loadApiKey, saveApiKey } from '../../services/aiKeyStore';
import { testAiConnection } from '../../services/aiService';
import { listOllamaModels } from '../../services/aiProviders';
import { Check, ExternalLink, KeyRound, Loader2, Lock, Server, TriangleAlert } from 'lucide-react';

interface Props {
  onSettingsChange?: (settings: AiSettings) => void;
}

type Status = { kind: 'idle' | 'testing' | 'ok' | 'error'; message?: string };

export const AiSettingsPanel: React.FC<Props> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings());
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [encrypted, setEncrypted] = useState<boolean | null>(null);
  const [savedNotice, setSavedNotice] = useState('');
  const [localModels, setLocalModels] = useState<string[]>([]);

  const info = providerInfo(settings.provider);
  const isDesktop = typeof window !== 'undefined' && Boolean(window.desktop?.secretSet);

  useEffect(() => {
    let active = true;
    void loadApiKey(settings.provider).then((key) => {
      if (active) setApiKey(key);
    });
    return () => {
      active = false;
    };
  }, [settings.provider]);

  useEffect(() => {
    if (settings.provider !== 'ollama') {
      setLocalModels([]);
      return;
    }
    let active = true;
    void listOllamaModels(settings.baseUrl)
      .then((models) => {
        if (active) setLocalModels(models);
      })
      .catch(() => {
        if (active) setLocalModels([]);
      });
    return () => {
      active = false;
    };
  }, [settings.provider, settings.baseUrl]);

  const selectProvider = (id: AiProviderId) => {
    const next = resolveAiSettings({ provider: id });
    setSettings(next);
    setStatus({ kind: 'idle' });
    setSavedNotice('');
    saveAiSettings(next);
    onSettingsChange?.(next);
  };

  const handleTest = async () => {
    setStatus({ kind: 'testing', message: 'Contacting provider…' });
    const result = await testAiConnection(settings, apiKey);
    setStatus({ kind: result.ok ? 'ok' : 'error', message: result.message });
  };

  const handleSave = async () => {
    const validation = validateAiSettings(settings, apiKey);
    if (!validation.ok) {
      setStatus({ kind: 'error', message: validation.error });
      return;
    }

    saveAiSettings(settings);
    const stored = await saveApiKey(settings.provider, apiKey.trim());
    setEncrypted(stored.encrypted);
    onSettingsChange?.(settings);
    setStatus({ kind: 'ok', message: `Saved for ${info.label}.` });
    setSavedNotice(stored.encrypted ? 'Key encrypted by the OS' : 'Key saved locally on this device');
    setTimeout(() => setSavedNotice(''), 4000);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Provider
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {AI_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => selectProvider(provider.id)}
              className={`px-2.5 py-2 rounded-lg border text-left transition-colors ${
                settings.provider === provider.id
                  ? 'border-blue-500 bg-blue-950/60 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {provider.isLocal ? (
                  <Server className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                )}
                <span className="text-[11px] font-semibold truncate">{provider.label}</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                {provider.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {info.requiresKey && (
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            {info.label} API key
          </label>
          <div className="relative">
            <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your key — stored only on this device"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Model</label>
          <input
            type="text"
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            placeholder={info.model || 'model-name'}
            spellCheck={false}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Base URL</label>
          <input
            type="text"
            value={settings.baseUrl}
            onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
            placeholder={info.baseUrl}
            spellCheck={false}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {info.isLocal && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50">
          <Server className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-[10px] text-emerald-200 leading-relaxed">
              {localModels.length > 0
                ? `${localModels.length} model${localModels.length === 1 ? '' : 's'} detected on this computer. Runs offline.`
                : settings.provider === 'ollama'
                  ? 'No models detected. Start Ollama, then run: ollama pull llama3.1'
                  : 'Runs locally. Start your local server before generating.'}
            </p>
            {localModels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {localModels.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setSettings({ ...settings, model })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      settings.model === model
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'border-emerald-800 text-emerald-200 hover:border-emerald-500 hover:text-white'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={status.kind === 'testing'}
          className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-200 hover:border-blue-500 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {status.kind === 'testing' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ExternalLink className="w-3.5 h-3.5" />
          )}
          Test connection
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          Save settings
        </button>
      </div>

      {status.message && (
        <div
          className={`flex items-start gap-2 p-2 rounded-lg border text-[10px] leading-relaxed ${
            status.kind === 'ok'
              ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200'
              : status.kind === 'error'
                ? 'bg-rose-950/60 border-rose-700/60 text-rose-200'
                : 'bg-slate-950 border-slate-700 text-slate-300'
          }`}
        >
          {status.kind === 'error' && <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
          <span className="wrap-break-word">{status.message}</span>
        </div>
      )}

      {savedNotice && <div className="text-[10px] text-slate-400">{savedNotice}</div>}

      <p className="text-[10px] text-slate-500 leading-relaxed">
        {isDesktop
          ? 'Keys are encrypted with the Windows credential vault and never leave this computer.'
          : 'Running in a browser: keys are stored in local storage for this site.'}{' '}
        Requests go straight from your machine to the provider — no proxy server.
      </p>
    </div>
  );
};
