import React, {useEffect, useMemo, useState} from 'react';
import type {Cue, SubtitleStyle, VideoMetadata} from '@shared/subtitles';
import {defaultSubtitleStyle, normalizeSegmentsToCues, updateCueText} from '@shared/subtitles';
import {validateStyle} from '@shared/schema';
import {VideoPreview} from './components/VideoPreview';

const NumberInput = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <label className="field">
    <span>{label}</span>
    <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
);

export const App: React.FC = () => {
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [cues, setCues] = useState<Cue[]>([]);
  const [style, setStyle] = useState<SubtitleStyle>(defaultSubtitleStyle);
  const [status, setStatus] = useState('Import a video to start.');
  const [busy, setBusy] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<'openai' | 'mock' | null>(null);

  useEffect(() => {
    window.appBridge.getSavedApiKey().then(setApiKey).catch(() => undefined);
  }, []);

  const styleErrors = useMemo(() => validateStyle(style), [style]);

  const handleImport = async () => {
    setBusy(true);
    try {
      const result = await window.appBridge.importVideo();
      if (!result.canceled && result.video) {
        setVideo(result.video);
        setStatus(`Loaded ${result.video.path}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveApiKey = async () => {
    setBusy(true);
    try {
      await window.appBridge.saveApiKey({apiKey});
      setStatus(apiKey ? 'API key saved for transcription.' : 'API key cleared. Mock transcription will be used until a key is saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleTranscribe = async () => {
    if (!video) return;
    setBusy(true);
    setStatus('Transcribing video…');
    try {
      const result = await window.appBridge.transcribeVideo({videoPath: video.path, apiKey});
      setCues(normalizeSegmentsToCues(result.segments));
      setTranscriptSource(result.source);
      setStatus(result.source === 'mock' ? 'Loaded mock transcript. Save an API key to use OpenAI transcription.' : 'Transcription complete.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    if (!video || cues.length === 0 || styleErrors.length > 0) return;
    setBusy(true);
    setStatus('Exporting burned-in MP4…');
    try {
      const result = await window.appBridge.exportSubtitledVideo({video, cues, style});
      if (!result.canceled && result.outputPath) {
        setStatus(`Export complete: ${result.outputPath}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Social Subtitle Mac App</h1>
          <p>Milestone 0 vertical slice — import, transcribe, edit, style, export.</p>
        </div>
        <div className="status-pill">{busy ? 'Working…' : status}</div>
      </header>

      <main className="layout">
        <section className="panel controls">
          <h2>Workflow</h2>
          <button onClick={handleImport} disabled={busy}>Import video</button>
          <label className="field">
            <span>OpenAI API key</span>
            <input
              type="password"
              value={apiKey}
              placeholder="sk-..."
              onChange={(event) => setApiKey(event.target.value)}
            />
          </label>
          <button onClick={handleSaveApiKey} disabled={busy}>Save key</button>
          <button onClick={handleTranscribe} disabled={!video || busy}>Run transcription</button>
          <button onClick={handleExport} disabled={!video || cues.length === 0 || busy || styleErrors.length > 0}>Export MP4</button>

          <div className="meta-grid">
            <div><strong>Video</strong><span>{video ? `${video.width}×${video.height} · ${video.durationSec.toFixed(1)}s` : 'None yet'}</span></div>
            <div><strong>Transcript source</strong><span>{transcriptSource ?? 'none'}</span></div>
            <div><strong>Cues</strong><span>{cues.length}</span></div>
          </div>

          <h2>Style</h2>
          <label className="field">
            <span>Font family</span>
            <input value={style.fontFamily} onChange={(event) => setStyle({...style, fontFamily: event.target.value})} />
          </label>
          <div className="field-row">
            <NumberInput label="Font size" value={style.fontSize} min={24} max={128} onChange={(fontSize) => setStyle({...style, fontSize})} />
            <NumberInput label="Bottom safe area" value={style.safeAreaBottom} min={32} max={280} onChange={(safeAreaBottom) => setStyle({...style, safeAreaBottom})} />
          </div>
          <div className="field-row">
            <label className="field">
              <span>Box color</span>
              <input type="color" value={style.boxColor} onChange={(event) => setStyle({...style, boxColor: event.target.value})} />
            </label>
            <NumberInput label="Box opacity" value={Number(style.boxOpacity.toFixed(2))} min={0} max={1} onChange={(boxOpacity) => setStyle({...style, boxOpacity})} />
          </div>
          <div className="note">Animation preset: <strong>pop</strong> (locked for this milestone).</div>
          {styleErrors.length > 0 ? <div className="error-list">{styleErrors.join(' · ')}</div> : null}
        </section>

        <section className="panel preview">
          <div className="panel-heading">
            <h2>Preview</h2>
            <span>Preview uses the shared subtitle contract; export stays on the Remotion composition.</span>
          </div>
          {video ? (
            <VideoPreview video={video} cues={cues} style={style} />
          ) : (
            <div className="empty-state">Import a video to see the subtitle preview.</div>
          )}
        </section>

        <section className="panel transcript">
          <div className="panel-heading">
            <h2>Subtitle text</h2>
            <span>Text edits only — no timing editor in this MVP.</span>
          </div>
          {cues.length === 0 ? (
            <div className="empty-state">Run transcription to generate editable subtitle cues.</div>
          ) : (
            <div className="cue-list">
              {cues.map((cue) => (
                <label className="cue-card" key={cue.id}>
                  <span>{(cue.startMs / 1000).toFixed(2)}s → {(cue.endMs / 1000).toFixed(2)}s</span>
                  <textarea value={cue.text} onChange={(event) => setCues(updateCueText(cues, cue.id, event.target.value))} rows={3} />
                </label>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
