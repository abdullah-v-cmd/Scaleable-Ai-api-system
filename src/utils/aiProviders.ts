// AI service integrations for multiple providers

import type { AIRequest, AIResponse } from '../types';

/**
 * OpenAI API integration
 */
export async function callOpenAI(request: AIRequest, apiKey: string): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.max_tokens || 1000,
      stream: request.stream || false
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

/**
 * Anthropic Claude API integration
 */
export async function callAnthropic(request: AIRequest, apiKey: string): Promise<AIResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages.filter(m => m.role !== 'system'),
      system: request.messages.find(m => m.role === 'system')?.content,
      max_tokens: request.max_tokens || 1000,
      temperature: request.temperature || 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  // Convert Anthropic response to OpenAI format
  return {
    id: data.id,
    model: data.model,
    choices: [{
      message: {
        role: 'assistant',
        content: data.content[0].text
      },
      finish_reason: data.stop_reason
    }],
    usage: {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens
    }
  };
}

/**
 * Google Gemini API integration
 */
export async function callGemini(request: AIRequest, apiKey: string): Promise<AIResponse> {
  const model = request.model.replace('gemini-', '');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: request.messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.max_tokens || 1000
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  // Convert Gemini response to OpenAI format
  return {
    id: `gemini-${Date.now()}`,
    model: request.model,
    choices: [{
      message: {
        role: 'assistant',
        content: data.candidates[0].content.parts[0].text
      },
      finish_reason: data.candidates[0].finishReason
    }],
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata?.totalTokenCount || 0
    }
  };
}

/**
 * Cohere API integration
 */
export async function callCohere(request: AIRequest, apiKey: string): Promise<AIResponse> {
  const response = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: request.model,
      message: request.messages[request.messages.length - 1].content,
      chat_history: request.messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: m.content
      })),
      temperature: request.temperature || 0.7,
      max_tokens: request.max_tokens || 1000
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Cohere API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  // Convert Cohere response to OpenAI format
  return {
    id: data.generation_id,
    model: request.model,
    choices: [{
      message: {
        role: 'assistant',
        content: data.text
      },
      finish_reason: data.finish_reason
    }],
    usage: {
      prompt_tokens: data.meta?.tokens?.input_tokens || 0,
      completion_tokens: data.meta?.tokens?.output_tokens || 0,
      total_tokens: (data.meta?.tokens?.input_tokens || 0) + (data.meta?.tokens?.output_tokens || 0)
    }
  };
}

/**
 * Route request to appropriate AI provider
 */
export async function routeAIRequest(request: AIRequest, env: any): Promise<AIResponse> {
  const model = request.model.toLowerCase();
  
  if (model.includes('gpt')) {
    const apiKey = env.OPENAI_API_KEY || 'your-openai-api-key';
    return await callOpenAI(request, apiKey);
  } else if (model.includes('claude')) {
    const apiKey = env.ANTHROPIC_API_KEY || 'your-anthropic-api-key';
    return await callAnthropic(request, apiKey);
  } else if (model.includes('gemini')) {
    const apiKey = env.GOOGLE_API_KEY || 'your-google-api-key';
    return await callGemini(request, apiKey);
  } else if (model.includes('command')) {
    const apiKey = env.COHERE_API_KEY || 'your-cohere-api-key';
    return await callCohere(request, apiKey);
  } else {
    throw new Error(`Unsupported model: ${request.model}`);
  }
}
