# 🕸️ Graph Visualization Application

[![CI/CD Pipeline](https://github.com/loboav/praks/actions/workflows/ci.yml/badge.svg)](https://github.com/loboav/praks/actions)
[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)

**Graph Visualization Application** — это мощный инструмент для визуализации, анализа и расследования связей в графовых данных. Предназначен для аналитиков, следователей и исследователей данных.

---

## ✨ Ключевые возможности

### 📊 Визуализация графов
- **Интерактивный граф** на базе ReactFlow
- **Лейауты**: Force-directed, Hierarchical, Radial, Grid, Tree
- **Drag & Drop** узлов с сохранением позиций
- **Стилизация**: цвета, иконки (emoji), подписи

### 🗺️ Гео-режим (NEW!)
- Отображение узлов с координатами на карте **OpenStreetMap**
- Линии связей между точками
- Автоматическое центрирование и масштабирование

### 🔍 Алгоритмы поиска путей
| Алгоритм | Описание |
|----------|----------|
| **Dijkstra** | Кратчайший взвешенный путь |
| **A*** | Кратчайший путь с эвристикой |
| **BFS** | Поиск в ширину (невзвешенный) |
| **K-Shortest Paths** | K кратчайших путей (Yen's algorithm) |
| **All Paths** | Все возможные пути (DFS) |

### 📈 Аналитика
- **Degree Centrality** — самые связанные узлы
- **Betweenness Centrality** — узлы-посредники
- **Clustering** — коэффициент кластеризации
- **Connected Components** — компоненты связности

### ⏱️ Timeline-фильтрация
- Временная шкала событий
- Фильтр "от-до" по датам
- Гистограмма активности

### 📤 Экспорт
- **Изображения**: PNG, JPEG, SVG, PDF
- **Данные**: JSON (полный граф)

---

## � Быстрый старт

### Требования
- [Docker](https://www.docker.com/) и Docker Compose

### Запуск

```bash
# Клонировать репозиторий
git clone https://github.com/loboav/praks.git
cd praks/graph-visualization-app

# Запустить все сервисы
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f
```

### Доступ
| Сервис | URL |
|--------|-----|
| **Фронтенд** | http://localhost:3000 |
| **API** | http://localhost:5000/api |
| **PostgreSQL** | localhost:5432 |

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  React 18 + TypeScript + ReactFlow + Leaflet                │
│                    http://localhost:3000                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/JSON
┌─────────────────────────▼───────────────────────────────────┐
│                         Backend                              │
│  .NET 8 + Entity Framework Core + REST API                  │
│                    http://localhost:5000                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ SQL
┌─────────────────────────▼───────────────────────────────────┐
│                       PostgreSQL 16                          │
│                    localhost:5432                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Структура проекта

```
praks/
├── .github/
│   └── workflows/        # CI/CD (tests, lint, security)
├── graph-visualization-app/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── Controllers/    # REST API endpoints
│   │   │   ├── Services/       # Business logic
│   │   │   ├── Models/         # Entity models
│   │   │   └── Data/           # DbContext, Seeder
│   │   └── tests/              # Unit & Integration tests
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── services/       # API client
│   │   │   └── types/          # TypeScript types
│   │   └── public/
│   ├── db/                     # SQL init scripts
│   └── docker-compose.yml
└── README.md
```

---

## 🛠️ Технологический стек

### Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| .NET | 8.0 | Фреймворк |
| Entity Framework Core | 8.x | ORM |
| PostgreSQL | 16 | База данных |
| xUnit | 2.x | Тестирование |

### Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 18.3 | UI фреймворк |
| TypeScript | 4.9 | Типизация |
| ReactFlow | 11.x | Визуализация графа |
| React-Leaflet | 4.2 | Гео-карты |
| Vite | 5.x | Сборка |

### DevOps
| Инструмент | Назначение |
|------------|------------|
| Docker | Контейнеризация |
| GitHub Actions | CI/CD |
| ESLint + Prettier | Линтинг |

---

## � API Reference

### Объекты (Nodes)
```
GET    /api/graph/objects          # Список объектов
POST   /api/graph/objects          # Создать объект
PUT    /api/graph/objects/{id}     # Обновить объект
DELETE /api/graph/objects/{id}     # Удалить объект
```

### Связи (Edges)
```
GET    /api/graph/relations        # Список связей
POST   /api/graph/relations        # Создать связь
DELETE /api/graph/relations/{id}   # Удалить связь
```

### Аналитика
```
GET    /api/analytics/degree-centrality
GET    /api/analytics/betweenness-centrality
GET    /api/analytics/clustering-coefficient
GET    /api/analytics/connected-components
```

### Поиск путей
```
POST   /api/pathfinding/dijkstra
POST   /api/pathfinding/astar
POST   /api/pathfinding/bfs
POST   /api/pathfinding/k-shortest
POST   /api/pathfinding/all-paths
```

---

## 🧪 Тестирование

```bash
# Backend тесты
cd graph-visualization-app/backend
dotnet test

# Frontend тесты
cd graph-visualization-app/frontend
npm test
```

---

## 🔧 Разработка

### Локальный запуск (без Docker)

**Backend:**
```bash
cd graph-visualization-app/backend/src
dotnet run
```

**Frontend:**
```bash
cd graph-visualization-app/frontend
npm install
npm run dev
```

### Переменные окружения

| Переменная | Описание | Default |
|------------|----------|---------|
| `POSTGRES_HOST` | Хост БД | `db` |
| `POSTGRES_DB` | Имя БД | `graphdb` |
| `POSTGRES_USER` | Пользователь | `postgres` |
| `POSTGRES_PASSWORD` | Пароль | `postgres` |
| `Seeding__Mode` | Режим сидирования | `investigation` |

---

## 🤝 Contributing

1. Fork репозитория
2. Создать feature branch: `git checkout -b feature/amazing-feature`
3. Commit изменений: `git commit -m 'Add amazing feature'`
4. Push в branch: `git push origin feature/amazing-feature`
5. Открыть Pull Request

---

## �📝 Лицензия

MIT License — см. [LICENSE](LICENSE)

---

## 👤 Автор

**loboav** — [GitHub](https://github.com/loboav)
