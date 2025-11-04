import { GoogleGenAI } from "@google/genai";
import type { DocumentChunk, DocumentChunkWithEmbedding } from '../types';
import { VectorStore } from './vectorStore';

// This `declare` block informs TypeScript that `process` is globally available.
// Vite's `define` configuration replaces these variables at build time.
declare var process: {
  env: {
    // This is from the execution environment (e.g., a secret).
    API_KEY: string;
    // These are injected by vite.config.ts.
    VITE_AI_PROVIDER: 'GEMINI' | 'GATEWAY';
    VITE_AI_GATEWAY_URL: string;
    VITE_AI_GATEWAY_API_KEY: string;
    VITE_AI_GATEWAY_EMBEDDING_MODEL: string;
    VITE_AI_GATEWAY_CHAT_MODEL: string;
  }
};

// --- Configuration ---
const aiProvider = process.env.VITE_AI_PROVIDER || 'GEMINI';
const gatewayUrl = process.env.VITE_AI_GATEWAY_URL;
const gatewayApiKey = process.env.VITE_AI_GATEWAY_API_KEY;
const gatewayEmbeddingModel = process.env.VITE_AI_GATEWAY_EMBEDDING_MODEL;
const gatewayChatModel = process.env.VITE_AI_GATEWAY_CHAT_MODEL;
const geminiApiKey = process.env.API_KEY;

// --- AI Client Initialization ---
let ai: GoogleGenAI;
if (aiProvider === 'GEMINI') {
  if (!geminiApiKey) {
    throw new Error("AI provider is 'GEMINI' but API_KEY is not set in the environment.");
  }
  ai = new GoogleGenAI({ apiKey: geminiApiKey });
}

// --- Startup Logging ---
console.groupCollapsed('[AI Service] Configuration Loaded');
console.info(`AI Provider: %c${aiProvider}`, 'font-weight: bold;');
if (aiProvider === 'GATEWAY') {
    console.log(`Gateway Base URL: ${gatewayUrl || 'Not Set'}`);
    console.log(`Gateway Chat Model: ${gatewayChatModel}`);
    console.log(`Gateway Embedding Model: ${gatewayEmbeddingModel}`);
    console.log(`Gateway API Key Set: %c${!!gatewayApiKey}`, `font-weight: bold; color: ${!!gatewayApiKey ? 'green' : 'red'};`);
    if (!gatewayUrl || !gatewayApiKey) {
      console.error('[AI Service] CRITICAL: AI Gateway is the configured provider, but VITE_AI_GATEWAY_URL or VITE_AI_GATEWAY_API_KEY is missing.');
    }
} else {
     console.log(`Gemini API Key Set: %c${!!geminiApiKey}`, `font-weight: bold; color: ${!!geminiApiKey ? 'green' : 'red'};`);
}
console.groupEnd();


/**
 * Internal helper to make a POST request to the AI Gateway.
 * Assumes an OpenAI-compatible API structure.
 */
const _callAiGateway = async (endpoint: string, callName: string, requestBody: { model: string; [key: string]: any; }): Promise<any> => {
    if (!gatewayUrl || !gatewayApiKey) {
        const errorMsg = 'AI Gateway is the configured provider, but its URL or API Key is missing.';
        throw new Error(errorMsg);
    }
    // The model is required in the body for the gateway to process the request.
    const modelInBody = requestBody.model;
    if (!modelInBody) {
        throw new Error('The request body for gateway calls must contain a "model" property.');
    }
    
    // Construct a standard OpenAI-compatible URL, e.g., {base_url}/v1/chat/completions
    const fullGatewayUrl = `${gatewayUrl}/${modelInBody}/${endpoint}`;
    
    try {
        const response = await fetch(fullGatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gatewayApiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorDetails = data?.error?.message || response.statusText;
            throw new Error(`AI Gateway request for ${callName} failed with status ${response.status}: ${errorDetails}`);
        }
        return data;
    } catch (error) {
        console.error(`[AI Service] Error during Gateway fetch operation for ${callName}:`, error);
        throw error;
    }
};

