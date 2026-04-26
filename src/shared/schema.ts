import type {SubtitleStyle} from './subtitles';

export const validateStyle = (style: SubtitleStyle): string[] => {
  const errors: string[] = [];
  if (!style.fontFamily.trim()) errors.push('fontFamily is required');
  if (style.fontSize < 4) errors.push('fontSize must be at least 4');
  if (style.fontSize > 128) errors.push('fontSize must be at most 128');
  if (style.paddingX < 0 || style.paddingY < 0) errors.push('padding must be non-negative');
  if (style.boxOpacity < 0 || style.boxOpacity > 1) errors.push('boxOpacity must be between 0 and 1');
  if (style.positionX < 0 || style.positionX > 100) errors.push('positionX must be between 0 and 100');
  if (style.positionY < 0 || style.positionY > 100) errors.push('positionY must be between 0 and 100');
  if (style.maxWidth < 20 || style.maxWidth > 100) errors.push('maxWidth must be between 20 and 100');
  if (style.boxWidthPercent !== null && (style.boxWidthPercent < 5 || style.boxWidthPercent > 100)) {
    errors.push('boxWidthPercent must be between 5 and 100 when set');
  }
  return errors;
};
