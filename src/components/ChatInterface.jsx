// components/ChatInterface.jsx with provider at top and model selector at bottom
import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import TextSelectionToolbar from './TextSelectionToolbar';
import ModelSelector from './ModelSelector';
import ProviderSelector from './ProviderSelector';
import ApiKeyManager from './ApiKeyManager';
import { useConversation } from '../hooks/useConversationState';
import { sendMessage } from '../services/llmService';

const ChatInterface = ({ activeBranchId }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [streamingContent, setStreamingContent] = useState('');
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  
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
  
  // Auto-resize textarea when input changes
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      
      // Set the height to the scrollHeight, but cap it at 150px
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);
  
  // Get saved API key for the current provider
  const getSavedApiKey = () => {
    if (currentProvider === 'ollama') return null;
    return localStorage.getItem(`${currentProvider}_api_key`) || '';
  };
  
  // Save API key to localStorage
  const handleSaveApiKey = (apiKey) => {
    if (currentProvider !== 'ollama') {
      localStorage.setItem(`${currentProvider}_api_key`, apiKey);
    }
  };
  
  const messages = getBranchMessages(activeBranchId);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);
  
  const handleStreamingUpdate = (content) => {
    setStreamingContent(content);
    
    if (streamingMessageId) {
      // Update the message content in the store to persist it
      updateMessageContent(activeBranchId, streamingMessageId, content);
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (input.trim() === '') return;
    
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
  };
  
  const handleTextSelection = () => {
    if (window.getSelection && window.getSelection().toString().trim().length > 0) {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(text);
        setSelectionPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX
        });
      }
    } else {
      setSelectedText('');
      setSelectionPosition(null);
    }
  };
  
  const handleExpandSelection = () => {
    const newBranchId = createBranch(activeBranchId, selectedText);
    setSelectedText('');
    setSelectionPosition(null);
    return newBranchId;
  };
  
  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);
    
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('keyup', handleTextSelection);
    };
  }, []);
  
  const handleModelChange = (model) => {
    console.log(`Setting active model to: ${model}`);
    setActiveModel(model);
  };

  const handleProviderChange = (provider) => {
    console.log(`Changing provider to: ${provider}`);
    setActiveProvider(provider);
    
    // Set default model for this provider
    const defaultModels = {
      'ollama': 'deepseek-r1:32b',
      'anthropic': 'claude-3-5-sonnet-20240620',
      'openai': 'gpt-4o'
    };
    
    setActiveModel(defaultModels[provider] || 'deepseek-r1:32b');
  };

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
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Reply to Claude..."
            className="message-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || input.trim() === ''}
          >
            Send
          </button>
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