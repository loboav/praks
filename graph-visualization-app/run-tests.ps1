# Скрипт для запуска тестов Graph Visualization App
# Использование: .\run-tests.ps1 [unit|integration|all|coverage]

param(
    [Parameter(Position=0)]
    [ValidateSet("unit", "integration", "all", "coverage", "watch")]
    [string]$TestType = "all"
)

$ErrorActionPreference = "Stop"
$TestProject = "backend\tests\GraphVisualizationApp.Tests"

Write-Host "🧪 Graph Visualization App - Test Runner" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка Docker для интеграционных тестов
function Test-DockerRunning {
    try {
        docker ps | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Переход в директорию тестов
if (-not (Test-Path $TestProject)) {
    Write-Host "❌ Тестовый проект не найден: $TestProject" -ForegroundColor Red
    exit 1
}

Set-Location $TestProject

switch ($TestType) {
    "unit" {
        Write-Host "🏃 Запуск UNIT тестов (быстрые, без Docker)..." -ForegroundColor Green
        Write-Host ""
        dotnet test --filter "FullyQualifiedName!~Integration" --logger "console;verbosity=normal"
    }
    
    "integration" {
        if (-not (Test-DockerRunning)) {
            Write-Host "❌ Docker не запущен! Запустите Docker Desktop." -ForegroundColor Red
            Write-Host "   Проверка: docker ps" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "🐳 Запуск INTEGRATION тестов (с Docker PostgreSQL)..." -ForegroundColor Green
        Write-Host "   Это может занять 10-30 секунд..." -ForegroundColor Yellow
        Write-Host ""
        dotnet test --filter "FullyQualifiedName~Integration" --logger "console;verbosity=normal"
    }
    
    "all" {
        Write-Host "🚀 Запуск ВСЕХ тестов..." -ForegroundColor Green
        Write-Host ""
        
        # Сначала unit-тесты
        Write-Host "1️⃣ Unit тесты..." -ForegroundColor Cyan
        dotnet test --filter "FullyQualifiedName!~Integration" --logger "console;verbosity=minimal"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Unit тесты провалились!" -ForegroundColor Red
            exit 1
        }
        
        # Затем интеграционные
        if (Test-DockerRunning) {
            Write-Host ""
            Write-Host "2️⃣ Integration тесты..." -ForegroundColor Cyan
            dotnet test --filter "FullyQualifiedName~Integration" --logger "console;verbosity=minimal"
        }
        else {
            Write-Host ""
            Write-Host "⚠️  Docker не запущен - пропускаем интеграционные тесты" -ForegroundColor Yellow
        }
    }
    
    "coverage" {
        Write-Host "📊 Запуск тестов с покрытием кода..." -ForegroundColor Green
        Write-Host ""
        
        dotnet test `
            /p:CollectCoverage=true `
            /p:CoverletOutputFormat=opencover `
            /p:CoverletOutput=./TestResults/ `
            --logger "console;verbosity=normal"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Отчёт о покрытии сохранён в: TestResults/" -ForegroundColor Green
        }
    }
    
    "watch" {
        Write-Host "👀 Режим наблюдения (watch mode)..." -ForegroundColor Green
        Write-Host "   Тесты будут перезапускаться при изменении файлов" -ForegroundColor Yellow
        Write-Host "   Нажмите Ctrl+C для выхода" -ForegroundColor Yellow
        Write-Host ""
        
        dotnet watch test --filter "FullyQualifiedName!~Integration"
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Все тесты пройдены успешно!" -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "❌ Некоторые тесты провалились" -ForegroundColor Red
    exit 1
}
