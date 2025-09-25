# Graph Visualization Application
# Graph Visualization Application — руководство (RU)

Это клиент-серверное приложение для визуализации и работы с ориентированными графами. Бэкенд написан на .NET, база данных — PostgreSQL, фронтенд — React + TypeScript. Репозиторий подготовлен для работы через Docker.

Ключевые возможности:
- CRUD для типов объектов и типов связей
- Создание/удаление/правка объектов и связей
- Свойства объектов и связей (ключ-значение)
- Поиск путей (включая алгоритм Дейкстры)
- Сохранение положения узлов (layout)

Структура проекта (корень):

```
graph-visualization-app
├── backend    # .NET приложение
├── frontend   # React / TypeScript
├── db         # SQL-скрипты для инициализации БД
├── docker-compose.yml
└── README.md
```

Важно: все шаги сборки выполняются внутри Docker-образов (frontend собирается в node-стейдже, backend — через dotnet publish в SDK-стейдже). Значит, локально вам НЕ нужны `node_modules` или `dotnet publish` — достаточно Docker.

Быстрый старт (Docker-only, PowerShell):

```powershell
# Построить образы (без использования кэша, чтобы гарантировать свежую сборку)
docker-compose build --no-cache

# Запустить сервисы в фоне
docker-compose up -d

# Просмотреть логи (в реальном времени)
docker-compose logs -f
```

Проверка доступности:
- Фронтенд: http://localhost:3000
- API: http://localhost:5000/api

Очистка локальных артефактов (рекомендации)
- В репозитории не должно быть сгенерированных файлов (`obj/`, `bin/`, `frontend/build`, `node_modules`, `.vs`). Если такие файлы попали в git, их стоит убрать из индекса и добавить в `.gitignore`.

Пример безопасных команд (не удаляют локальные файлы, только убирают их из индекса):

```powershell
git rm -r --cached .vs || Write-Host "no .vs tracked"
git rm -r --cached **/obj || Write-Host "no obj tracked"
git rm -r --cached **/bin || Write-Host "no bin tracked"
git rm -r --cached frontend/build || Write-Host "no frontend/build tracked"
git add .gitignore
git commit -m "Remove generated local build artifacts and use Docker-only workflow"
git push
```
