// src/components/common/DataSourceNote.tsx
import React from 'react';
import { ExternalLink } from 'lucide-react';

interface DataSourceNoteProps {
  sourceName: string;
  sourceLink?: string;
  notes?: string;
  className?: string;
}

const DataSourceNote: React.FC<DataSourceNoteProps> = ({ sourceName, sourceLink, notes, className = '' }) => {
  return (
    <div className={`mt-12 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 ${className}`}>
      <h3 className="font-semibold text-slate-700 mb-1">Data Source:</h3>
      {sourceLink ? (
        <a 
          href={sourceLink} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
        >
          {sourceName}
          <ExternalLink size={14} className="ml-1" />
        </a>
      ) : (
        <span className="text-slate-700">{sourceName}</span>
      )}
      {notes && <p className="mt-2 text-xs">{notes}</p>}
    </div>
  );
};
export default DataSourceNote;