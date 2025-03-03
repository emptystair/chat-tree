// App.jsx or your main container component
import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import ConversationTree from './components/ConversationTree';

const App = () => {
  const [activeBranchId, setActiveBranchId] = useState('root');
  
  const handleSelectBranch = (branchId) => {
    setActiveBranchId(branchId);
  };
  
  return (
    <div className="app-container">
      <div className="chat-panel">
        <ChatInterface activeBranchId={activeBranchId} />
      </div>
      
      <div className="sidebar-panel">
        <ConversationTree 
          onSelectBranch={handleSelectBranch} 
          activeBranchId={activeBranchId} 
        />
      </div>
    </div>
  );
};

export default App;