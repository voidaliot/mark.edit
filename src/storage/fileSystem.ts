import {
  getInitialMarkdownOpenFiles,
  embeddedFilesFromBrowserFiles,
  listenForEmbeddedFileDropRequests,
  listenForMarkdownOpenRequests,
  openMarkdownFile,
  openMarkdownFiles,
  openMarkdownFilesAtPaths,
  openMarkdownFilesFromBrowserFiles,
  pickEmbeddedFiles,
  saveMarkdownFile,
  saveMarkdownFileAs,
  type EmbeddedFileKind,
  type PickedEmbeddedFile,
  type OpenedMarkdownFile,
  type SavedMarkdownFile,
} from '../platform/tauriCommands';
import type { MarkittyDocument } from './documentModel';

export async function openMarkdownFromDevice(): Promise<OpenedMarkdownFile | null> {
  return openMarkdownFile();
}

export async function openMarkdownFilesFromDevice(): Promise<OpenedMarkdownFile[]> {
  return openMarkdownFiles();
}

export async function openMarkdownFromDroppedFiles(
  files: FileList | File[],
): Promise<OpenedMarkdownFile[]> {
  return openMarkdownFilesFromBrowserFiles(files);
}

export function embeddedFilesFromDroppedFiles(
  files: FileList | File[],
): PickedEmbeddedFile[] {
  return embeddedFilesFromBrowserFiles(files, 'file', true);
}

export async function pickFilesForEmbedding(
  kind: EmbeddedFileKind,
): Promise<PickedEmbeddedFile[]> {
  return pickEmbeddedFiles(kind);
}

export async function listenForEmbeddedFilesToDrop(
  onDrop: (files: PickedEmbeddedFile[]) => void,
): Promise<() => void> {
  return listenForEmbeddedFileDropRequests(onDrop);
}

export async function openMarkdownFromPaths(paths: string[]): Promise<OpenedMarkdownFile[]> {
  return openMarkdownFilesAtPaths(paths);
}

export async function getInitialMarkdownFilesToOpen(): Promise<OpenedMarkdownFile[]> {
  return getInitialMarkdownOpenFiles();
}

export async function listenForMarkdownFilesToOpen(
  onOpen: (files: OpenedMarkdownFile[]) => void,
  onError?: (error: Error) => void,
): Promise<() => void> {
  return listenForMarkdownOpenRequests(onOpen, onError);
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
