import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {Cue, SubtitleStyle, VideoMetadata} from '@shared/subtitles';
import {defaultSubtitleStyle, migrateStyle, normalizeSegmentsToCues, updateCueText} from '@shared/subtitles';
import {validateStyle} from '@shared/schema';
import type {ExportProgressPayload} from '@shared/ipc';
import {VideoPreview} from './components/VideoPreview';

const fontWeightOptions = [
  {value: 400, label: 'Regular'},
  {value: 500, label: 'Medium'},
  {value: 600, label: 'Semibold'},
  {value: 700, label: 'Bold'},
  {value: 800, label: 'Extra Bold'},
  {value: 900, label: 'Black'},
];

type ExportModalState = {
  phase: 'hidden' | 'running' | 'done';
  stage: ExportProgressPayload['phase'];
  progress: number;
  renderedFrames: number;
  encodedFrames: number;
  canceling: boolean;
  outputPath: string | null;
};

const hiddenExportModal = (): ExportModalState => ({
  phase: 'hidden',
  stage: 'preparing',
  progress: 0,
  renderedFrames: 0,
  encodedFrames: 0,
  canceling: false,
  outputPath: null,
});

const StyleBar: React.FC<{style: SubtitleStyle; onChange: (s: SubtitleStyle) => void; errors: string[]}> = ({style, onChange, errors}) => (
  <div className="style-bar">
    <div className="style-row">
      <label className="field-inline">
        <span>Font</span>
        <select value={style.fontFamily} onChange={(e) => onChange({...style, fontFamily: e.target.value})}>
          <option value="Arial, Helvetica, sans-serif">Arial</option>
          <option value="Helvetica Neue, Helvetica, sans-serif">Helvetica Neue</option>
          <option value="Impact, Haettenschweiler, sans-serif">Impact</option>
          <option value="Verdana, Geneva, sans-serif">Verdana</option>
          <option value="Trebuchet MS, sans-serif">Trebuchet MS</option>
          <option value="Futura, sans-serif">Futura</option>
          <option value="Avenir Next, Avenir, sans-serif">Avenir Next</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="Courier New, monospace">Courier New</option>
        </select>
      </label>
      <label className="field-inline field-sm">
        <span>Weight</span>
        <select value={style.fontWeight} onChange={(e) => onChange({...style, fontWeight: Number(e.target.value)})}>
          {fontWeightOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
      <label className="field-inline field-narrow">
        <span>Size</span>
        <input type="number" max={128} value={style.fontSize} onChange={(e) => onChange({...style, fontSize: Number(e.target.value)})} />
      </label>
    </div>
    <div className="style-row">
      <label className="field-inline field-color">
        <span>Text color</span>
        <input type="color" value={style.textColor} onChange={(e) => onChange({...style, textColor: e.target.value})} />
      </label>
      <label className="field-inline field-color">
        <span>Box color</span>
        <div className="color-pair">
          <input type="color" value={style.boxColor} onChange={(e) => onChange({...style, boxColor: e.target.value})} />
          <input type="number" min={0} max={1} step={0.01} value={Number(style.boxOpacity.toFixed(2))} onChange={(e) => onChange({...style, boxOpacity: Number(e.target.value)})} title="Opacity" />
        </div>
      </label>
      <label className="field-inline field-narrow">
        <span>Max width</span>
        <input type="number" min={20} max={100} value={style.maxWidth} onChange={(e) => onChange({...style, maxWidth: Number(e.target.value)})} />
      </label>
    </div>
    {errors.length > 0 && <div className="style-errors">{errors.join(' · ')}</div>}
  </div>
);

export const App: React.FC = () => {
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [cues, setCues] = useState<Cue[]>([]);
  const [style, setStyle] = useState<SubtitleStyle>(() => migrateStyle(defaultSubtitleStyle()));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<'openai' | 'mock' | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [exportModal, setExportModal] = useState<ExportModalState>(hiddenExportModal);
  const exportCancelRequestedRef = useRef(false);

  const phase = !video ? 'empty' : cues.length > 0 ? 'transcribed' : 'loaded';

  useEffect(() => {
    window.appBridge.getSavedApiKey().then(setApiKey).catch(() => undefined);
  }, []);

  useEffect(() => {
    return window.appBridge.onExportProgress((progress) => {
      setExportModal((current) => ({
        phase: 'running',
        stage: progress.phase,
        progress: Math.max(current.phase === 'hidden' ? 0 : current.progress, progress.progress),
        renderedFrames: progress.renderedFrames,
        encodedFrames: progress.encodedFrames,
        canceling: current.canceling,
        outputPath: current.outputPath,
      }));
    });
  }, []);

  const styleErrors = useMemo(() => validateStyle(style), [style]);

  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  const handleImport = async () => {
    setBusy(true);
    try {
      const result = await window.appBridge.importVideo();
      if (!result.canceled && result.video) {
        setVideo(result.video);
        setCues([]);
        setTranscriptSource(null);
        setStatus(`Loaded ${result.video.path.split('/').pop()}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (busy) return;

    const file = event.dataTransfer.files[0];
    if (!file) return;

    const filePath = window.appBridge.getPathForFile(file);
    if (!filePath) {
      setStatus('Could not read dropped file path.');
      return;
    }

    setBusy(true);
    try {
      const result = await window.appBridge.importVideoFromPath(filePath);
      if (!result.canceled && result.video) {
        setVideo(result.video);
        setCues([]);
        setTranscriptSource(null);
        setStatus(`Loaded ${result.video.path.split('/').pop()}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDragOver(false);
  }, []);

  const handleSaveApiKey = async () => {
    setBusy(true);
    try {
      await window.appBridge.saveApiKey({apiKey});
      setStatus(apiKey ? 'API key saved.' : 'API key cleared — mock transcription will be used.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleTranscribe = async () => {
    if (!video) return;
    setBusy(true);
    setStatus('Transcribing…');
    try {
      const result = await window.appBridge.transcribeVideo({videoPath: video.path, apiKey});
      setCues(normalizeSegmentsToCues(result.segments, result.words));
      setTranscriptSource(result.source);
      setStatus(
        result.source === 'mock'
          ? 'Mock transcript loaded. Save an API key for OpenAI transcription.'
          : 'Transcription complete.',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    if (!video || cues.length === 0 || styleErrors.length > 0) return;
    setBusy(true);
    exportCancelRequestedRef.current = false;
    setExportModal(hiddenExportModal());
    setStatus('Exporting…');
    try {
      const result = await window.appBridge.exportSubtitledVideo({video, cues, style});
      if (!result.canceled && result.outputPath) {
        const outputPath = result.outputPath;
        setStatus(`Export complete: ${result.outputPath}`);
        setExportModal((current) => ({
          phase: 'done',
          stage: 'muxing',
          progress: 1,
          renderedFrames: current.renderedFrames,
          encodedFrames: current.encodedFrames,
          canceling: false,
          outputPath,
        }));
      } else {
        setExportModal(hiddenExportModal());
        if (exportCancelRequestedRef.current) {
          setStatus('Export canceled.');
        }
      }
    } catch (error) {
      setExportModal(hiddenExportModal());
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      exportCancelRequestedRef.current = false;
      setBusy(false);
    }
  };

  const handleCopyTranscript = async () => {
    const text = cues.map((cue) => cue.text).join('\n');
    await navigator.clipboard.writeText(text);
    setStatus('Transcript copied.');
  };

  const handleOpenContainingFolder = async () => {
    if (!exportModal.outputPath) return;
    await window.appBridge.openContainingFolder({path: exportModal.outputPath});
  };

  const handleCancelExport = async () => {
    if (exportModal.phase !== 'running' || exportModal.canceling) return;
    exportCancelRequestedRef.current = true;
    setExportModal((current) => ({
      ...current,
      canceling: true,
    }));
    setStatus('Canceling export…');

    try {
      await window.appBridge.cancelExport();
    } catch (error) {
      exportCancelRequestedRef.current = false;
      setExportModal((current) => ({
        ...current,
        canceling: false,
      }));
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const exportProgressPercent = Math.round(exportModal.progress * 100);
  const exportStageLabel = exportModal.stage === 'preparing'
    ? 'Preparing export…'
    : exportModal.stage === 'muxing'
      ? 'Finalizing video…'
      : 'Rendering video…';
  const exportFilename = exportModal.outputPath?.split('/').pop() ?? null;

  return (
    <div
      className={`app${dragOver ? ' drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <header className="topbar">
        <div className="topbar-brand">
          <h1>OpenCaption</h1>
        </div>
        <div className="topbar-actions">
          {status && (
            <span className={`status-text${busy ? ' status-busy' : ''}`}>
              {status}
            </span>
          )}
          {phase === 'transcribed' && (
            <button
              className="btn btn-export"
              onClick={handleExport}
              disabled={!video || cues.length === 0 || busy || styleErrors.length > 0}
            >
              Export MP4
            </button>
          )}
          {phase !== 'empty' && (
            <button className="btn btn-ghost" onClick={handleImport} disabled={busy}>
              Change video
            </button>
          )}
          <div className="settings-anchor" ref={settingsRef}>
            <button
              className={`btn-icon${showSettings ? ' active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            {showSettings && (
              <div className="settings-popover">
                <div className="settings-title">Settings</div>
                <label className="field">
                  <span>OpenAI API key</span>
                  <input
                    type="password"
                    value={apiKey}
                    placeholder="sk-..."
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </label>
                <button className="btn btn-sm" onClick={handleSaveApiKey} disabled={busy}>
                  Save key
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Phase: empty — full drop zone */}
      {phase === 'empty' && (
        <div
          className={`drop-zone${dragOver ? ' drop-zone-active' : ''}`}
          onClick={handleImport}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
        >
          <div className="drop-zone-content">
            <svg className="drop-zone-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" />
            </svg>
            <p className="drop-zone-label">Drop a video here</p>
            <p className="drop-zone-hint">or click to browse</p>
          </div>
        </div>
      )}

      {/* Phase: loaded — centered preview + transcribe */}
      {phase === 'loaded' && video && (
        <div className="workspace-center">
          <div className="preview-container">
            <VideoPreview video={video} cues={cues} style={style} />
          </div>
          <div className="action-bar">
            <button className="btn btn-primary btn-lg" onClick={handleTranscribe} disabled={busy}>
              {busy ? 'Transcribing…' : 'Transcribe'}
            </button>
          </div>
        </div>
      )}

      {/* Phase: transcribed — split view */}
      {phase === 'transcribed' && video && (
        <div className="workspace-split">
          <div className="col-preview">
            <VideoPreview video={video} cues={cues} style={style} onStyleChange={setStyle} />
            <StyleBar style={style} onChange={setStyle} errors={styleErrors} />
          </div>
          <div className="col-editor">
            <div className="editor-header">
              <h2>Subtitles</h2>
              <span className="cue-count">{cues.length} cues</span>
              {transcriptSource === 'mock' && <span className="badge-mock">mock</span>}
              <div className="editor-actions">
                <button className="btn btn-sm btn-ghost" onClick={handleCopyTranscript}>
                  Copy all
                </button>
              </div>
            </div>
            <div className="cue-list">
              {cues.map((cue) => (
                <div className="cue-card" key={cue.id}>
                  <span className="cue-time">
                    {(cue.startMs / 1000).toFixed(2)}s — {(cue.endMs / 1000).toFixed(2)}s
                  </span>
                  <textarea
                    value={cue.text}
                    onChange={(e) => setCues(updateCueText(cues, cue.id, e.target.value))}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {exportModal.phase !== 'hidden' && (
        <div className="modal-backdrop">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
            <div className="modal-label">Export</div>
            <h2 id="export-modal-title">
              {exportModal.phase === 'done' ? 'Export complete' : exportStageLabel}
            </h2>
            {exportModal.phase === 'done' ? (
              <>
                <p className="modal-copy">
                  {exportFilename ? `${exportFilename} is ready.` : 'Your video is ready.'}
                </p>
                <div className="modal-actions">
                  <button className="btn btn-sm" onClick={handleOpenContainingFolder}>
                    Open Containing Folder
                  </button>
                  <button className="btn btn-ghost" onClick={() => setExportModal(hiddenExportModal())}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="export-progress-track" aria-hidden="true">
                  <div className="export-progress-fill" style={{width: `${Math.max(2, exportProgressPercent)}%`}} />
                </div>
                <div className="export-progress-meta">
                  <span>{exportProgressPercent}%</span>
                  <span>{exportModal.encodedFrames > 0 ? `${exportModal.encodedFrames} frames encoded` : `${exportModal.renderedFrames} frames rendered`}</span>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={handleCancelExport} disabled={exportModal.canceling}>
                    {exportModal.canceling ? 'Canceling…' : 'Cancel Render'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
