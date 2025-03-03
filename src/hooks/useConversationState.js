// hooks/useConversationState.js
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';


const ConversationContext = createContext();

const initialState = {
  branches: {
    root: {
      id: 'root',
      parentId: null,
      messages: [],
      children: [],
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      model: 'llama3', // Default model
      provider: 'ollama' // Default provider
    }
  },
  branchOrder: ['root'],
  activeModel: 'llama3', // Default active model
  activeProvider: 'ollama', // Default active provider
  apiKeys: {
    anthropic: '', // Will be stored in localStorage
    openai: ''     // Will be stored in localStorage
  }
};

function conversationReducer(state, action) {
  switch (action.type) {
    case 'SET_ACTIVE_MODEL': {
      const { model } = action.payload;
      return {
        ...state,
        activeModel: model
      };
    }
    case 'SET_ACTIVE_PROVIDER': {
      const { provider } = action.payload;
      return {
        ...state,
        activeProvider: provider
      };
    }
    case 'SET_API_KEY': {
      const { provider, apiKey } = action.payload;
      // Store API key in localStorage for persistence
      if (apiKey) {
        localStorage.setItem(`apiKey_${provider}`, apiKey);
      } else {
        localStorage.removeItem(`apiKey_${provider}`);
      }
      
      return {
        ...state,
        apiKeys: {
          ...state.apiKeys,
          [provider]: apiKey
        }
      };
    }
    case 'ADD_MESSAGE': {
      const { branchId, message } = action.payload;
      return {
        ...state,
        branches: {
          ...state.branches,
          [branchId]: {
            ...state.branches[branchId],
            messages: [...state.branches[branchId].messages, message],
            title: state.branches[branchId].messages.length === 0 && message.role === 'user' 
              ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
              : state.branches[branchId].title
          }
        }
      };
    }
    case 'CREATE_BRANCH': {
      const { parentId, selectedText = null } = action.payload;
      const newBranchId = uuidv4();
      const parentMessages = state.branches[parentId].messages;
      
      // Determine the initial messages for the new branch
      let initialMessages = [];
      if (selectedText) {
        // If this branch is created from selected text, include that context
        initialMessages = [
          ...parentMessages,
          {
            id: uuidv4(),
            role: 'system',
            content: `The following conversation will expand on: "${selectedText}"`,
            createdAt: new Date().toISOString()
          }
        ];
      } else {
        // For a fork, include all messages from the parent
        initialMessages = [...parentMessages];
      }
      
      return {
        ...state,
        branches: {
          ...state.branches,
          [parentId]: {
            ...state.branches[parentId],
            children: [...state.branches[parentId].children, newBranchId]
          },
          [newBranchId]: {
            id: newBranchId,
            parentId,
            messages: initialMessages,
            children: [],
            title: selectedText 
              ? `On: "${selectedText.slice(0, 20)}${selectedText.length > 20 ? '...' : ''}"`
              : `Branch of ${state.branches[parentId].title}`,
            createdAt: new Date().toISOString(),
          }
        },
        branchOrder: [...state.branchOrder, newBranchId]
      };
    }
    case 'CREATE_NEW_CONVERSATION': {
      const newBranchId = uuidv4();
      return {
        ...state,
        branches: {
          ...state.branches,
          [newBranchId]: {
            id: newBranchId,
            parentId: null,
            messages: [],
            children: [],
            title: 'New Conversation',
            createdAt: new Date().toISOString(),
          }
        },
        branchOrder: [...state.branchOrder, newBranchId]
      };
    }
    case 'UPDATE_BRANCH_TITLE': {
      const { branchId, title } = action.payload;
      return {
        ...state,
        branches: {
          ...state.branches,
          [branchId]: {
            ...state.branches[branchId],
            title
          }
        }
      };
    }
    case 'DELETE_BRANCH': {
      const { branchId } = action.payload;
      
      // Recursively get all child branch IDs
      const getAllChildrenIds = (id, branches) => {
        const children = branches[id].children;
        if (children.length === 0) return [];
        return [
          ...children,
          ...children.flatMap(childId => getAllChildrenIds(childId, branches))
        ];
      };
      
      const childrenIds = getAllChildrenIds(branchId, state.branches);
      const allIdsToRemove = [branchId, ...childrenIds];
      
      // Remove from parent's children array
      const parentId = state.branches[branchId].parentId;
      const newBranches = { ...state.branches };
      
      if (parentId) {
        newBranches[parentId] = {
          ...newBranches[parentId],
          children: newBranches[parentId].children.filter(id => id !== branchId)
        };
      }
      
      // Remove all branches to delete
      allIdsToRemove.forEach(id => {
        delete newBranches[id];
      });
      
      return {
        ...state,
        branches: newBranches,
        branchOrder: state.branchOrder.filter(id => !allIdsToRemove.includes(id))
      };
    }
    default:
      return state;
  }
}

