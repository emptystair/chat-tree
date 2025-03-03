// components/ApiKeyManager.jsx
import React, { useState, useEffect } from 'react';

const ApiKeyManager = ({ provider, onSaveApiKey, savedApiKey }) => {
  const [apiKey, setApiKey] = useState(savedApiKey || '');
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(!!savedApiKey);
  
  useEffect(() => {
    // Reset state when provider changes
    setApiKey(savedApiKey || '');
    setIsSaved(!!savedApiKey);
  }, [provider, savedApiKey]);
  
  const handleSave = () => {
    if (apiKey.trim()) {
      onSaveApiKey(apiKey.trim());
      setIsSaved(true);
    }
  };
  
  const handleClear = () => {
    setApiKey('');
    onSaveApiKey('');
    setIsSaved(false);
  };
  
  if (provider === 'ollama') {
    return null; // No API key needed for Ollama
  }
  
  const getProviderName = () => {
    switch (provider) {
      case 'anthropic':
        return 'Anthropic';
      case 'openai':
        return 'OpenAI';
      default:
        return provider;
    }
  };
  
  return (
    <div className="api-key-manager">
      <div className="api-key-status">
        <span className="provider-name">{getProviderName()} API Key:</span>
        {isSaved ? (
          <span className="api-key-saved">
            Saved ✓
            <button 
              className="small-button clear-key" 
              onClick={handleClear}
              title="Clear API key"
            >
              Clear
            </button>
          </span>
        ) : (
          <span className="api-key-missing">
            Not Set
          </span>
        )}
      </div>
      
      {!isSaved && (
        <div className="api-key-input-container">
          <div className="api-key-input-wrapper">
            <input
              type={isVisible ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter ${getProviderName()} API key`}
              className="api-key-input"
            />
            <button
              type="button"
              className="visibility-toggle"
              onClick={() => setIsVisible(!isVisible)}
              title={isVisible ? "Hide API key" : "Show API key"}
            >
              {isVisible ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
          <button
            className="save-api-key-button"
            onClick={handleSave}
            disabled={!apiKey.trim()}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;