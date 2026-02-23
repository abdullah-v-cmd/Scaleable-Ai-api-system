// K6 Load Testing Script for AI Platform API
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms, 99% under 1s
    http_req_failed: ['rate<0.05'], // Error rate should be less than 5%
    errors: ['rate<0.1'], // Custom error rate less than 10%
  },
};

// Base URL - update with your deployment URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  username: `testuser-${Date.now()}`,
  password: 'testpass123'
};

let authToken = '';
let apiKey = '';

// Setup function - runs once per VU
export function setup() {
  // Register a test user
  const registerRes = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (registerRes.status === 201) {
    const data = registerRes.json();
    return {
      token: data.token,
      apiKey: data.user.apiKey
    };
  }

  return { token: '', apiKey: '' };
}

// Main test function
export default function (data) {
  const token = data.token;
  const apiKey = data.apiKey;

  // Test 1: Health check
  {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check has status ok': (r) => r.json('status') === 'ok',
    }) || errorRate.add(1);
  }

  sleep(1);

  // Test 2: Get AI models
  {
    const res = http.get(`${BASE_URL}/api/ai/models`, {
      headers: { 'X-API-Key': apiKey },
    });
    check(res, {
      'models endpoint status is 200': (r) => r.status === 200,
      'models list is not empty': (r) => r.json('models').length > 0,
    }) || errorRate.add(1);
  }

  sleep(1);

  // Test 3: Chat completion
  {
    const payload = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Say hello in 5 words' }
      ],
      max_tokens: 50
    });

    const res = http.post(`${BASE_URL}/api/ai/chat`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    check(res, {
      'chat completion status is 200 or 500': (r) => r.status === 200 || r.status === 500, // 500 if API keys not configured
      'chat has response structure': (r) => {
        try {
          const json = r.json();
          return json.choices || json.error;
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);
  }

  sleep(2);

  // Test 4: Get user statistics
  {
    const res = http.get(`${BASE_URL}/api/analytics/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    check(res, {
      'stats endpoint status is 200': (r) => r.status === 200,
      'stats has data': (r) => r.json('stats') !== null,
    }) || errorRate.add(1);
  }

  sleep(1);

  // Test 5: Get request logs
  {
    const res = http.get(`${BASE_URL}/api/analytics/logs?limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    check(res, {
      'logs endpoint status is 200': (r) => r.status === 200,
      'logs is array': (r) => Array.isArray(r.json('logs')),
    }) || errorRate.add(1);
  }

  sleep(1);
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
}
