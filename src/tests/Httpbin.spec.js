import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
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
  const payload = {
    test: 'k6-httpbin',
    method: 'POST',
    timestamp: new Date().toISOString()
  };
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-k6-test': 'httpbin'
    },
    timeout: '10s'
  };

  const postResponse = http.post(
    `${baseUrl}/post`,
    JSON.stringify(payload),
    params
  );
  postDuration.add(postResponse.timings.duration);
  check(postResponse, {
    'POST /post returns 200': response => response.status === 200,
    'POST /post echoes JSON payload': response => {
      try {
        return response.json().json.test === payload.test;
      } catch (error) {
        return false;
      }
    },
    'POST /post echoes custom header': response => {
      try {
        return response.json().headers['X-K6-Test'] === 'httpbin';
      } catch (error) {
        return false;
      }
    }
  });

  const putPayload = { test: 'k6-httpbin', method: 'PUT' };
  const putResponse = http.put(
    `${baseUrl}/put`,
    JSON.stringify(putPayload),
    params
  );
  putDuration.add(putResponse.timings.duration);
  check(putResponse, {
    'PUT /put returns 200': response => response.status === 200,
    'PUT /put echoes JSON payload': response => {
      try {
        return response.json().json.method === putPayload.method;
      } catch (error) {
        return false;
      }
    },
    'PUT /put echoes custom header': response => {
      try {
        return response.json().headers['X-K6-Test'] === 'httpbin';
      } catch (error) {
        return false;
      }
    }
  });

  const delayResponse = http.get(`${baseUrl}/delay/2`, { timeout: '10s' });
  delayDuration.add(delayResponse.timings.duration);
  check(delayResponse, {
    'GET /delay/2 returns 200': response => response.status === 200,
    'GET /delay/2 takes at least 1.8 seconds': response =>
      response.timings.duration >= 1800
  });
}
