
 Httpbin.org (A melhor opção para Teste de Carga Puro)Se o seu objetivo principal com o k6 não é testar regras de negócio de um banco de dados fictício, mas sim estressar a capacidade de processamento de requisições HTTP (testar rede, serialização JSON, headers e tempos de resposta sob carga pesada), o httpbin é a ferramenta definitiva. Ele ecoa de volta exatamente o que você envia.   Métodos suportados: GET, POST, PUT, PATCH, DELETE, etc.   Autenticação: NenhumaEndpoints úteis para k6:Enviar dados e testar POST (POST): [https://httpbin.org/post](https://httpbin.org/post)Enviar dados e testar PUT (PUT): [https://httpbin.org/put](https://httpbin.org/put)Simular atraso de resposta (ideal para testar timeouts no k6): [https://httpbin.org/delay/2](https://httpbin.org/delay/2)

 
# Grafana K6 Performance Testing

## GitHub Actions + SonarCloud

[![K6 Performance Testing](https://github.com/ugioni/k6-performance-testing/actions/workflows/node.js.yml/badge.svg)](https://github.com/ugioni/k6-performance-testing/actions/workflows/node.js.yml)

</br>

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=ugioni_playwright-e2e&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=ugioni_playwright-e2e)

## Getting Started

In order to execute this project you must follow the steps below:

1. Install [Node JS](https://nodejs.org/) (version >= 22.x)
1. Install [Grafana K6](https://dl.k6.io/msi/k6-latest-amd64.msi)
1. Run `npm i --save-dev` to install all the project dependencies
1. Run `npm run ci` to execute the entire test suite

All execution reports can be found in `src/output`.