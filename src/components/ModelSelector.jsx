// Modified ModelSelector.jsx (without "Model:" label and bounding box)
import React, { useState, useRef, useEffect } from 'react';

const ModelSelector = ({ provider, onModelSelect, currentModel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Hardcoded models based on provider
  const getModelsForProvider = () => {
    switch (provider) {
      case 'ollama':
        return [
          { id: 'qwen2.5-coder:32b', name: 'Qwen 2.5 Coder 32B' },
          { id: 'deepseek-r1:32b', name: 'DeepSeek R1 32B' },
          { id: 'llama3', name: 'LLaMA 3' },
          { id: 'mistral', name: 'Mistral' }
        ];
      case 'anthropic':
        return [
          { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
        ];
      case 'openai':
        return [
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
        ];
      default:
        return [];
    }
  };
  
  const models = getModelsForProvider();
  const selectedModel = models.find(model => model.id === currentModel) || models[0];
  
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
    <div className="model-selector">
      {/* Removed the label */}
      <div className="dropdown-wrapper" ref={dropdownRef}>
        <button 
          className="model-dropdown-button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          type="button"
        >
          <span>{selectedModel?.name || 'Select model'}</span>
          <span className="dropdown-arrow">▼</span>
        </button>
        
        {isOpen && (
          <ul 
            className="model-dropdown-list" 
            role="listbox" 
            aria-activedescendant={currentModel}
          >
            {models.map((model) => (
              <li
                key={model.id}
                role="option"
                aria-selected={model.id === currentModel}
                className={`model-option ${model.id === currentModel ? 'selected' : ''}`}
                onClick={() => {
                  onModelSelect(model.id);
                  setIsOpen(false);
                }}
              >
                {model.name}
                {model.id === currentModel && <span className="checkmark">✓</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ModelSelector;