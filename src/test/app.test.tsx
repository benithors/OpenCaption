import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from '@renderer/App';
import {mockTranscriptionResult} from '@shared/mock';

vi.mock('@remotion/player', () => ({
  Player: () => <div data-testid="mock-player">player</div>,
}));

const bridge = {
  importVideo: vi.fn(),
  getPreviewVideoUrl: vi.fn(),
  getSavedApiKey: vi.fn(),
  saveApiKey: vi.fn(),
  transcribeVideo: vi.fn(),
  exportSubtitledVideo: vi.fn(),
};

describe('App', () => {
  beforeEach(() => {
    bridge.importVideo.mockReset();
    bridge.getPreviewVideoUrl.mockReset();
    bridge.getSavedApiKey.mockReset();
    bridge.saveApiKey.mockReset();
    bridge.transcribeVideo.mockReset();
    bridge.exportSubtitledVideo.mockReset();
    bridge.getSavedApiKey.mockResolvedValue('');
    bridge.importVideo.mockResolvedValue({
      canceled: false,
      video: {path: '/tmp/video.mp4', previewUrl: 'http://127.0.0.1:9999/preview-video/test.mp4', width: 1080, height: 1920, fps: 30, durationSec: 8.8, sizeBytes: 1000},
    });
    bridge.transcribeVideo.mockResolvedValue(mockTranscriptionResult());
    bridge.exportSubtitledVideo.mockResolvedValue({canceled: false, outputPath: '/tmp/export.mp4'});
    window.appBridge = bridge;
  });

  it('imports, transcribes, edits, and exports in the UI flow', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('Import video'));
    await screen.findByText(/1080×1920/);

    fireEvent.click(screen.getByText('Run transcription'));
    await screen.findByDisplayValue('Hello from the subtitle app.');

    fireEvent.change(screen.getAllByRole('textbox')[1], {target: {value: 'Edited caption text'}});
    fireEvent.click(screen.getByText('Export MP4'));

    await waitFor(() => expect(bridge.exportSubtitledVideo).toHaveBeenCalled());
    expect(await screen.findByText(/Export complete/)).toBeInTheDocument();
  });
});
