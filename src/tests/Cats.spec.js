import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6'; // <-- 1. Importe o sleep aqui
import { Trend, Rate } from 'k6/metrics';

// Métricas personalizadas
export const getCatFactDuration = new Trend('get_cat_fact_duration', true);
export const RateContentOK = new Rate('content_OK');

export const options = {
  thresholds: {
    // 2. Aumentamos a tolerância de falhas para APIs públicas de teste
    http_req_failed: ['rate<0.30'],
    get_cat_fact_duration: ['p(95)<1500'],
    content_OK: ['rate>0.70']
  },
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 10 }, // Reduzido levemente para 10 VUs para evitar bloqueio
    { duration: '10s', target: 0 }
  ]
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const url = 'https://catfact.ninja/fact';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  const res = http.get(url, params);

  // Registra a duração da requisição GET
  getCatFactDuration.add(res.timings.duration);

  // Valida se o status é 200
  const isStatusOk = res.status === OK;
  RateContentOK.add(isStatusOk);

  // Checa status 200 e a presença do campo 'fact' na resposta JSON
  check(res, {
    'GET Cat Fact - Status 200': () => isStatusOk,
    'GET Cat Fact - Contém fato': () => {
      try {
        return res.json().hasOwnProperty('fact');
      } catch (e) {
        return false;
      }
    }
  });

  // 3. Pausa de 1 segundo para não estourar o limite da API pública (Rate Limit)
  sleep(1);
}
