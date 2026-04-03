import type {SubtitleStyle} from './subtitles';

export const validateStyle = (style: SubtitleStyle): string[] => {
  const errors: string[] = [];
  if (!style.fontFamily.trim()) errors.push('fontFamily is required');
  if (style.fontSize < 24 || style.fontSize > 128) errors.push('fontSize must be between 24 and 128');
  if (style.paddingX < 0 || style.paddingY < 0) errors.push('padding must be non-negative');
  if (style.boxOpacity < 0 || style.boxOpacity > 1) errors.push('boxOpacity must be between 0 and 1');
  if (style.safeAreaBottom < 0 || style.safeAreaX < 0) errors.push('safe areas must be non-negative');
  return errors;
};
