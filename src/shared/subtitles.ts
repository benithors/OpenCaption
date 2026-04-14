export type Word = {
  text: string;
  startMs: number;
  endMs: number;
};

export type Cue = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  words?: Word[];
  wordTimingSource?: 'timed' | 'synthetic' | 'cue';
};

export type SubtitleAnimationPreset = 'pop';

export type SubtitleStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  boxColor: string;
  boxOpacity: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  textAlign: 'center';
  animationPreset: SubtitleAnimationPreset;
  positionX: number;
  positionY: number;
  maxWidth: number;
  maxLines: number;
};

export type TranscriptSegment = {
  id?: string | number;
  start: number;
  end: number;
  text: string;
};

export type TranscriptWord = {
  word: string;
  start: number;
  end: number;
};

export type TranscriptionResult = {
  text: string;
  segments: TranscriptSegment[];
  words: TranscriptWord[];
  source: 'openai' | 'mock';
};

export type VideoMetadata = {
  path: string;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  sizeBytes: number;
  previewUrl?: string;
};

const defaults: SubtitleStyle = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 20,
  fontWeight: 800,
  textColor: '#000000',
  boxColor: '#FFFFFF',
  boxOpacity: 1,
  paddingX: 28,
  paddingY: 16,
  borderRadius: 22,
  textAlign: 'center',
  animationPreset: 'pop',
  positionX: 50,
  positionY: 82,
  maxWidth: 85,
  maxLines: 2,
};

export const defaultSubtitleStyle = (): SubtitleStyle => ({...defaults});

export const migrateStyle = (partial: Partial<SubtitleStyle>): SubtitleStyle => ({...defaults, ...partial});

export const normalizeCueText = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

const splitCueText = (text: string) => normalizeCueText(text).split(/\s+/).filter(Boolean);

const normalizeWordToken = (text: string) =>
  normalizeCueText(text)
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

const segmentWordSlackMs = 220;

const syntheticWordsFromText = (text: string, startMs: number, endMs: number): Word[] => {
  const words = splitCueText(text);
  if (words.length === 0) return [];

  const duration = endMs - startMs;
  const wordDuration = duration / words.length;
  return words.map((wordText, index) => ({
    text: wordText,
    startMs: startMs + index * wordDuration,
    endMs: startMs + (index + 1) * wordDuration,
  }));
};

const normalizeTranscriptWords = (words: TranscriptWord[]): Word[] =>
  words
    .filter((word) => Number.isFinite(word.start) && Number.isFinite(word.end) && word.word.trim())
    .map((word) => ({
      text: normalizeCueText(word.word),
      startMs: Math.max(0, Math.round(word.start * 1000)),
      endMs: Math.max(Math.round(word.end * 1000), Math.round(word.start * 1000) + 1),
    }));

const getCandidateWordsForSegment = (words: Word[], startSec: number, endSec: number): Word[] => {
  const startMs = Math.max(0, Math.round(startSec * 1000));
  const endMs = Math.max(Math.round(endSec * 1000), startMs + 1);

  return words.filter((word) => {
    return word.endMs >= startMs - segmentWordSlackMs && word.startMs <= endMs + segmentWordSlackMs;
  });
};

const alignCueWordsToTranscriptWords = (text: string, candidateWords: Word[]): Word[] | null => {
  const displayWords = splitCueText(text);
  if (displayWords.length === 0) return [];

  const cueTokens = displayWords.map(normalizeWordToken);
  const candidateTokens = candidateWords.map((word) => normalizeWordToken(word.text));
  const cueCount = cueTokens.length;
  const candidateCount = candidateTokens.length;

  if (candidateCount < cueCount) return null;

  const cost = Array.from({length: cueCount}, () => Array(candidateCount).fill(Number.POSITIVE_INFINITY));
  const previous = Array.from({length: cueCount}, () => Array(candidateCount).fill(-1));

  for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex += 1) {
    if (candidateTokens[candidateIndex] === cueTokens[0]) {
      cost[0][candidateIndex] = candidateIndex;
    }
  }

  for (let cueIndex = 1; cueIndex < cueCount; cueIndex += 1) {
    for (let candidateIndex = cueIndex; candidateIndex < candidateCount; candidateIndex += 1) {
      if (candidateTokens[candidateIndex] !== cueTokens[cueIndex]) continue;

      for (let previousIndex = cueIndex - 1; previousIndex < candidateIndex; previousIndex += 1) {
        if (!Number.isFinite(cost[cueIndex - 1][previousIndex])) continue;

        const nextCost = cost[cueIndex - 1][previousIndex] + (candidateIndex - previousIndex - 1);
        if (nextCost < cost[cueIndex][candidateIndex]) {
          cost[cueIndex][candidateIndex] = nextCost;
          previous[cueIndex][candidateIndex] = previousIndex;
        }
      }
    }
  }

  let bestEndIndex = -1;
  let bestCost = Number.POSITIVE_INFINITY;

  for (let candidateIndex = cueCount - 1; candidateIndex < candidateCount; candidateIndex += 1) {
    if (cost[cueCount - 1][candidateIndex] < bestCost) {
      bestCost = cost[cueCount - 1][candidateIndex];
      bestEndIndex = candidateIndex;
    }
  }

  if (bestEndIndex === -1 || !Number.isFinite(bestCost)) {
    return null;
  }

  const matchedIndexes = Array(cueCount).fill(-1);
  let currentIndex = bestEndIndex;

  for (let cueIndex = cueCount - 1; cueIndex >= 0; cueIndex -= 1) {
    matchedIndexes[cueIndex] = currentIndex;
    currentIndex = previous[cueIndex][currentIndex];
  }

  return displayWords.map((displayText, cueIndex) => ({
    text: displayText,
    startMs: candidateWords[matchedIndexes[cueIndex]].startMs,
    endMs: candidateWords[matchedIndexes[cueIndex]].endMs,
  }));
};

