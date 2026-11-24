import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const baseUrl = 'https://httpbin.org';
const postDuration = new Trend('httpbin_post_duration', true);
const putDuration = new Trend('httpbin_put_duration', true);
const delayDuration = new Trend('httpbin_delay_duration', true);

export const options = {
  vus: 7,
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

export default function () {
  // Spread each VU's requests to stay below httpbin.org's 2 req/s per-IP limit.
  sleep(__VU * 0.75);
  const endpoint = (__VU + __ITER) % 3;
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
    const response = http.post(
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
        } catch (error) {
          return false;
        }
      },
      'POST /post echoes custom header': res => {
        try {
          return res.json().headers['X-K6-Test'] === 'httpbin';
        } catch (error) {
          return false;
        }
      }
    });
  } else if (endpoint === 1) {
    const payload = { test: 'k6-httpbin', method: 'PUT' };
    const response = http.put(
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
        } catch (error) {
          return false;
        }
      },
      'PUT /put echoes custom header': res => {
        try {
          return res.json().headers['X-K6-Test'] === 'httpbin';
        } catch (error) {
          return false;
        }
      }
    });
  } else {
    const response = http.get(`${baseUrl}/delay/2`, { timeout: '10s' });
    delayDuration.add(response.timings.duration);
    check(response, {
      'GET /delay/2 returns 200': res => res.status === 200,
      'GET /delay/2 takes at least 1.8 seconds': res =>
        res.timings.duration >= 1800
    });
  }

  // Keep the request rate within the public httpbin.org limit.
  sleep(30);
}
