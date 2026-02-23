# Load Testing Guide

## Prerequisites

Install k6:
- macOS: `brew install k6`
- Linux: `wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz`
- Windows: `choco install k6`

Or use Docker:
```bash
docker pull grafana/k6
```

## Running Tests

### Local Development
```bash
# Basic test
k6 run loadtest/script.js

# Test against specific URL
k6 run --env BASE_URL=http://localhost:3000 loadtest/script.js

# With custom duration and VUs
k6 run --vus 50 --duration 30s loadtest/script.js
```

### Docker
```bash
docker run --rm -i -v $(pwd)/loadtest:/scripts grafana/k6 run /scripts/script.js
```

### Production Testing
```bash
k6 run --env BASE_URL=https://your-domain.pages.dev loadtest/script.js
```

## Test Scenarios

The script includes the following test scenarios:

1. **Health Check** - Validates API availability
2. **Get AI Models** - Tests model listing endpoint
3. **Chat Completion** - Tests AI inference endpoint
4. **User Statistics** - Tests analytics endpoints
5. **Request Logs** - Tests logging system

## Performance Thresholds

- **95th percentile** response time < 500ms
- **99th percentile** response time < 1000ms
- **Error rate** < 5%

## Load Stages

1. Ramp up to 10 users (30s)
2. Ramp up to 50 users (1m)
3. Stay at 50 users (2m)
4. Spike to 100 users (30s)
5. Stay at 100 users (1m)
6. Ramp down (30s)

## Results Interpretation

- **http_req_duration**: Response time metrics
- **http_req_failed**: Request failure rate
- **errors**: Custom error rate
- **checks**: Pass/fail rate for assertions

## Export Results

### JSON Output
```bash
k6 run --out json=results.json loadtest/script.js
```

### InfluxDB
```bash
k6 run --out influxdb=http://localhost:8086/k6 loadtest/script.js
```

### Cloud Results
```bash
k6 cloud login
k6 cloud loadtest/script.js
```

## Best Practices

- Start with low load and gradually increase
- Test against non-production environments first
- Monitor server resources during tests
- Run tests from multiple geographic locations
- Analyze bottlenecks and optimize accordingly