const retimeWordsToCueText = (text: string, timedWords: Word[] | undefined, startMs: number, endMs: number): Word[] => {
  const displayWords = splitCueText(text);
  if (displayWords.length === 0) return [];

  if (timedWords && timedWords.length === displayWords.length) {
    return displayWords.map((displayText, index) => ({
      text: displayText,
      startMs: timedWords[index].startMs,
      endMs: timedWords[index].endMs,
    }));
  }

  return syntheticWordsFromText(text, startMs, endMs);
};

export const normalizeSegmentsToCues = (segments: TranscriptSegment[], transcriptWords: TranscriptWord[] = []): Cue[] => {
  const normalizedTranscriptWords = normalizeTranscriptWords(transcriptWords);
  const hasTranscriptWords = normalizedTranscriptWords.length > 0;

  return segments
    .filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.text.trim())
    .map((segment, index) => {
      const startMs = Math.max(0, Math.round(segment.start * 1000));
      const endMs = Math.max(Math.round(segment.end * 1000), Math.round(segment.start * 1000) + 350);
      const text = normalizeCueText(segment.text);
      const candidateWords = getCandidateWordsForSegment(normalizedTranscriptWords, segment.start, segment.end);
      const alignedWords = hasTranscriptWords ? alignCueWordsToTranscriptWords(text, candidateWords) : null;

      return {
        id: String(segment.id ?? index),
        startMs,
        endMs,
        text,
        words: alignedWords ?? undefined,
        wordTimingSource: hasTranscriptWords ? (alignedWords ? 'timed' : 'cue') : 'synthetic',
      };
    });
};

export const updateCueText = (cues: Cue[], cueId: string, text: string): Cue[] =>
  cues.map((cue) => (cue.id === cueId ? {...cue, text: normalizeCueText(text)} : cue));

export const getActiveCue = (cues: Cue[], currentMs: number): Cue | null =>
  cues.find((cue) => currentMs >= cue.startMs && currentMs <= cue.endMs) ?? null;

export const splitCueIntoWords = (cue: Cue): Word[] => {
  if (cue.wordTimingSource === 'cue') {
    return [{text: cue.text, startMs: cue.startMs, endMs: cue.endMs}];
  }

  return retimeWordsToCueText(cue.text, cue.words, cue.startMs, cue.endMs);
};

export const chunkWords = (words: Word[], maxWords = 4, maxChars = 20): Word[][] => {
  const chunks: Word[][] = [];
  let current: Word[] = [];
  let charCount = 0;

  for (const word of words) {
    const addedChars = charCount + (current.length > 0 ? 1 : 0) + word.text.length;
    if (current.length >= maxWords || (current.length > 0 && addedChars > maxChars)) {
      chunks.push(current);
      current = [word];
      charCount = word.text.length;
    } else {
      current.push(word);
      charCount = addedChars;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

export const getActiveChunk = (chunks: Word[][], currentMs: number): Word[] | null => {
  for (const chunk of chunks) {
    if (currentMs >= chunk[0].startMs && currentMs < chunk[chunk.length - 1].endMs) {
      return chunk;
    }
  }

  if (chunks.length > 0) {
    const last = chunks[chunks.length - 1];
    if (currentMs >= last[0].startMs) return last;
  }

  return chunks[0] ?? null;
};
