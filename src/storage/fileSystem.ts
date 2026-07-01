import {
  openMarkdownFile,
  saveMarkdownFile,
  saveMarkdownFileAs,
  type OpenedMarkdownFile,
  type SavedMarkdownFile,
} from '../platform/tauriCommands';
import type { MarkittyDocument } from './documentModel';

export async function openMarkdownFromDevice(): Promise<OpenedMarkdownFile | null> {
  return openMarkdownFile();
}

export async function saveMarkdownToDevice(
  document: MarkittyDocument,
): Promise<SavedMarkdownFile | null> {
  return saveMarkdownFile(document.path, document.content, document.title);
}

export async function saveMarkdownToNewPath(
  document: MarkittyDocument,
): Promise<SavedMarkdownFile | null> {
  return saveMarkdownFileAs(document.content, document.title);
}
