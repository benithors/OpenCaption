import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export type SettingsDocument = {
  apiKeyPlaintext?: string;
  apiKeyCiphertextBase64?: string;
  lastExportDirectory?: string;
};

const ensureDir = async (filePath: string) => {
  await mkdir(path.dirname(filePath), {recursive: true});
};

export const loadSettings = async (filePath: string): Promise<SettingsDocument> => {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as SettingsDocument;
  } catch {
    return {};
  }
};

export const saveSettings = async (filePath: string, settings: SettingsDocument) => {
  await ensureDir(filePath);
  await writeFile(filePath, JSON.stringify(settings, null, 2), 'utf8');
};
