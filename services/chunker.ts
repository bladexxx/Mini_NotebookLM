import type { DocumentChunk } from '../types';

// A simple sentence tokenizer (heuristic)
const getSentences = (text: string): string[] => {
  // This regex is a simplified approach to split text into sentences.
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
};

/**
 * Splits a long text into smaller chunks based on sentence boundaries.
 * @param sourceName - The name of the source file.
 * @param text - The full text content to be chunked.
 * @returns An array of DocumentChunk objects.
 */
export const chunkText = (
  sourceName: string,
  text: string
): DocumentChunk[] => {
  const sentences = getSentences(text);
  const chunks: string[] = [];
  const chunkSize = 1500; // Target size in characters (approximates ~300-400 tokens)
  const overlapSentences = 2; // Number of sentences to overlap between chunks

  if (text.length < chunkSize) {
    return [{ source: sourceName, content: text }];
  }

  let currentChunkSentences: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const currentLength = currentChunkSentences.join(' ').length;

    // If adding the next sentence exceeds chunk size, finalize the current chunk
    if (currentLength + sentence.length > chunkSize && currentChunkSentences.length > 0) {
      chunks.push(currentChunkSentences.join(' '));
      
      // Create an overlap by starting the next chunk with the last few sentences
      const startIndex = Math.max(0, currentChunkSentences.length - overlapSentences);
      currentChunkSentences = currentChunkSentences.slice(startIndex);
    }
    
    currentChunkSentences.push(sentence);
  }

  // Add the last remaining chunk
  if (currentChunkSentences.length > 0) {
    chunks.push(currentChunkSentences.join(' '));
  }

  return chunks.map(content => ({
    source: sourceName,
    content: content,
  }));
};
