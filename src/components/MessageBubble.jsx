// components/MessageBubble.jsx
import React, { useEffect, useRef } from 'react';

const MessageBubble = ({ message, isStreaming = false }) => {
  const { role, content, error } = message;
  const contentRef = useRef(null);
  
  // Add a cursor effect for streaming messages
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.classList.add('streaming');
    } else if (contentRef.current) {
      contentRef.current.classList.remove('streaming');
    }
  }, [isStreaming]);
  
  const formatContent = (text) => {
    // Simple markdown-like processing for code blocks
    return text.split('```').map((block, index) => {
      if (index % 2 === 1) {
        // This is a code block
        return (
          <pre key={index} className="code-block">
            <code>{block}</code>
          </pre>
        );
      } else {
        // Convert newlines to <br> tags for regular text
        return (
          <span key={index} className="text-content">
            {block.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < block.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      }
    });
  };
  
  return (
    <div className={`message ${role} ${error ? 'error' : ''} ${isStreaming ? 'is-streaming' : ''}`}>
      {/* Removed the avatar div that contained the emoji */}
      <div className="content" ref={contentRef}>
        {formatContent(content)}
        {isStreaming && <span className="streaming-cursor"></span>}
      </div>
    </div>
  );
};

export default MessageBubble;