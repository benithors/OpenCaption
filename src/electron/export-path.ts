import path from 'node:path';

const subtitledSuffix = '_subtitled';

export const getDefaultExportFilename = (videoPath: string) => {
  const parsedPath = path.parse(videoPath);
  const baseName = parsedPath.name.endsWith(subtitledSuffix)
    ? parsedPath.name
    : `${parsedPath.name}${subtitledSuffix}`;

  return `${baseName}.mp4`;
};

export const getDefaultExportPath = (videoPath: string, lastExportDirectory: string | undefined, fallbackDirectory: string) => {
  const directory = lastExportDirectory || path.dirname(videoPath) || fallbackDirectory;
  return path.join(directory, getDefaultExportFilename(videoPath));
};
