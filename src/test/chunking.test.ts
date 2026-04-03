import {describe, expect, it} from 'vitest';
import {OPENAI_TRANSCRIPTION_FILE_LIMIT_BYTES, planAudioChunks} from '@shared/chunking';

describe('chunk planning', () => {
  it('avoids chunking below the OpenAI threshold', () => {
    const plan = planAudioChunks({
      fileSizeBytes: OPENAI_TRANSCRIPTION_FILE_LIMIT_BYTES - 1024,
      durationSec: 42,
    });

    expect(plan.shouldChunk).toBe(false);
    expect(plan.chunks).toHaveLength(1);
  });

  it('splits audio into multiple chunks when the threshold is exceeded', () => {
    const plan = planAudioChunks({
      fileSizeBytes: OPENAI_TRANSCRIPTION_FILE_LIMIT_BYTES * 3,
      durationSec: 90,
    });

    expect(plan.shouldChunk).toBe(true);
    expect(plan.chunks.length).toBeGreaterThan(1);
    expect(plan.chunks[0].startSec).toBe(0);
  });
});
