import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { processFile } from './services/fileProcessor';
import { getAnswerFromDocuments, embedChunks } from './services/geminiService';
import { chunkText } from './services/chunker';
import { VectorStore } from './services/vectorStore';
import type { Message } from './types';
import { LogoIcon } from './components/Icons';

const App: React.FC = () => {
  const [sources, setSources] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const vectorStoreRef = useRef(new VectorStore());

  useEffect(() => {
    setMessages([
      {
        id: 'initial',
        role: 'ai',
        content: 'Hello! Please upload a `.txt`, `.pdf`, `.xlsx`, or `.md` document to get started. I will only answer questions based on the documents you provide.'
      }
    ]);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (vectorStoreRef.current.hasSource(file.name)) {
      alert(`File "${file.name}" is already uploaded.`);
      return;
    }
    
    setIsProcessing(true);
    try {
      setMessages(prevMessages => [...prevMessages, {
        id: `file-processing-${Date.now()}`,
        role: 'system',
        content: `Processing "${file.name}"...`
      }]);

      const content = await processFile(file);
      const chunks = chunkText(file.name, content);
      
      setMessages(prevMessages => [...prevMessages, {
        id: `file-embedding-${Date.now()}`,
        role: 'system',
        content: `Creating embeddings for ${chunks.length} chunks of "${file.name}"...`
      }]);

      const embeddedChunks = await embedChunks(chunks);
      vectorStoreRef.current.add(embeddedChunks);
      setSources(vectorStoreRef.current.getSources());

      setMessages(prevMessages => [...prevMessages, {
        id: `file-upload-${Date.now()}`,
        role: 'system',
        content: `File "${file.name}" processed and ready.`
      }]);
    } catch (error) {
      console.error("Error processing file:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages(prevMessages => [...prevMessages, {
        id: `file-error-${Date.now()}`,
        role: 'system',
        content: `Error processing file "${file.name}": ${errorMessage}`
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDeleteDocument = useCallback((docName: string) => {
    vectorStoreRef.current.removeBySource(docName);
    setSources(vectorStoreRef.current.getSources());
    setMessages(prevMessages => [...prevMessages, {
      id: `file-delete-${Date.now()}`,
      role: 'system',
      content: `File "${docName}" and its chunks have been removed.`
    }]);
  }, []);

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput,
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const aiResponse = await getAnswerFromDocuments(userInput, vectorStoreRef.current);
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: aiResponse,
      };
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error getting answer from Gemini:", error);
      const errorMessageContent = error instanceof Error ? error.message : "Sorry, something went wrong.";
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'ai',
        content: `Error: ${errorMessageContent}`,
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex h-screen w-screen font-sans bg-gray-900 text-gray-200">
      <Sidebar
        sources={sources}
        onFileUpload={handleFileUpload}
        onDeleteDocument={handleDeleteDocument}
        isProcessing={isProcessing}
      />
      <main className="flex-1 flex flex-col h-screen">
        <header className="flex items-center p-4 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
           <LogoIcon className="w-8 h-8 mr-3 text-blue-400" />
          <h1 className="text-xl font-semibold text-gray-100">Mini NotebookLM</h1>
        </header>
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          hasDocuments={sources.length > 0}
        />
      </main>
    </div>
  );
};

export default App;
