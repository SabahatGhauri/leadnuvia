export type Source = { title: string; content: string; source_url: string };
// Retrieval is scoped to one verified agent; no shared customer cache.
export function retrieve(documents: Source[], query: string) {
  const words = [
    ...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []),
  ].slice(0, 40);
  return documents
    .flatMap((doc) => {
      const chunks: Source[] = [];
      for (let start = 0; start < doc.content.length; start += 1400)
        chunks.push({
          ...doc,
          content: doc.content.slice(start, start + 1600),
        });
      return chunks;
    })
    .map((doc, index) => ({
      doc,
      index,
      score: words.reduce(
        (n, w) => n + (doc.content.toLowerCase().includes(w) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter((x) => x.score > 0)
    .slice(0, 5)
    .map((x) => x.doc);
}
