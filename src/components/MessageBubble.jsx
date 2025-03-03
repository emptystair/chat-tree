// components/MessageBubble.jsx with fixed imports
import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';

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
  
  return (
    <div className={`message ${role} ${error ? 'error' : ''} ${isStreaming ? 'is-streaming' : ''}`}>
      <div className="content" ref={contentRef}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={tomorrow}
                  language={match[1]}
                  PreTag="div"
                  className="code-block"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            // Keep line breaks for normal paragraphs
            p: ({ children }) => <p className="markdown-paragraph">{children}</p>
          }}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && <span className="streaming-cursor"></span>}
      </div>
    </div>
  );
};

export default MessageBubble;