import React, { useState } from 'react';

interface SearchAndFilterProps {
  onTagFilter: (tag: string | null) => void;
  availableTags: string[];
  currentTag: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onTagFilter,
  availableTags,
  currentTag,
  searchQuery,
  onSearchChange,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center">
        <label className="flex-1 text-sm text-gray-700">
          <span className="hidden">Search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, description, author, or location"
            className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-gray-500 focus:outline-none focus:ring-0"
          />
        </label>

        <div className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setOpen(prev => !prev)}
            className="flex w-full items-center justify-between rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 sm:w-48"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span>{currentTag ? `#${currentTag}` : 'Filter by tag'}</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 9l6 6 6-6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 z-10 mt-2 w-48 rounded border border-gray-200 bg-white shadow-sm">
              <ul className="max-h-48 overflow-auto py-2" role="listbox">
                <li>
                  <button
                    onClick={() => {
                      onTagFilter(null);
                      setOpen(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm ${currentTag === null ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    Show all
                  </button>
                </li>
                {availableTags.map(tag => (
                  <li key={tag}>
                    <button
                      onClick={() => {
                        onTagFilter(tag === currentTag ? null : tag);
                        setOpen(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm ${currentTag === tag ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      #{tag}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilter;
