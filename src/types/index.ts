// Type definitions for the AI Platform

export type Bindings = {
  DB: D1Database;
};

export type User = {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  api_key: string;
  role: 'user' | 'admin';
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type ApiKey = {
  id: number;
  user_id: number;
  key_name: string;
  api_key: string;
  is_active: number;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
};

export type RequestLog = {
  id: number;
  user_id: number | null;
  api_key_id: number | null;
  endpoint: string;
  method: string;
  model_provider: string | null;
  model_name: string | null;
  status_code: number;
  request_size: number;
  response_size: number;
  latency_ms: number;
  error_message: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AIModel = {
  id: number;
  provider: string;
  model_name: string;
  model_id: string;
  description: string | null;
  max_tokens: number | null;
  cost_per_1k_tokens: number | null;
  is_active: number;
  created_at: string;
};

export type RateLimit = {
  id: number;
  user_id: number;
  endpoint: string;
  request_count: number;
  window_start: string;
  window_end: string;
};

export type JWTPayload = {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

export type AIRequest = {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
};

export type AIResponse = {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type Variables = {
  user?: User;
  apiKey?: ApiKey;
};
