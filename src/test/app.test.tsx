import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from '@renderer/App';
import {mockTranscriptionResult} from '@shared/mock';
import type {ExportProgressPayload} from '@shared/ipc';

vi.mock('@remotion/player', async () => {
  const React = await import('react');
  return {
    Player: React.forwardRef<HTMLDivElement>((_props, _ref) => <div data-testid="mock-player">player</div>),
  };
});

const bridge = {
  importVideo: vi.fn(),
  importVideoFromPath: vi.fn(),
  getPathForFile: vi.fn(() => '/tmp/video.mp4'),
  getPreviewVideoUrl: vi.fn(),
  getSavedApiKey: vi.fn(),
  saveApiKey: vi.fn(),
  transcribeVideo: vi.fn(),
  onExportProgress: vi.fn(),
  exportSubtitledVideo: vi.fn(),
  cancelExport: vi.fn(),
  openContainingFolder: vi.fn(),
};

describe('App', () => {
  let exportProgressListener: ((payload: ExportProgressPayload) => void) | null = null;

  beforeEach(() => {
    bridge.importVideo.mockReset();
    bridge.getPreviewVideoUrl.mockReset();
    bridge.getSavedApiKey.mockReset();
    bridge.saveApiKey.mockReset();
    bridge.transcribeVideo.mockReset();
    bridge.onExportProgress.mockReset();
    bridge.exportSubtitledVideo.mockReset();
    bridge.cancelExport.mockReset();
    bridge.openContainingFolder.mockReset();
    bridge.getSavedApiKey.mockResolvedValue('');
    bridge.importVideo.mockResolvedValue({
      canceled: false,
      video: {path: '/tmp/video.mp4', previewUrl: 'http://127.0.0.1:9999/preview-video/test.mp4', width: 1080, height: 1920, fps: 30, durationSec: 8.8, sizeBytes: 1000},
    });
    bridge.transcribeVideo.mockResolvedValue(mockTranscriptionResult());
    bridge.exportSubtitledVideo.mockResolvedValue({canceled: false, outputPath: '/tmp/export.mp4'});
    bridge.onExportProgress.mockImplementation((listener) => {
      exportProgressListener = listener;
      return () => {
        if (exportProgressListener === listener) {
          exportProgressListener = null;
        }
      };
    });
    bridge.cancelExport.mockResolvedValue(undefined);
    bridge.openContainingFolder.mockResolvedValue(undefined);
    window.appBridge = bridge;
  });

  it('imports, transcribes, edits, and exports in the UI flow', async () => {
    let resolveExport: ((value: {canceled: boolean; outputPath?: string}) => void) | null = null;
    bridge.exportSubtitledVideo.mockImplementation(() => new Promise((resolve) => {
      exportProgressListener?.({
        phase: 'rendering',
        progress: 0.42,
        renderedFrames: 126,
        encodedFrames: 0,
      });
      resolveExport = resolve;
    }));

    render(<App />);

    fireEvent.click(screen.getByText(/Drop a video here/));
    await screen.findByText('Transcribe');
    expect(screen.queryByText('Font')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Transcribe'));
    await screen.findByDisplayValue('Hello from the');

    fireEvent.change(screen.getAllByRole('textbox')[0], {target: {value: 'Edited caption text'}});
    fireEvent.click(screen.getByText('Export MP4'));

    await waitFor(() => expect(bridge.exportSubtitledVideo).toHaveBeenCalled());
    expect(await screen.findByText('Rendering video…')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('126 frames rendered')).toBeInTheDocument();

    await act(async () => {
      resolveExport?.({canceled: false, outputPath: '/tmp/export.mp4'});
    });

    expect(await screen.findByRole('heading', {name: 'Export complete'})).toBeInTheDocument();
    fireEvent.click(screen.getByText('Open Containing Folder'));
    await waitFor(() => expect(bridge.openContainingFolder).toHaveBeenCalledWith({path: '/tmp/export.mp4'}));
  });

  it('loads debug captions without calling the transcription bridge', async () => {
    render(<App />);

    fireEvent.click(screen.getByText(/Drop a video here/));
    await screen.findByText('Debug captions');

    fireEvent.click(screen.getByText('Debug captions'));

    expect(bridge.transcribeVideo).not.toHaveBeenCalled();
    expect(await screen.findByDisplayValue('Hello from the')).toBeInTheDocument();
    expect(screen.getByText('Debug captions loaded locally.')).toBeInTheDocument();
  });

  it('allows canceling an in-flight export', async () => {
    let resolveExport: ((value: {canceled: boolean; outputPath?: string}) => void) | null = null;
    bridge.exportSubtitledVideo.mockImplementation(() => new Promise((resolve) => {
      exportProgressListener?.({
        phase: 'rendering',
        progress: 0.42,
        renderedFrames: 126,
        encodedFrames: 0,
      });
      resolveExport = resolve;
    }));

    render(<App />);

    fireEvent.click(screen.getByText(/Drop a video here/));
    await screen.findByText('Transcribe');
    expect(screen.queryByText('Font')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Transcribe'));
    await screen.findByDisplayValue('Hello from the');

    fireEvent.click(screen.getByText('Export MP4'));

    expect(await screen.findByText('Cancel Render')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel Render'));

    await waitFor(() => expect(bridge.cancelExport).toHaveBeenCalled());
    expect(screen.getByText('Canceling…')).toBeInTheDocument();

    await act(async () => {
      resolveExport?.({canceled: true});
    });

    await waitFor(() => expect(screen.queryByText('Cancel Render')).not.toBeInTheDocument());
    expect(screen.getByText('Export canceled.')).toBeInTheDocument();
  });
});
