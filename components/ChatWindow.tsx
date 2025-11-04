

import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import { SendIcon, UserIcon, BotIcon, InfoIcon, LoaderIcon } from './Icons';

// This makes the marked library available in the component
declare const marked: any;

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  hasDocuments: boolean;
}

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const { role, content } = message;
  const isUser = role === 'user';
  const isAI = role === 'ai';
  const isSystem = role === 'system';

  const createMarkup = (text: string) => {
    return { __html: marked.parse(text) };
  };

  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-2">
        <div className="flex items-center text-xs text-gray-400 bg-gray-700/50 px-3 py-1 rounded-full">
          <InfoIcon className="w-4 h-4 mr-2" />
          <span>{content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <BotIcon className="w-5 h-5 text-white" />
        </div>
      )}
      <div className={`max-w-xl p-3 rounded-xl shadow-md ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
        {isAI ? (
           <div className="prose prose-sm prose-invert" dangerouslySetInnerHTML={createMarkup(content)} />
        ) : (
          <p>{content}</p>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-5 h-5 text-gray-300" />
        </div>
      )}
    </div>
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, isLoading, hasDocuments }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && hasDocuments) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-800">
      <div className="flex-1 p-6 overflow-y-auto">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-start gap-3 my-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
               <BotIcon className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-xl p-3 rounded-xl shadow-md bg-gray-700 flex items-center space-x-2">
                <LoaderIcon className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-gray-400 text-sm">AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasDocuments ? "Ask a question about your documents..." : "Please upload a document first"}
            disabled={!hasDocuments || isLoading}
            className="w-full px-4 py-3 pr-12 bg-gray-700 text-gray-200 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
          />
          <button
            type="submit"
            disabled={!hasDocuments || isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
