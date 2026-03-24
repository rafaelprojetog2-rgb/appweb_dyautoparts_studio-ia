import React from 'react';
import { Search, Camera } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onCameraClick?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder, onCameraClick }) => {
  return (
    <div className="relative flex items-center gap-3">
      <div className="relative flex-1 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dy-gray-light group-focus-within:text-dy-accent transition-colors" size={20} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Buscar..."}
          className="w-full pl-12 pr-4 py-4 bg-dy-gray-mid border border-dy-gray-light/20 rounded-2xl text-dy-white placeholder:text-dy-gray-light focus:outline-none focus:border-dy-accent/50 focus:bg-dy-gray-dark transition-all text-sm font-medium"
        />
      </div>
      {onCameraClick && (
        <button
          onClick={onCameraClick}
          className="p-4 bg-dy-accent text-dy-black rounded-2xl active:scale-95 transition-all shadow-xl shadow-dy-accent/20 hover:brightness-110"
        >
          <Camera size={22} />
        </button>
      )}
    </div>
  );
};