export function ConversationProvider({ children }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);
  
  // Initialize API keys from localStorage
  useEffect(() => {
    const anthropicKey = localStorage.getItem('apiKey_anthropic') || '';
    const openaiKey = localStorage.getItem('apiKey_openai') || '';
    
    if (anthropicKey) {
      dispatch({
        type: 'SET_API_KEY',
        payload: { provider: 'anthropic', apiKey: anthropicKey }
      });
    }
    
    if (openaiKey) {
      dispatch({
        type: 'SET_API_KEY',
        payload: { provider: 'openai', apiKey: openaiKey }
      });
    }
  }, []);
  
  const setActiveModel = useCallback((model) => {
    dispatch({
      type: 'SET_ACTIVE_MODEL',
      payload: { model }
    });
  }, []);
  
  const setActiveProvider = useCallback((provider) => {
    dispatch({
      type: 'SET_ACTIVE_PROVIDER',
      payload: { provider }
    });
  }, []);
  
  const setApiKey = useCallback((provider, apiKey) => {
    dispatch({
      type: 'SET_API_KEY',
      payload: { provider, apiKey }
    });
  }, []);
  
  const addMessage = useCallback((branchId, message) => {
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { branchId, message }
    });
  }, []);
  
  const createBranch = useCallback((parentId, selectedText = null) => {
    dispatch({
      type: 'CREATE_BRANCH',
      payload: { parentId, selectedText }
    });
    
    // Return the new branch ID
    return state.branchOrder[state.branchOrder.length - 1];
  }, [state.branchOrder]);
  
  const createNewConversation = useCallback(() => {
    dispatch({ type: 'CREATE_NEW_CONVERSATION' });
    
    // Return the new branch ID
    return state.branchOrder[state.branchOrder.length - 1];
  }, [state.branchOrder]);
  
  const updateBranchTitle = useCallback((branchId, title) => {
    dispatch({
      type: 'UPDATE_BRANCH_TITLE',
      payload: { branchId, title }
    });
  }, []);
  
  const deleteBranch = useCallback((branchId) => {
    dispatch({
      type: 'DELETE_BRANCH',
      payload: { branchId }
    });
  }, []);
  
  const getBranchMessages = useCallback((branchId) => {
    return state.branches[branchId]?.messages || [];
  }, [state.branches]);
  
  const getBranchContext = useCallback((branchId) => {
    return {
      branch: state.branches[branchId],
      parent: state.branches[branchId]?.parentId 
        ? state.branches[state.branches[branchId].parentId]
        : null
    };
  }, [state.branches]);
  
  const getAllBranches = useCallback(() => {
    return {
      branches: state.branches,
      order: state.branchOrder
    };
  }, [state.branches, state.branchOrder]);
  
  const getActiveModel = useCallback(() => {
    return state.activeModel;
  }, [state.activeModel]);
  
  const getActiveProvider = useCallback(() => {
    return state.activeProvider;
  }, [state.activeProvider]);
  
  const getApiKey = useCallback((provider) => {
    return state.apiKeys[provider] || '';
  }, [state.apiKeys]);
  
  return (
    <ConversationContext.Provider
      value={{
        addMessage,
        createBranch,
        createNewConversation,
        updateBranchTitle,
        deleteBranch,
        getBranchMessages,
        getBranchContext,
        getAllBranches,
        setActiveModel,
        getActiveModel,
        setActiveProvider,
        getActiveProvider,
        setApiKey,
        getApiKey
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export const useConversation = create(
  persist(
    (set, get) => ({
      // Initial state
      branches: {
        root: {
          id: 'root',
          title: 'New Conversation',
          parentId: null,
          children: [],
          messages: [],
          createdAt: new Date().toISOString()
        }
      },
      order: ['root'], // Keep track of branch order
      activeBranchId: 'root',
      activeModel: 'deepseek-r1:32b', // Default model
      activeProvider: 'ollama', // Default provider
      
      // Get all branches
      getAllBranches: () => {
        const state = get();
        return {
          branches: state.branches,
          order: state.order
        };
      },
      
      // Get messages for a specific branch
      getBranchMessages: (branchId) => {
        const state = get();
        const branch = state.branches[branchId];
        return branch ? branch.messages : [];
      },
      
      // Add message to a branch
      addMessage: (branchId, message) => {
        set((state) => {
          const branch = state.branches[branchId];
          if (!branch) return state;
          
          return {
            branches: {
              ...state.branches,
              [branchId]: {
                ...branch,
                messages: [...branch.messages, message]
              }
            }
          };
        });
      },
      
      // Update existing message content - new method for streaming
      updateMessageContent: (branchId, messageId, content) => {
        set((state) => {
          const branch = state.branches[branchId];
          if (!branch) return state;
          
          const updatedMessages = branch.messages.map(msg => 
            msg.id === messageId 
              ? { ...msg, content }
              : msg
          );
          
          return {
            branches: {
              ...state.branches,
              [branchId]: {
                ...branch,
                messages: updatedMessages
              }
            }
          };
        });
      },
      
      // Create a new branch from parent
      createBranch: (parentId, initialPrompt = null) => {
        const newBranchId = Date.now().toString();
        
        set((state) => {
          const parent = state.branches[parentId];
          if (!parent) return state; // Parent not found
          
          // Create initial messages if prompt is provided
          const initialMessages = initialPrompt
            ? [
                {
                  id: `${newBranchId}-init-1`,
                  role: 'user',
                  content: `Tell me more about: "${initialPrompt}"`,
                  createdAt: new Date().toISOString()
                }
              ]
            : [];
            
          // Create new branch
          const newBranch = {
            id: newBranchId,
            title: initialPrompt 
              ? `About: ${initialPrompt.substring(0, 30)}${initialPrompt.length > 30 ? '...' : ''}`
              : `Branch from ${parent.title}`,
            parentId,
            children: [],
            messages: initialMessages,
            createdAt: new Date().toISOString()
          };
          
          // Update parent's children
          const updatedParent = {
            ...parent,
            children: [...parent.children, newBranchId]
          };
          
          return {
            branches: {
              ...state.branches,
              [parentId]: updatedParent,
              [newBranchId]: newBranch
            },
            order: [...state.order, newBranchId]
          };
        });
        
        return newBranchId;
      },
      
      // Create a completely new conversation
      createNewConversation: () => {
        const newBranchId = Date.now().toString();
        
        set((state) => {
          // Create new branch
          const newBranch = {
            id: newBranchId,
            title: 'New Conversation',
            parentId: null, // No parent
            children: [],
            messages: [],
            createdAt: new Date().toISOString()
          };
          
          return {
            branches: {
              ...state.branches,
              [newBranchId]: newBranch
            },
            order: [...state.order, newBranchId],
            activeBranchId: newBranchId // Set as active
          };
        });
        
        return newBranchId;
      },
      
      // Update branch title
      updateBranchTitle: (branchId, newTitle) => {
        set((state) => {
          const branch = state.branches[branchId];
          if (!branch) return state;
          
          return {
            branches: {
              ...state.branches,
              [branchId]: {
                ...branch,
                title: newTitle
              }
            }
          };
        });
      },
      
      // Delete a branch and its children
      deleteBranch: (branchId) => {
        set((state) => {
          // Don't delete root
          if (branchId === 'root') return state;
          
          const branch = state.branches[branchId];
          if (!branch) return state;
          
          // Get all descendants to delete
          const getAllDescendants = (id, accumulator = []) => {
            const branch = state.branches[id];
            if (!branch) return accumulator;
            
            accumulator.push(id);
            branch.children.forEach(childId => {
              getAllDescendants(childId, accumulator);
            });
            
            return accumulator;
          };
          
          const branchesToDelete = getAllDescendants(branchId);
          
          // Get the parent to update its children list
          const parentId = branch.parentId;
          const parent = parentId ? state.branches[parentId] : null;
          
          // Create new branches object without deleted branches
          const newBranches = { ...state.branches };
          branchesToDelete.forEach(id => {
            delete newBranches[id];
          });
          
          // Update parent if exists
          if (parent) {
            newBranches[parentId] = {
              ...parent,
              children: parent.children.filter(id => id !== branchId)
            };
          }
          
          // Update order list
          const newOrder = state.order.filter(id => !branchesToDelete.includes(id));
          
          // If active branch is being deleted, set parent as active
          const newActiveBranchId = state.activeBranchId === branchId
            ? (parentId || 'root')
            : state.activeBranchId;
          
          return {
            branches: newBranches,
            order: newOrder,
            activeBranchId: newActiveBranchId
          };
        });
      },
      
      // Set active branch
      setActiveBranch: (branchId) => {
        set({ activeBranchId: branchId });
      },
      
      // Set active model
      setActiveModel: (model) => {
        set({ activeModel: model });
      },
      
      // Get active model
      getActiveModel: () => {
        return get().activeModel;
      },
      
      // Set active provider
      setActiveProvider: (provider) => {
        set({ activeProvider: provider });
      },
      
      // Get active provider
      getActiveProvider: () => {
        return get().activeProvider;
      }
    }),
    {
      name: 'conversation-storage', // localStorage key
    }
  )
);