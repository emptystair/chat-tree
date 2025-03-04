// Modified ChatInterface.jsx with contentEditable input
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import MessageBubble from './MessageBubble';
import TextSelectionToolbar from './TextSelectionToolbar';
import ModelSelector from './ModelSelector';
import ProviderSelector from './ProviderSelector';
import ApiKeyManager from './ApiKeyManager';
import { useConversation } from '../hooks/useConversationState';
import { sendMessage } from '../services/llmService';

// ContentEditable Input Component
const ContentEditableInput = ({ 
  value, 
  onChange, 
  onSend, 
  placeholder, 
  disabled 
}) => {
  const inputRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  
  // Update the contentEditable div when value prop changes (e.g., after sending)
  useEffect(() => {
    if (inputRef.current && value !== inputRef.current.textContent) {
      inputRef.current.textContent = value;
      setIsEmpty(value === '');
    }
  }, [value]);
  
  // Handle input changes
  const handleInput = useCallback((e) => {
    const text = e.target.textContent;
    onChange(text);
    setIsEmpty(text === '');
  }, [onChange]);
  
  // Handle key presses (Enter to send)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = inputRef.current.textContent.trim();
      if (text && !disabled) {
        onSend();
      }
    }
  }, [onSend, disabled]);
  
  // Click placeholder to focus
  const handlePlaceholderClick = useCallback(() => {
    inputRef.current.focus();
  }, []);
  
  // Handle paste to strip formatting
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);
  
  return (
    <div className="contenteditable-wrapper" style={{ position: 'relative', width: '100%', minHeight: '36px' }}>
      {isEmpty && !disabled && (
        <div 
          className="placeholder" 
          onClick={handlePlaceholderClick}
          style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            color: '#999',
            pointerEvents: isEmpty ? 'auto' : 'none',
            userSelect: 'none'
          }}
        >
          {placeholder}
        </div>
      )}
      <div
        ref={inputRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="contenteditable-input"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        style={{
          minHeight: '36px',
          maxHeight: '120px',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          outline: 'none',
          lineHeight: '20px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          cursor: disabled ? 'not-allowed' : 'text',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          // Improve rendering performance
          transform: 'translateZ(0)',
          willChange: 'contents'
        }}
      />
    </div>
  );
};

// Memoized send button to prevent unnecessary re-renders
const SendButton = memo(({ onClick, disabled }) => (
  <button 
    type="submit" 
    className="send-button"
    disabled={disabled}
    onClick={onClick}
    style={{
      height: '36px',
      margin: 0
    }}
  >
    Send
  </button>
));

