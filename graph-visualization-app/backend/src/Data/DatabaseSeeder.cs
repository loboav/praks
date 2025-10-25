using Microsoft.EntityFrameworkCore;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Data
{
    /// <summary>
    /// Класс для заполнения базы данных начальными данными (seed data)
    /// </summary>
    public static class DatabaseSeeder
    {
        /// <summary>
        /// Заполнить БД данными в зависимости от окружения
        /// </summary>
        public static async Task SeedAsync(GraphDbContext context, IConfiguration configuration)
        {
            // Проверяем, нужно ли заполнять данными
            var seedMode = configuration["Seeding:Mode"] ?? "None";

            if (seedMode == "None")
            {
                return;
            }

            // Если данные уже есть, не заполняем повторно (опционально)
            var autoReseed = configuration.GetValue<bool>("Seeding:AutoReseed", false);
            if (!autoReseed && await context.ObjectTypes.AnyAsync())
            {
                Console.WriteLine("Database already contains data. Skipping seed.");
                return;
            }

            Console.WriteLine($"Seeding database with template: {seedMode}");

            // Очищаем существующие данные если AutoReseed включен
            if (autoReseed)
            {
                await ClearAllDataAsync(context);
            }

            switch (seedMode.ToLower())
            {
                case "investigation":
                    await SeedInvestigationTemplateAsync(context);
                    break;
                case "business":
                    await SeedBusinessTemplateAsync(context);
                    break;
                case "it":
                    await SeedITInfrastructureTemplateAsync(context);
                    break;
                case "all":
                    await SeedInvestigationTemplateAsync(context);
                    break;
                default:
                    Console.WriteLine($"Unknown seed mode: {seedMode}");
                    break;
            }

            await context.SaveChangesAsync();
            Console.WriteLine("Database seeding completed successfully!");
        }

        /// <summary>
        /// Очистить все данные из БД
        /// </summary>
        private static async Task ClearAllDataAsync(GraphDbContext context)
        {
            Console.WriteLine("Clearing existing data...");

            context.RelationProperties.RemoveRange(context.RelationProperties);
            context.GraphRelations.RemoveRange(context.GraphRelations);
            context.ObjectProperties.RemoveRange(context.ObjectProperties);
            context.GraphObjects.RemoveRange(context.GraphObjects);
            context.RelationTypes.RemoveRange(context.RelationTypes);
            context.ObjectTypes.RemoveRange(context.ObjectTypes);
            context.GraphLayouts.RemoveRange(context.GraphLayouts);

            await context.SaveChangesAsync();
            Console.WriteLine("Data cleared successfully!");
        }

        /// <summary>
        /// Шаблон для расследований (люди, компании, связи)
        /// </summary>
        private static async Task SeedInvestigationTemplateAsync(GraphDbContext context)
        {
            Console.WriteLine("Seeding Investigation template...");

            // 1. Создаем типы объектов
            var personType = new ObjectType
            {
                Name = "Персона",
                Description = "Физическое лицо (гражданин РБ)"
            };
            var companyType = new ObjectType
            {
                Name = "Компания",
                Description = "Юридическое лицо (зарегистрировано в РБ)"
            };
            var documentType = new ObjectType
            {
                Name = "Документ",
                Description = "Документ или контракт"
            };
            var eventType = new ObjectType
            {
                Name = "Событие",
                Description = "Событие или инцидент"
            };
            var locationType = new ObjectType
            {
                Name = "Локация",
                Description = "Место или адрес"
            };

            context.ObjectTypes.AddRange(personType, companyType, documentType, eventType, locationType);
            await context.SaveChangesAsync();

            // 2. Создаем типы связей
            var worksForRelation = new RelationType
            {
                Name = "Работает в",
                Description = "Трудовые отношения",
                ObjectTypeId = personType.Id
            };
            var ownsRelation = new RelationType
            {
                Name = "Владеет",
                Description = "Отношения владения",
                ObjectTypeId = personType.Id
            };
            var relatedToRelation = new RelationType
            {
                Name = "Связан с",
                Description = "Общая связь",
                ObjectTypeId = personType.Id
            };
            var signedRelation = new RelationType
            {
                Name = "Подписал",
                Description = "Подпись документа",
                ObjectTypeId = personType.Id
            };
            var locatedAtRelation = new RelationType
            {
                Name = "Находится в",
                Description = "Географическое расположение",
                ObjectTypeId = companyType.Id
            };
            var participatedInRelation = new RelationType
            {
                Name = "Участвовал в",
                Description = "Участие в событии",
                ObjectTypeId = personType.Id
            };

            context.RelationTypes.AddRange(
                worksForRelation,
                ownsRelation,
                relatedToRelation,
                signedRelation,
                locatedAtRelation,
                participatedInRelation
            );
            await context.SaveChangesAsync();

            // 3. Создаем примеры объектов (персоны)
            var person1 = new GraphObject
            {
                Name = "Иван Петров",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "45" },
                    new ObjectProperty { Key = "Должность", Value = "Генеральный директор" },
                    new ObjectProperty { Key = "УНП", Value = "123456789" }
                },
                Color = "#4CAF50",
                Icon = "👤",
                PositionX = 200,
                PositionY = 100
            };

            var person2 = new GraphObject
            {
                Name = "Мария Сидорова",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "38" },
                    new ObjectProperty { Key = "Должность", Value = "Финансовый директор" },
                    new ObjectProperty { Key = "УНП", Value = "987654321" }
                },
                Color = "#4CAF50",
                Icon = "👤",
                PositionX = 500,
                PositionY = 100
            };

            var person3 = new GraphObject
            {
                Name = "Алексей Ковалев",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "52" },
                    new ObjectProperty { Key = "Должность", Value = "Совладелец" },
                    new ObjectProperty { Key = "УНП", Value = "456789123" }
                },
                Color = "#4CAF50",
                Icon = "👤",
                PositionX = 800,
                PositionY = 100
            };

            // Компании
            var company1 = new GraphObject
            {
                Name = "ООО 'Альфа Инвест'",
                ObjectTypeId = companyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "УНП", Value = "190123456" },
                    new ObjectProperty { Key = "Дата регистрации", Value = "2015-03-15" },
                    new ObjectProperty { Key = "Уставной капитал", Value = "10000000 BYN" },
                    new ObjectProperty { Key = "Адрес", Value = "г. Минск, пр-т Независимости, 84" }
                },
                Color = "#2196F3",
                Icon = "🏢",
                PositionX = 350,
                PositionY = 300
            };

            var company2 = new GraphObject
            {
                Name = "ОАО 'Бета Групп'",
                ObjectTypeId = companyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "УНП", Value = "100654321" },
                    new ObjectProperty { Key = "Дата регистрации", Value = "2010-07-22" },
                    new ObjectProperty { Key = "Уставной капитал", Value = "50000000 BYN" },
                    new ObjectProperty { Key = "Адрес", Value = "г. Минск, ул. Ленина, 17" }
                },
                Color = "#2196F3",
                Icon = "🏢",
                PositionX = 650,
                PositionY = 300
            };

            // Документы
            var document1 = new GraphObject
            {
                Name = "Контракт №45/2023",
                ObjectTypeId = documentType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Дата", Value = "2023-06-10" },
                    new ObjectProperty { Key = "Сумма", Value = "5000000 BYN" },
                    new ObjectProperty { Key = "Статус", Value = "Действующий" }
                },
                Color = "#FF9800",
                Icon = "📄",
                PositionX = 500,
                PositionY = 500
            };

            // События
            var event1 = new GraphObject
            {
                Name = "Заседание совета директоров",
                ObjectTypeId = eventType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Дата", Value = "2024-01-15" },
                    new ObjectProperty { Key = "Место", Value = "Минск, БЦ 'Столица'" },
                    new ObjectProperty { Key = "Тип", Value = "Деловая встреча" }
                },
                Color = "#9C27B0",
                Icon = "📅",
                PositionX = 200,
                PositionY = 500
            };

            // Локации
            var location1 = new GraphObject
            {
                Name = "Минск, пр-т Независимости 84",
                ObjectTypeId = locationType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Адрес", Value = "г. Минск, пр-т Независимости, д. 84" },
                    new ObjectProperty { Key = "Координаты", Value = "53.9006,27.5590" }
                },
                Color = "#F44336",
                Icon = "📍",
                PositionX = 350,
                PositionY = 700
            };

            context.GraphObjects.AddRange(
                person1, person2, person3,
                company1, company2,
                document1,
                event1,
                location1
            );
            await context.SaveChangesAsync();

            // 4. Создаем связи
            var relations = new[]
            {
                // Иван работает в Альфа Инвест
                new GraphRelation
                {
                    Source = person1.Id,
                    Target = company1.Id,
                    RelationTypeId = worksForRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "С даты", Value = "2015-04-01" },
                        new RelationProperty { Key = "Зарплата", Value = "5000 BYN" }
                    },
                    Color = "#4CAF50"
                },
                // Мария работает в Альфа Инвест
                new GraphRelation
                {
                    Source = person2.Id,
                    Target = company1.Id,
                    RelationTypeId = worksForRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "С даты", Value = "2016-09-15" },
                        new RelationProperty { Key = "Зарплата", Value = "4000 BYN" }
                    },
                    Color = "#4CAF50"
                },
                // Алексей владеет Бета Групп
                new GraphRelation
                {
                    Source = person3.Id,
                    Target = company2.Id,
                    RelationTypeId = ownsRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "Доля", Value = "51%" },
                        new RelationProperty { Key = "С даты", Value = "2010-07-22" }
                    },
                    Color = "#FFC107"
                },
                // Иван связан с Алексеем
                new GraphRelation
                {
                    Source = person1.Id,
                    Target = person3.Id,
                    RelationTypeId = relatedToRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "Тип связи", Value = "Деловое партнерство" },
                        new RelationProperty { Key = "С года", Value = "2018" }
                    },
                    Color = "#9E9E9E"
                },
                // Иван подписал контракт
                new GraphRelation
                {
                    Source = person1.Id,
                    Target = document1.Id,
                    RelationTypeId = signedRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "Дата подписания", Value = "2023-06-10" },
                        new RelationProperty { Key = "Роль", Value = "От имени Альфа Инвест" }
                    },
                    Color = "#FF9800"
                },
                // Алексей подписал контракт
                new GraphRelation
                {
                    Source = person3.Id,
                    Target = document1.Id,
                    RelationTypeId = signedRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "Дата подписания", Value = "2023-06-10" },
                        new RelationProperty { Key = "Роль", Value = "От имени Бета Групп" }
                    },
                    Color = "#FF9800"
                },
                // Альфа Инвест находится в Минске
                new GraphRelation
                {
                    Source = company1.Id,
                    Target = location1.Id,
                    RelationTypeId = locatedAtRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "Тип", Value = "Юридический адрес" }
                    },
                    Color = "#F44336"
                },
                // Иван участвовал в событии
                new GraphRelation
                {
                    Source = person1.Id,
                    Target = event1.Id,
                    RelationTypeId = participatedInRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "Роль", Value = "Председатель" }
                    },
                    Color = "#9C27B0"
                },
                // Алексей участвовал в событии
                new GraphRelation
                {
                    Source = person3.Id,
                    Target = event1.Id,
                    RelationTypeId = participatedInRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "Роль", Value = "Участник" }
                    },
                    Color = "#9C27B0"
                }
            };

            context.GraphRelations.AddRange(relations);
            await context.SaveChangesAsync();

            Console.WriteLine($"Investigation template created (Belarus): {context.GraphObjects.Count()} objects, {context.GraphRelations.Count()} relations");
        }

        /// <summary>
        /// Шаблон для бизнес-процессов
        /// </summary>
        private static async Task SeedBusinessTemplateAsync(GraphDbContext context)
        {
            Console.WriteLine("Seeding Business template...");

            var processType = new ObjectType { Name = "Процесс", Description = "Бизнес-процесс" };
            var taskType = new ObjectType { Name = "Задача", Description = "Задача в процессе" };
            var roleType = new ObjectType { Name = "Роль", Description = "Роль сотрудника" };
            var systemType = new ObjectType { Name = "Система", Description = "IT система" };

            context.ObjectTypes.AddRange(processType, taskType, roleType, systemType);
            await context.SaveChangesAsync();

            var nextRelation = new RelationType { Name = "Следующий шаг", ObjectTypeId = taskType.Id };
            var responsibleRelation = new RelationType { Name = "Ответственный", ObjectTypeId = roleType.Id };
            var usesRelation = new RelationType { Name = "Использует", ObjectTypeId = taskType.Id };

            context.RelationTypes.AddRange(nextRelation, responsibleRelation, usesRelation);
            await context.SaveChangesAsync();

            var obj1 = new GraphObject { Name = "Получение заявки", ObjectTypeId = taskType.Id, Color = "#4CAF50", Icon = "📨", PositionX = 200, PositionY = 200 };
            var obj2 = new GraphObject { Name = "Обработка", ObjectTypeId = taskType.Id, Color = "#2196F3", Icon = "⚙️", PositionX = 400, PositionY = 200 };
            var obj3 = new GraphObject { Name = "Утверждение", ObjectTypeId = taskType.Id, Color = "#FF9800", Icon = "✅", PositionX = 600, PositionY = 200 };
            var obj4 = new GraphObject { Name = "Менеджер", ObjectTypeId = roleType.Id, Color = "#9C27B0", Icon = "👔", PositionX = 400, PositionY = 400 };
            var obj5 = new GraphObject { Name = "CRM система", ObjectTypeId = systemType.Id, Color = "#607D8B", Icon = "💻", PositionX = 200, PositionY = 400 };

            context.GraphObjects.AddRange(obj1, obj2, obj3, obj4, obj5);
            await context.SaveChangesAsync();

            context.GraphRelations.AddRange(
                new GraphRelation { Source = obj1.Id, Target = obj2.Id, RelationTypeId = nextRelation.Id },
                new GraphRelation { Source = obj2.Id, Target = obj3.Id, RelationTypeId = nextRelation.Id },
                new GraphRelation { Source = obj4.Id, Target = obj2.Id, RelationTypeId = responsibleRelation.Id },
                new GraphRelation { Source = obj2.Id, Target = obj5.Id, RelationTypeId = usesRelation.Id }
            );
            await context.SaveChangesAsync();

            Console.WriteLine("Business template created");
        }

        /// <summary>
        /// Шаблон для IT инфраструктуры
        /// </summary>
        private static async Task SeedITInfrastructureTemplateAsync(GraphDbContext context)
        {
            Console.WriteLine("Seeding IT Infrastructure template...");

            var serverType = new ObjectType { Name = "Сервер", Description = "Физический или виртуальный сервер" };
            var serviceType = new ObjectType { Name = "Сервис", Description = "Приложение или сервис" };
            var databaseType = new ObjectType { Name = "База данных", Description = "База данных" };
            var userType = new ObjectType { Name = "Пользователь", Description = "Пользователь системы" };

            context.ObjectTypes.AddRange(serverType, serviceType, databaseType, userType);
            await context.SaveChangesAsync();

            var hostsRelation = new RelationType { Name = "Хостит", ObjectTypeId = serverType.Id };
            var connectsRelation = new RelationType { Name = "Подключается к", ObjectTypeId = serviceType.Id };
            var accessRelation = new RelationType { Name = "Имеет доступ", ObjectTypeId = userType.Id };

            context.RelationTypes.AddRange(hostsRelation, connectsRelation, accessRelation);
            await context.SaveChangesAsync();

            var server1 = new GraphObject { Name = "Web-Server-01", ObjectTypeId = serverType.Id, Color = "#607D8B", Icon = "🖥️", PositionX = 300, PositionY = 100 };
            var server2 = new GraphObject { Name = "DB-Server-01", ObjectTypeId = serverType.Id, Color = "#607D8B", Icon = "🖥️", PositionX = 500, PositionY = 100 };
            var service1 = new GraphObject { Name = "Frontend App", ObjectTypeId = serviceType.Id, Color = "#2196F3", Icon = "🌐", PositionX = 300, PositionY = 300 };
            var service2 = new GraphObject { Name = "Backend API", ObjectTypeId = serviceType.Id, Color = "#4CAF50", Icon = "⚙️", PositionX = 500, PositionY = 300 };
            var db1 = new GraphObject { Name = "PostgreSQL", ObjectTypeId = databaseType.Id, Color = "#FF9800", Icon = "💾", PositionX = 500, PositionY = 500 };
            var user1 = new GraphObject { Name = "Admin", ObjectTypeId = userType.Id, Color = "#F44336", Icon = "👤", PositionX = 200, PositionY = 300 };

            context.GraphObjects.AddRange(server1, server2, service1, service2, db1, user1);
            await context.SaveChangesAsync();

            context.GraphRelations.AddRange(
                new GraphRelation { Source = server1.Id, Target = service1.Id, RelationTypeId = hostsRelation.Id },
                new GraphRelation { Source = server1.Id, Target = service2.Id, RelationTypeId = hostsRelation.Id },
                new GraphRelation { Source = server2.Id, Target = db1.Id, RelationTypeId = hostsRelation.Id },
                new GraphRelation { Source = service2.Id, Target = db1.Id, RelationTypeId = connectsRelation.Id },
                new GraphRelation { Source = user1.Id, Target = service1.Id, RelationTypeId = accessRelation.Id }
            );
            await context.SaveChangesAsync();

            Console.WriteLine("IT Infrastructure template created");
        }
    }
}
