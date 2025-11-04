import React, { useRef } from 'react';
import { UploadIcon, FileTextIcon, Trash2Icon, LoaderIcon } from './Icons';

interface SidebarProps {
  sources: string[];
  onFileUpload: (file: File) => void;
  onDeleteDocument: (name: string) => void;
  isProcessing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ sources, onFileUpload, onDeleteDocument, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
      // Reset file input to allow uploading the same file again
      event.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <aside className="w-80 flex-shrink-0 bg-gray-800/80 p-4 flex flex-col h-full border-r border-gray-700">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".txt,.pdf,.xlsx,.md"
      />
      <button
        onClick={handleUploadClick}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-4 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? (
          <>
            <LoaderIcon className="animate-spin w-5 h-5"/>
            Processing...
          </>
        ) : (
          <>
            <UploadIcon className="w-5 h-5"/>
            Upload Document
          </>
        )}
      </button>
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-lg font-bold mb-2 text-gray-300">Sources</h2>
        {sources.length > 0 ? (
          <ul className="space-y-2">
            {sources.map((docName) => (
              <li
                key={docName}
                className="flex items-center justify-between p-2 bg-gray-700/50 rounded-md group"
              >
                <div className="flex items-center min-w-0">
                  <FileTextIcon className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate text-sm text-gray-200" title={docName}>
                    {docName}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteDocument(docName)}
                  className="p-1 rounded-md text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Delete ${docName}`}
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500 mt-4 text-sm">
            No documents uploaded.
          </div>
        )}
      </div>
       <div className="text-xs text-gray-500 mt-4">
          Supported files: .txt, .pdf, .xlsx, .md
       </div>
    </aside>
  );
};
