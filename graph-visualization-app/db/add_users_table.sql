-- Миграция: Добавление таблицы пользователей и системы ролей
-- Дата: 2025-11-15

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Viewer', 'Editor', 'Admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индекса для быстрого поиска по username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Вставка дефолтного администратора
-- Пароль: admin123
-- Hash сгенерирован через BCrypt с work factor 11
INSERT INTO users (username, password_hash, role) 
VALUES ('admin', '$2a$11$XGqVZKqJ8mZ8p0rFJGz5d.9nLJbK7xN5Wy5FZ7R8wY3HqK6nQ8.zC', 'Admin')
ON CONFLICT (username) DO NOTHING;

-- Комментарии для документации
COMMENT ON TABLE users IS 'Таблица пользователей системы с ролевым доступом';
COMMENT ON COLUMN users.role IS 'Роли: Viewer (просмотр), Editor (редактирование), Admin (полный доступ)';
