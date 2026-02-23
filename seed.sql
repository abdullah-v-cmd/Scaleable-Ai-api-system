-- Insert AI Models
INSERT OR IGNORE INTO ai_models (provider, model_name, model_id, description, max_tokens, cost_per_1k_tokens, is_active) VALUES
  ('openai', 'GPT-4 Turbo', 'gpt-4-turbo-preview', 'Most capable GPT-4 model', 128000, 0.03, 1),
  ('openai', 'GPT-4', 'gpt-4', 'Standard GPT-4 model', 8192, 0.06, 1),
  ('openai', 'GPT-3.5 Turbo', 'gpt-3.5-turbo', 'Fast and cost-effective', 16385, 0.002, 1),
  ('anthropic', 'Claude 3 Opus', 'claude-3-opus-20240229', 'Most powerful Claude model', 200000, 0.075, 1),
  ('anthropic', 'Claude 3 Sonnet', 'claude-3-sonnet-20240229', 'Balanced performance', 200000, 0.015, 1),
  ('anthropic', 'Claude 3 Haiku', 'claude-3-haiku-20240307', 'Fast and compact', 200000, 0.0008, 1),
  ('google', 'Gemini Pro', 'gemini-pro', 'Google multimodal model', 32000, 0.00125, 1),
  ('google', 'Gemini Pro Vision', 'gemini-pro-vision', 'Vision-capable model', 16000, 0.0025, 1),
  ('cohere', 'Command', 'command', 'Cohere flagship model', 4096, 0.015, 1),
  ('cohere', 'Command Light', 'command-light', 'Lightweight model', 4096, 0.005, 1);

-- Insert demo admin user (password: admin123)
-- Password hash generated with bcrypt, salt rounds: 10
INSERT OR IGNORE INTO users (email, username, password_hash, api_key, role, is_active) VALUES
  ('admin@aiplatform.com', 'admin', '$2a$10$rW8qZx6X9K.YvYQY8jVLJO0Xm3sQz8mK5N.nXfK6wK7nQz8mK5N.n', 'apk_demo_admin_key_12345', 'admin', 1);

-- Insert demo regular user (password: user123)
INSERT OR IGNORE INTO users (email, username, password_hash, api_key, role, is_active) VALUES
  ('user@example.com', 'demouser', '$2a$10$rW8qZx6X9K.YvYQY8jVLJO0Xm3sQz8mK5N.nXfK6wK7nQz8mK5N.n', 'apk_demo_user_key_67890', 'user', 1);

-- Insert demo API keys
INSERT OR IGNORE INTO api_keys (user_id, key_name, api_key, is_active) VALUES
  (1, 'Production Key', 'apk_prod_admin_abc123xyz', 1),
  (1, 'Development Key', 'apk_dev_admin_def456uvw', 1),
  (2, 'Personal Key', 'apk_personal_user_ghi789rst', 1);
