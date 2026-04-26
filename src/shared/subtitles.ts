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
  boxWidthPercent: number | null;
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
  boxWidthPercent: null,
  maxLines: 2,
};

export const defaultSubtitleStyle = (): SubtitleStyle => ({...defaults});

export const migrateStyle = (partial: Partial<SubtitleStyle>): SubtitleStyle => {
  const migrated = {...defaults, ...partial};
  return {
    ...migrated,
    fontSize: Number.isFinite(migrated.fontSize) ? Math.max(4, migrated.fontSize) : defaults.fontSize,
    boxOpacity: Number.isFinite(migrated.boxOpacity) ? migrated.boxOpacity : defaults.boxOpacity,
    positionX: Number.isFinite(migrated.positionX) ? migrated.positionX : defaults.positionX,
    positionY: Number.isFinite(migrated.positionY) ? migrated.positionY : defaults.positionY,
  };
};

export const normalizeCueText = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

const splitCueText = (text: string) => normalizeCueText(text).split(/\s+/).filter(Boolean);

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
    }))
    .filter((word) => word.text.length > 0);

const normalizeWordToken = (text: string) =>
  normalizeCueText(text)
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

const splitSentenceText = (text: string) => normalizeCueText(text).split(/(?<=[.!?])\s+/).filter(Boolean);

const segmentWordSlackMs = 220;

type TimedSegment = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

const buildCuesFromAlignedWords = (
  displayWords: string[],
  timedWords: Word[],
  startIndex: number,
  maxWords = 4,
  maxChars = 20,
  pauseThresholdMs = 520,
): Cue[] => {
  const cues: Cue[] = [];
  let currentDisplayWords: string[] = [];
  let currentTimedWords: Word[] = [];
  let charCount = 0;

  const flush = () => {
    if (currentDisplayWords.length === 0 || currentTimedWords.length === 0) return;
    cues.push({
      id: String(startIndex + cues.length),
      startMs: currentTimedWords[0].startMs,
      endMs: Math.max(currentTimedWords[currentTimedWords.length - 1].endMs, currentTimedWords[0].startMs + 1),
      text: normalizeCueText(currentDisplayWords.join(' ')),
      words: [...currentTimedWords],
      wordTimingSource: 'timed',
    });
    currentDisplayWords = [];
    currentTimedWords = [];
    charCount = 0;
  };

  for (let index = 0; index < displayWords.length; index += 1) {
    const displayWord = displayWords[index];
    const timedWord = timedWords[index];
    const previousWord = currentTimedWords[currentTimedWords.length - 1];
    const addedChars = charCount + (currentDisplayWords.length > 0 ? 1 : 0) + displayWord.length;
    const exceedsWordLimit = currentDisplayWords.length >= maxWords;
    const exceedsCharLimit = currentDisplayWords.length > 0 && addedChars > maxChars;
    const exceedsPauseLimit = previousWord ? timedWord.startMs - previousWord.endMs > pauseThresholdMs : false;

    if (currentDisplayWords.length > 0 && (exceedsWordLimit || exceedsCharLimit || exceedsPauseLimit)) {
      flush();
    }

    currentDisplayWords.push(displayWord);
    currentTimedWords.push(timedWord);
    charCount = charCount === 0 ? displayWord.length : charCount + 1 + displayWord.length;
  }

  flush();
  return cues;
};

const buildCuesFromTranscriptWords = (words: Word[], startIndex = 0): Cue[] =>
  buildCuesFromAlignedWords(
    words.map((word) => word.text),
    words,
    startIndex,
  );

