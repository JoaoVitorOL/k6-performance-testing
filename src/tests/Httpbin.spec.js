import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Trend } from 'k6/metrics';

const baseUrl = 'https://httpbin.org';
const postDuration = new Trend('httpbin_post_duration', true);
const putDuration = new Trend('httpbin_put_duration', true);
const delayDuration = new Trend('httpbin_delay_duration', true);

// GitHub Actions runners do not support IPv6 routing (network unreachable).
// Local machines behind CGNAT IPv4 need preferIPv6 to avoid shared IP rate-limiting.
const isCI = __ENV.CI === 'true' || __ENV.GITHUB_ACTIONS === 'true';
const dnsPolicy = __ENV.K6_DNS_POLICY || (isCI ? 'preferIPv4' : 'preferIPv6');

export const options = {
  vus: 7,
  dns: {
    policy: dnsPolicy
  },
  thresholds: {
    checks: ['rate>0.80'],
    http_req_failed: ['rate<0.25'],
    http_req_duration: ['p(90)<6800']
  },
  stages: [
    { duration: '1m', target: 46 },
    { duration: '1m30s', target: 92 },
    { duration: '1m', target: 0 }
  ]
};

export function handleSummary(data) {
  return {
    './src/output/httpbin.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

function sendRequest(method, url, body, params, maxRetries = 2) {
  let res;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (method === 'POST') {
      res = http.post(url, body, params);
    } else if (method === 'PUT') {
      res = http.put(url, body, params);
    } else {
      res = http.get(url, params);
    }

    // Success or client error other than 429
    if (res.status !== 429 && res.status < 500) {
      return res;
    }

    if (attempt < maxRetries) {
      sleep(1.5 + Math.random());
    }
  }

  return res;
}

export default function () {
  // If this VU already performed its request, idle quietly without generating traffic
  if (__ITER > 0) {
    sleep(5);
    return;
  }

  // Schedule each VU across dedicated 2.0s time slots to avoid bursts
  // (92 VUs spaced across ~185s strictly maintains ~0.5 req/s below httpbin.org rate limit)
  const slotIntervalMs = 2000;
  const targetTimeMs = __VU * slotIntervalMs;
  const currentElapsedMs = exec.instance.currentTestRunDuration;
  const waitMs = targetTimeMs - currentElapsedMs;

  if (waitMs > 0) {
    sleep(waitMs / 1000);
  }

  const endpoint = __VU % 3;
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-k6-test': 'httpbin'
    },
    timeout: '10s'
  };

  if (endpoint === 0) {
    const payload = {
      test: 'k6-httpbin',
      method: 'POST',
      timestamp: new Date().toISOString()
    };
    const response = sendRequest(
      'POST',
      `${baseUrl}/post`,
      JSON.stringify(payload),
      params
    );
    postDuration.add(response.timings.duration);
    check(response, {
      'POST /post returns 200': res => res.status === 200,
      'POST /post echoes JSON payload': res => {
        try {
          return res.json().json.test === payload.test;
        } catch (_) {
          return false;
        }
      },
      'POST /post echoes custom header': res => {
        try {
          return res.json().headers['X-K6-Test'] === 'httpbin';
        } catch (_) {
          return false;
        }
      }
    });
  } else if (endpoint === 1) {
    const payload = { test: 'k6-httpbin', method: 'PUT' };
    const response = sendRequest(
      'PUT',
      `${baseUrl}/put`,
      JSON.stringify(payload),
      params
    );
    putDuration.add(response.timings.duration);
    check(response, {
      'PUT /put returns 200': res => res.status === 200,
      'PUT /put echoes JSON payload': res => {
        try {
          return res.json().json.method === payload.method;
        } catch (_) {
          return false;
        }
      },
      'PUT /put echoes custom header': res => {
        try {
          return res.json().headers['X-K6-Test'] === 'httpbin';
        } catch (_) {
          return false;
        }
      }
    });
  } else {
    const response = sendRequest('GET', `${baseUrl}/delay/2`, null, {
      timeout: '10s'
    });
    delayDuration.add(response.timings.duration);
    check(response, {
      'GET /delay/2 returns 200': res => res.status === 200,
      'GET /delay/2 takes at least 1.8 seconds': res =>
        res.timings.duration >= 1800
    });
  }

  // Brief pause so iteration completes cleanly
  sleep(1);
}
