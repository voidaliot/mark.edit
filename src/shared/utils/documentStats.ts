export type DocumentStats = {
  words: number;
  characters: number;
};

export function getDocumentStats(content: string): DocumentStats {
  const words = content.trim().match(/\S+/g)?.length ?? 0;

  return {
    words,
    characters: content.length,
  };
}