const buildCuesFromSegmentText = (segmentText: string, timedWords: Word[], startIndex: number): Cue[] => {
  const sentenceTexts = splitSentenceText(segmentText);
  if (sentenceTexts.length === 0) {
    return buildCuesFromTranscriptWords(timedWords, startIndex);
  }

  const cues: Cue[] = [];
  let timedWordOffset = 0;
  let cueIndex = startIndex;

  for (const sentenceText of sentenceTexts) {
    const displayWords = splitCueText(sentenceText);
    const sentenceTimedWords = timedWords.slice(timedWordOffset, timedWordOffset + displayWords.length);
    const wordsAlign = sentenceTimedWords.length === displayWords.length
      && displayWords.every((displayWord, index) => normalizeWordToken(displayWord) === normalizeWordToken(sentenceTimedWords[index].text));

    if (!wordsAlign) {
      return buildCuesFromTranscriptWords(timedWords, startIndex);
    }

    const sentenceCues = buildCuesFromAlignedWords(displayWords, sentenceTimedWords, cueIndex);
    cues.push(...sentenceCues);
    cueIndex += sentenceCues.length;
    timedWordOffset += displayWords.length;
  }

  if (timedWordOffset !== timedWords.length) {
    return buildCuesFromTranscriptWords(timedWords, startIndex);
  }

  return cues;
};

const findSegmentIndexForWord = (segments: TimedSegment[], word: Word): number => {
  const midpointMs = (word.startMs + word.endMs) / 2;
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [index, segment] of segments.entries()) {
    if (midpointMs < segment.startMs - segmentWordSlackMs || midpointMs > segment.endMs + segmentWordSlackMs) {
      continue;
    }

    const distance = midpointMs < segment.startMs
      ? segment.startMs - midpointMs
      : midpointMs > segment.endMs
        ? midpointMs - segment.endMs
        : 0;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  if (bestIndex !== -1) {
    return bestIndex;
  }

  return segments.reduce((closestIndex, segment, index) => {
    const segmentMidpointMs = (segment.startMs + segment.endMs) / 2;
    const closestMidpointMs = (segments[closestIndex].startMs + segments[closestIndex].endMs) / 2;
    return Math.abs(midpointMs - segmentMidpointMs) < Math.abs(midpointMs - closestMidpointMs) ? index : closestIndex;
  }, 0);
};

const buildTimedCuesFromSegments = (segments: TranscriptSegment[], words: Word[]): Cue[] => {
  const normalizedSegments: TimedSegment[] = segments
    .filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.text.trim())
    .map((segment, index) => ({
      id: String(segment.id ?? index),
      startMs: Math.max(0, Math.round(segment.start * 1000)),
      endMs: Math.max(Math.round(segment.end * 1000), Math.round(segment.start * 1000) + 1),
      text: normalizeCueText(segment.text),
    }));

  if (normalizedSegments.length === 0) {
    return buildCuesFromTranscriptWords(words);
  }

  const wordsBySegment = normalizedSegments.map(() => [] as Word[]);
  for (const word of words) {
    const segmentIndex = findSegmentIndexForWord(normalizedSegments, word);
    wordsBySegment[segmentIndex].push(word);
  }

  const cues: Cue[] = [];
  let cueIndex = 0;

  for (const [segmentIndex, segment] of normalizedSegments.entries()) {
    const timedWords = wordsBySegment[segmentIndex];
    if (timedWords.length === 0) {
      continue;
    }

    const segmentCues = buildCuesFromSegmentText(segment.text, timedWords, cueIndex);
    cues.push(...segmentCues);
    cueIndex += segmentCues.length;
  }

  return cues.length > 0 ? cues : buildCuesFromTranscriptWords(words);
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

  if (timedWords && timedWords.length > 0) {
    return [{text: normalizeCueText(text), startMs, endMs}];
  }

  return syntheticWordsFromText(text, startMs, endMs);
};

export const normalizeSegmentsToCues = (segments: TranscriptSegment[], transcriptWords: TranscriptWord[] = []): Cue[] => {
  const normalizedTranscriptWords = normalizeTranscriptWords(transcriptWords);
  if (normalizedTranscriptWords.length > 0) {
    return buildTimedCuesFromSegments(segments, normalizedTranscriptWords);
  }

  return segments
    .filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.text.trim())
    .map((segment, index) => ({
      id: String(segment.id ?? index),
      startMs: Math.max(0, Math.round(segment.start * 1000)),
      endMs: Math.max(Math.round(segment.end * 1000), Math.round(segment.start * 1000) + 350),
      text: normalizeCueText(segment.text),
      wordTimingSource: 'synthetic',
    }));
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
