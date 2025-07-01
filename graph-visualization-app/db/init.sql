# Удалите или закомментируйте строку с init.sql в docker-compose.yml, чтобы Postgres не завершал работу сразу после старта.
# Это решит проблему с "db" контейнером, который сразу выключается.

# Пример:
#    volumes:
#      # - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
