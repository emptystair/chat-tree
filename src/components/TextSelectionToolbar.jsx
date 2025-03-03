// components/TextSelectionToolbar.jsx
import React from 'react';

const TextSelectionToolbar = ({ position, onExpand, onClose }) => {
  const handleExpandClick = () => {
    const newBranchId = onExpand();
    onClose();
    return newBranchId;
  };
  
  return (
    <div 
      className="text-selection-toolbar"
      style={{
        top: `${position.top - 40}px`,
        left: `${position.left}px`
      }}
    >
      <button 
        className="expand-button"
        onClick={handleExpandClick}
      >
        Expand on this
      </button>
      <button 
        className="close-button"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
};

export default TextSelectionToolbar;