import type { DocumentChunkWithEmbedding } from '../types';

/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The cosine similarity score.
 */
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * An in-memory vector database for storing and searching document chunks.
 */
export class VectorStore {
  private chunks: DocumentChunkWithEmbedding[] = [];

  /**
   * Adds new chunks to the store.
   * @param newChunks - An array of chunks with their embeddings.
   */
  add(newChunks: DocumentChunkWithEmbedding[]) {
    this.chunks.push(...newChunks);
  }

  /**
   * Removes all chunks associated with a specific source document.
   * @param sourceName - The name of the document to remove.
   */
  removeBySource(sourceName: string) {
    this.chunks = this.chunks.filter(chunk => chunk.source !== sourceName);
  }

  /**
   * Searches for the most relevant chunks based on a query embedding.
   * @param queryEmbedding - The embedding of the user's question.
   * @param topK - The number of top results to return.
   * @returns An array of the most relevant chunks.
   */
  search(queryEmbedding: number[], topK: number): DocumentChunkWithEmbedding[] {
    const scoredChunks = this.chunks.map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scoredChunks.sort((a, b) => b.similarity - a.similarity);

    return scoredChunks.slice(0, topK);
  }

  /**
   * Gets a list of unique source document names currently in the store.
   */
  getSources(): string[] {
    return [...new Set(this.chunks.map(chunk => chunk.source))];
  }
  
  /**
   * Checks if a document source already exists in the store.
   * @param sourceName - The name of the document.
   */
  hasSource(sourceName: string): boolean {
    return this.getSources().includes(sourceName);
  }
}