// Main ChatInterface component
const ChatInterface = ({ activeBranchId }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [streamingContent, setStreamingContent] = useState('');
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  // Get conversation state from context
  const { 
    addMessage, 
    getBranchMessages,
    createBranch,
    setActiveModel,
    getActiveModel,
    setActiveProvider,
    getActiveProvider,
    updateMessageContent
  } = useConversation();
  
  const currentModel = getActiveModel();
  const currentProvider = getActiveProvider();
  
  // Memoized provider display name function
  const getProviderDisplayName = useCallback(() => {
    if (!currentProvider) return 'LLM';
    
    const providerNames = {
      'ollama': 'Ollama',
      'anthropic': 'Claude',
      'openai': 'OpenAI'
    };
    
    return providerNames[currentProvider] || currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1);
  }, [currentProvider]);
  
  // Get saved API key - memoized to prevent recalculation
  const getSavedApiKey = useCallback(() => {
    if (currentProvider === 'ollama') return null;
    return localStorage.getItem(`${currentProvider}_api_key`) || '';
  }, [currentProvider]);
  
  // Save API key to localStorage - memoized
  const handleSaveApiKey = useCallback((apiKey) => {
    if (currentProvider !== 'ollama') {
      localStorage.setItem(`${currentProvider}_api_key`, apiKey);
    }
  }, [currentProvider]);
  
  // Get messages for the current branch
  const messages = getBranchMessages(activeBranchId);
  
  // Scroll to bottom of messages - memoized
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  
  // Scroll to bottom when messages or streaming content change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, streamingContent, scrollToBottom]);
  
  // Handle streaming updates - memoized
  const handleStreamingUpdate = useCallback((content) => {
    setStreamingContent(content);
    
    if (streamingMessageId) {
      updateMessageContent(activeBranchId, streamingMessageId, content);
    }
  }, [activeBranchId, streamingMessageId, updateMessageContent]);
  
  // Handle send message - memoized
  const handleSendMessage = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    if (input.trim() === '' || isLoading) return;
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date().toISOString()
    };
    
    addMessage(activeBranchId, userMessage);
    setInput('');
    setIsLoading(true);
    
    // Create a placeholder message for the streaming response
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    };
    
    addMessage(activeBranchId, assistantMessage);
    setStreamingMessageId(assistantMessageId);
    setStreamingContent('');
    
    try {
      // Send the message with the streaming callback
      const finalResponse = await sendMessage(
        messages.concat(userMessage),
        currentModel,
        currentProvider,
        handleStreamingUpdate
      );
      
      // Final update to ensure everything is saved
      updateMessageContent(activeBranchId, assistantMessageId, finalResponse);
      
    } catch (error) {
      console.error('Error getting response from LLM:', error);
      
      updateMessageContent(
        activeBranchId,
        assistantMessageId,
        `Sorry, there was an error: ${error.message || 'Unknown error'}. Make sure the backend server is running at http://localhost:3001 and API keys are set correctly.`
      );
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      setStreamingContent('');
    }
  }, [
    input, 
    isLoading, 
    activeBranchId, 
    addMessage, 
    messages, 
    currentModel, 
    currentProvider, 
    handleStreamingUpdate, 
    updateMessageContent
  ]);
  
  // Optimized text selection handler with debounce
  const handleTextSelection = useCallback(() => {
    // Only run if window and selection exist
    if (!window.getSelection) return;
    
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) {
      setSelectedText('');
      setSelectionPosition(null);
      return;
    }
    
    const text = selection.toString().trim();
    if (text) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(text);
        setSelectionPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX
        });
      } catch (e) {
        console.error('Error getting selection position:', e);
      }
    }
  }, []);
  
  // Use a debounced version of the selection handler for performance
  useEffect(() => {
    let debounceTimer;
    
    const debouncedHandler = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleTextSelection, 150);
    };
    
    document.addEventListener('mouseup', debouncedHandler);
    document.addEventListener('keyup', debouncedHandler);
    
    return () => {
      clearTimeout(debounceTimer);
      document.removeEventListener('mouseup', debouncedHandler);
      document.removeEventListener('keyup', debouncedHandler);
    };
  }, [handleTextSelection]);
  
  // Handle expanding selection to a new branch - memoized
  const handleExpandSelection = useCallback(() => {
    const newBranchId = createBranch(activeBranchId, selectedText);
    setSelectedText('');
    setSelectionPosition(null);
    return newBranchId;
  }, [activeBranchId, selectedText, createBranch]);
  
  // Handle model change - memoized
  const handleModelChange = useCallback((model) => {
    console.log(`Setting active model to: ${model}`);
    setActiveModel(model);
  }, [setActiveModel]);

  // Handle provider change - memoized
  const handleProviderChange = useCallback((provider) => {
    console.log(`Changing provider to: ${provider}`);
    setActiveProvider(provider);
    
    // Set default model for this provider
    const defaultModels = {
      'ollama': 'deepseek-r1:32b',
      'anthropic': 'claude-3-5-sonnet-20240620',
      'openai': 'gpt-4o'
    };
    
    setActiveModel(defaultModels[provider] || 'deepseek-r1:32b');
  }, [setActiveProvider, setActiveModel]);

  // Render the chat interface
  return (
    <div className="chat-interface" ref={chatContainerRef}>
      <div className="chat-header">
        <div className="provider-section">
          <ProviderSelector 
            provider={currentProvider}
            onProviderChange={handleProviderChange}
          />
          <ApiKeyManager
            provider={currentProvider}
            onSaveApiKey={handleSaveApiKey}
            savedApiKey={getSavedApiKey()}
          />
        </div>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Start a new conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={
                // Override the content for the message that's currently streaming
                message.id === streamingMessageId
                  ? { ...message, content: streamingContent }
                  : message
              }
              isStreaming={message.id === streamingMessageId}
            />
          ))
        )}
        {isLoading && !streamingMessageId && (
          <div className="loading-indicator">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-section">
        <form className="input-container" onSubmit={handleSendMessage}>
          {/* Using ContentEditable input instead of textarea */}
          <ContentEditableInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            placeholder={`Reply to ${getProviderDisplayName()}...`}
            disabled={isLoading}
          />
          <SendButton 
            onClick={handleSendMessage}
            disabled={isLoading || input.trim() === ''}
          />
        </form>
        
        {/* Model selection controls below chat input */}
        <div className="model-controls-bottom">
          <ModelSelector 
            provider={currentProvider}
            onModelSelect={handleModelChange}
            currentModel={currentModel}
          />
        </div>
      </div>
      
      {selectedText && selectionPosition && (
        <TextSelectionToolbar
          position={selectionPosition}
          onExpand={handleExpandSelection}
          onClose={() => {
            setSelectedText('');
            setSelectionPosition(null);
          }}
        />
      )}
    </div>
  );
};

export default ChatInterface;