/**
 * Generates an embedding for a given text content.
 */
export const embedContent = async (
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
): Promise<number[]> => {
  if (aiProvider === 'GATEWAY') {
    const response = await _callAiGateway('v1/embeddings', 'single embedding', {
      input: text,
      model: gatewayEmbeddingModel,
    });
    // OpenAI format: response.data is an array of embedding objects
    return response.data[0].embedding;
  } else {
    // Direct Gemini call
    // Fix: Corrected `embedContent` to use the singular `content` property for a single piece of text. The response for a single embedding is also singular: `response.embedding`.
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      content: text,
      taskType: taskType,
    });
    return response.embedding.values;
  }
};

/**
 * Generates embeddings for an array of document chunks using batch processing.
 */
export const embedChunks = async (chunks: DocumentChunk[]): Promise<DocumentChunkWithEmbedding[]> => {
  const contents = chunks.map(chunk => chunk.content);
  let embeddings: number[][];

  if (aiProvider === 'GATEWAY') {
    const response = await _callAiGateway('v1/embeddings', 'batch embedding', {
        input: contents,
        model: gatewayEmbeddingModel,
    });
    embeddings = response.data.map((item: any) => item.embedding);
  } else {
    // Direct Gemini call
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < contents.length; i += BATCH_SIZE) {
        const batchContents = contents.slice(i, i + BATCH_SIZE);
        // Fix: Use `batchEmbedContents` for batching requests. `embedContent` does not accept a `requests` property.
        const result = await ai.models.batchEmbedContents({
            requests: batchContents.map((content) => ({
                model: 'text-embedding-004',
                content,
                taskType: 'RETRIEVAL_DOCUMENT',
            })),
        });
        allEmbeddings.push(...result.embeddings.map(e => e.values));
    }
    embeddings = allEmbeddings;
  }

  if (embeddings.length !== chunks.length) {
    throw new Error("Mismatch between number of chunks and returned embeddings.");
  }

  return chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index],
  }));
};

const buildPrompt = (question: string, chunks: DocumentChunk[]): string => {
  const contextBySource = chunks.reduce((acc, chunk) => {
    if (!acc[chunk.source]) {
      acc[chunk.source] = '';
    }
    acc[chunk.source] += chunk.content + '\n\n';
    return acc;
  }, {} as Record<string, string>);

  let context = '';
  Object.entries(contextBySource).forEach(([sourceName, content], index) => {
    context += `[${index + 1}] Document Name: ${sourceName}\nContent:\n${content.trim()}\n\n---\n\n`;
  });

  return `You are a professional document analysis assistant. Your task is to strictly answer the user's question based on the "Reference Material" provided below.
If you cannot find enough information in the reference material to answer the question, you must respond with: "Sorry, I could not find relevant information in the provided documents."
**Do not make up information or use your own pretrained knowledge.**
Ensure your answer is clear, concise, and explicitly mentions the source document, for example: "According to [Document Name], ...".

---
**Reference Material:**
${context}
---

**User's Question:**
${question}

**Based on the reference material provided, please answer the user's question:**`;
};

export const getAnswerFromDocuments = async (question: string, vectorStore: VectorStore): Promise<string> => {
  if (vectorStore.getSources().length === 0) {
    return "Please upload at least one document before asking a question.";
  }

  const questionEmbedding = await embedContent(question, 'RETRIEVAL_QUERY');
  const relevantChunks = vectorStore.search(questionEmbedding, 5);

  if (relevantChunks.length === 0) {
    return "I couldn't find any relevant information in your documents to answer that question.";
  }

  const prompt = buildPrompt(question, relevantChunks);
  
  if (aiProvider === 'GATEWAY') {
    const promptParts = prompt.split('---');
    const systemInstruction = promptParts[0].trim();
    const userContent = `---${promptParts.slice(1).join('---')}`.trim();

    const response = await _callAiGateway('v1/chat/completions', 'content generation', {
        model: gatewayChatModel,
        messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userContent }
        ],
        stream: false
    });
    return response.choices[0].message.content;

  } else {
    // Direct Gemini call
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text;
  }
};