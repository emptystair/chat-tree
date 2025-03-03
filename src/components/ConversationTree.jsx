// components/ConversationTree.jsx
import React, { useState } from 'react';
import { useConversation } from '../hooks/useConversationState';

const ConversationTree = ({ onSelectBranch, activeBranchId }) => {
  const [expandedNodes, setExpandedNodes] = useState(['root']);
  const [isRenaming, setIsRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  
  const { 
    getAllBranches, 
    createBranch, 
    createNewConversation,
    updateBranchTitle,
    deleteBranch
  } = useConversation();
  
  const { branches, order } = getAllBranches();
  
  const handleToggleExpand = (branchId) => {
    setExpandedNodes(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };
  
  const handleStartRename = (branchId, currentTitle) => {
    setIsRenaming(branchId);
    setRenameValue(currentTitle);
  };
  
  const handleRename = (branchId) => {
    if (renameValue.trim()) {
      updateBranchTitle(branchId, renameValue);
    }
    setIsRenaming(null);
  };
  
  const handleCreateFork = (parentId) => {
    const newBranchId = createBranch(parentId);
    onSelectBranch(newBranchId);
    
    // Expand the parent to show the new branch
    if (!expandedNodes.includes(parentId)) {
      setExpandedNodes(prev => [...prev, parentId]);
    }
  };
  
  const handleCreateNewConversation = () => {
    const newBranchId = createNewConversation();
    onSelectBranch(newBranchId);
  };
  
  const handleDeleteBranch = (branchId, e) => {
    e.stopPropagation();
    
    if (branchId === 'root') {
      alert('Cannot delete the root conversation.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      deleteBranch(branchId);
      
      // If the active branch is deleted, select its parent or the root
      if (branchId === activeBranchId) {
        const parentId = branches[branchId].parentId;
        onSelectBranch(parentId || 'root');
      }
    }
  };
  
  const renderBranchNode = (branchId, depth = 0) => {
    const branch = branches[branchId];
    if (!branch) return null;
    
    const isExpanded = expandedNodes.includes(branchId);
    const hasChildren = branch.children.length > 0;
    
    return (
      <div key={branchId} className="branch-node-container">
        <div 
          className={`branch-node ${activeBranchId === branchId ? 'active' : ''}`}
          style={{ paddingLeft: `${depth * 16}px` }}
          onClick={() => onSelectBranch(branchId)}
        >
          <div className="branch-node-content">
            {hasChildren && (
              <button
                className="toggle-expand"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(branchId);
                }}
              >
                {isExpanded ? '▼' : '►'}
              </button>
            )}
            
            {isRenaming === branchId ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRename(branchId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(branchId);
                  if (e.key === 'Escape') setIsRenaming(null);
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="rename-input"
              />
            ) : (
              <span className="branch-title">{branch.title}</span>
            )}
          </div>
          
          <div className="branch-actions">
            <button
              className="action-button rename"
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                handleStartRename(branchId, branch.title);
              }}
            >
              ✏️
            </button>
            <button
              className="action-button fork"
              title="Fork branch"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateFork(branchId);
              }}
            >
              🍴
            </button>
            <button
              className="action-button delete"
              title="Delete branch"
              onClick={(e) => handleDeleteBranch(branchId, e)}
            >
              🗑️
            </button>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="branch-children">
            {branch.children.map(childId => renderBranchNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  // Filter out top-level branches (no parent)
  const rootBranches = order.filter(id => !branches[id].parentId || branches[id].parentId === null);
  
  return (
    <div className="conversation-tree">
      <div className="tree-header">
        <h3>Conversation Tree</h3>
        <button 
          className="new-conversation-button"
          onClick={handleCreateNewConversation}
        >
          + New Conversation
        </button>
      </div>
      
      <div className="tree-content">
        {rootBranches.map(branchId => renderBranchNode(branchId))}
      </div>
    </div>
  );
};

export default ConversationTree;