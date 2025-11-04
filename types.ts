export interface DocumentChunk {
  source: string; // Original filename
  content: string;
}

export interface DocumentChunkWithEmbedding extends DocumentChunk {
  embedding: number[];
}

export interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
}
