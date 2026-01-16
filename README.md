# FitDreams Platform

## Visão Geral

O **FitDreams Platform** é uma plataforma mobile voltada para saúde e bem-estar, criada para acompanhar a evolução física dos usuários ao longo do tempo. O projeto reúne aplicativo mobile, backend próprio e integrações inteligentes, permitindo o registro e a visualização de métricas corporais, exames e dados de bioimpedância de forma centralizada.

A proposta do FitDreams é facilitar o acompanhamento da saúde por meio de dados organizados, visualizações claras e uma experiência simples de uso.

---

## Funcionalidades

* Registro e histórico de medidas corporais
* Acompanhamento de peso e métricas físicas
* Gráficos de evolução por período
* Integração com balança de bioimpedância via Bluetooth
* Upload e análise de exames laboratoriais
* Registro alimentar
* Autenticação e controle de acesso
* API dedicada para comunicação entre app e servidor

---

## Estrutura do Projeto

O repositório é organizado em um **monorepo**, separado em frontend e backend:

```
fitdreams-platform/
├── backend/   # API, banco de dados e serviços
└── frontend/  # Aplicação mobile
```

### Backend

* API REST desenvolvida em Node.js
* Estrutura baseada em controllers, routes, models e services
* Banco de dados SQLite para ambiente de desenvolvimento
* Upload e processamento de arquivos
* Integração com serviços externos

### Frontend

* Aplicação mobile desenvolvida em React Native com Expo
* Navegação por telas e contextos
* Componentes reutilizáveis
* Gráficos para visualização de evolução corporal
* Comunicação com dispositivos Bluetooth

---

## Tecnologias Utilizadas

**Frontend**

* React Native
* Expo
* JavaScript / TypeScript
* Victory Native
* Bluetooth (BLE)

**Backend**

* Node.js
* Express
* SQLite
* Multer

**Outros**

* Git e GitHub
* Arquitetura REST

---

## Executando o Projeto Localmente

### Pré-requisitos

* Node.js
* Git
* Expo CLI

### Clonar o repositório

```bash
git clone https://github.com/Gm4rtins-ha/fitdreams-platform.git
cd fitdreams-platform
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npx expo start
```

---

## Status do Projeto

Projeto em desenvolvimento, com funcionalidades sendo adicionadas e refinadas continuamente.

---

## Autor

Guilherme Martins

GitHub: [https://github.com/Gm4rtins-ha](https://github.com/Gm4rtins-ha)
LinkedIn: Guilherme Martins

---

## Licença

Uso privado no momento. A licença poderá ser definida futuramente.
