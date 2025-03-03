// Modified ProviderSelector.jsx
import React, { useState, useRef, useEffect } from 'react';

const ProviderSelector = ({ provider, onProviderChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const providers = [
    { id: 'ollama', name: 'Ollama (Local)' },
    { id: 'anthropic', name: 'Anthropic (Claude)' },
    { id: 'openai', name: 'OpenAI (GPT)' }
  ];
  
  const selectedProvider = providers.find(p => p.id === provider) || providers[0];
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="provider-selector">
      <label htmlFor="provider-dropdown">Provider:</label>
      <div className="custom-select-container" ref={dropdownRef}>
        <button 
          className="custom-select-button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          type="button"
        >
          <span>{selectedProvider?.name || 'Select provider'}</span>
          <span className="custom-select-arrow">▼</span>
        </button>
        
        {isOpen && (
          <ul 
            className="custom-select-dropdown" 
            role="listbox" 
            aria-activedescendant={provider}
          >
            {providers.map((p) => (
              <li
                key={p.id}
                role="option"
                aria-selected={p.id === provider}
                className={`custom-select-option ${p.id === provider ? 'selected' : ''}`}
                onClick={() => {
                  onProviderChange(p.id);
                  setIsOpen(false);
                }}
              >
                {p.name}
                {p.id === provider && <span className="checkmark">✓</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ProviderSelector;