// services/llmService.js
// This service connects to the multi-provider backend server

export async function sendMessage(messages, model, provider, onStreamingUpdate = null) {
  // If streaming callback is provided, use streaming mode
  const isStreaming = typeof onStreamingUpdate === 'function';
  
  try {
    // Get provider API key from local storage if needed
    const apiKey = (provider !== 'ollama') 
      ? localStorage.getItem(`${provider}_api_key`) || ''
      : '';

    if (isStreaming) {
      // Handle streaming case
      return streamMessageFromServer(messages, model, provider, apiKey, onStreamingUpdate);
    } else {
      // Handle non-streaming case (original implementation)
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages,
          model,
          provider,
          apiKey
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.response;
    }
  } catch (error) {
    console.error(`Error sending message to ${provider}:`, error);
    throw error;
  }
}

// Stream message from server using EventSource
async function streamMessageFromServer(messages, model, provider, apiKey, onStreamingUpdate) {
  return new Promise((resolve, reject) => {
    // Create a new EventSource for server-sent events (SSE)
    const eventSourceUrl = 'http://localhost:3001/api/chat';
    
    // Use fetch with the appropriate streaming headers
    fetch(eventSourceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model,
        provider,
        apiKey,
        stream: true
      })
    })
    .then(response => {
      if (!response.ok) {
        response.json().then(errorData => {
          reject(new Error(errorData.error || `HTTP error! status: ${response.status}`));
        }).catch(() => {
          reject(new Error(`HTTP error! status: ${response.status}`));
        });
        return;
      }
      
      // Handle the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      
      // Process the stream chunk by chunk
      function processStream() {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve(fullResponse);
            return;
          }
          
          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process each complete SSE event
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Keep the last incomplete chunk
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const dataStr = line.slice(6); // Remove "data: "
                
                if (dataStr === '[DONE]') {
                  continue; // Skip end marker
                }
                
                const data = JSON.parse(dataStr);
                
                // Handle different provider data formats
                let content = '';
                
                if (provider === 'ollama' && data.message?.content) {
                  // Ollama format
                  content = data.message.content;
                } else if (provider === 'anthropic' && data.type === 'content_block_delta' && data.delta?.text) {
                  // Anthropic format
                  content = data.delta.text;
                } else if (provider === 'openai' && data.choices?.[0]?.delta?.content) {
                  // OpenAI format
                  content = data.choices[0].delta.content;
                }
                
                if (content) {
                  fullResponse += content;
                  onStreamingUpdate(fullResponse);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
          
          // Continue reading
          processStream();
        }).catch(error => {
          console.error('Error reading stream:', error);
          reject(error);
        });
      }
      
      processStream();
    })
    .catch(error => {
      console.error('Error initiating stream:', error);
      reject(error);
    });
  });
}

export async function fetchAvailableModels(provider, apiKey = '') {
  try {
    // Get provider API key from local storage if not provided
    if (!apiKey && provider !== 'ollama') {
      apiKey = localStorage.getItem(`${provider}_api_key`) || '';
    }
    
    const url = new URL('http://localhost:3001/api/models');
    url.searchParams.append('provider', provider);
    if (apiKey) {
      url.searchParams.append('apiKey', apiKey);
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error(`Error fetching ${provider} models:`, error);
    return [];
  }
}