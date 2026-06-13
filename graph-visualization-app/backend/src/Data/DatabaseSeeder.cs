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
                // Но проверяем, есть ли схемы свойств — если нет, досыпаем
                if (!await context.PropertySchemas.AnyAsync())
                {
                    Console.WriteLine("PropertySchemas table is empty. Seeding schemas for existing types...");
                    await SeedPropertySchemasForExistingTypesAsync(context);
                }
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
                case "large":
                    await SeedLargeTemplateAsync(context);
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
        /// Досыпать схемы свойств для уже существующих типов (без пересоздания данных)
        /// </summary>
        private static async Task SeedPropertySchemasForExistingTypesAsync(GraphDbContext context)
        {
            var objectTypes = await context.ObjectTypes.ToListAsync();
            var relationTypes = await context.RelationTypes.ToListAsync();

            // Helper: найти тип по имени
            int? ot(string name) => objectTypes.FirstOrDefault(t => t.Name == name)?.Id;
            int? rt(string name) => relationTypes.FirstOrDefault(t => t.Name == name)?.Id;

            var schemas = new List<PropertySchema>();

            // Персона
            if (ot("Персона") is int personId)
            {
                schemas.Add(new PropertySchema { ObjectTypeId = personId, Key = "Возраст", PropertyType = "number" });
                schemas.Add(new PropertySchema { ObjectTypeId = personId, Key = "Роль", PropertyType = "enum", Options = "[\"Организатор\",\"Номинальный директор\",\"Бухгалтер\",\"Юрист\",\"Свидетель\"]" });
                schemas.Add(new PropertySchema { ObjectTypeId = personId, Key = "Паспорт", PropertyType = "string" });
                schemas.Add(new PropertySchema { ObjectTypeId = personId, Key = "latitude", PropertyType = "number" });
                schemas.Add(new PropertySchema { ObjectTypeId = personId, Key = "longitude", PropertyType = "number" });
            }

            // Компания
            if (ot("Компания") is int companyId)
            {
                schemas.Add(new PropertySchema { ObjectTypeId = companyId, Key = "УНП", PropertyType = "string", Required = true });
                schemas.Add(new PropertySchema { ObjectTypeId = companyId, Key = "Дата регистрации", PropertyType = "date" });
                schemas.Add(new PropertySchema { ObjectTypeId = companyId, Key = "Статус", PropertyType = "enum", Options = "[\"Действующая\",\"Ликвидирована\",\"В процессе ликвидации\"]" });
                schemas.Add(new PropertySchema { ObjectTypeId = companyId, Key = "latitude", PropertyType = "number" });
                schemas.Add(new PropertySchema { ObjectTypeId = companyId, Key = "longitude", PropertyType = "number" });
            }

            // Банковский счёт
            if (ot("Банковский счёт") is int bankId)
            {
                schemas.Add(new PropertySchema { ObjectTypeId = bankId, Key = "Банк", PropertyType = "string" });
                schemas.Add(new PropertySchema { ObjectTypeId = bankId, Key = "Валюта", PropertyType = "enum", Options = "[\"BYN\",\"USD\",\"EUR\",\"RUB\"]" });
            }

            // Транзакция
            if (ot("Транзакция") is int txId)
            {
                schemas.Add(new PropertySchema { ObjectTypeId = txId, Key = "Сумма", PropertyType = "string", Required = true });
                schemas.Add(new PropertySchema { ObjectTypeId = txId, Key = "Дата", PropertyType = "date", Required = true });
                schemas.Add(new PropertySchema { ObjectTypeId = txId, Key = "Назначение", PropertyType = "string" });
            }

            // Документ
            if (ot("Документ") is int docId)
            {
                schemas.Add(new PropertySchema { ObjectTypeId = docId, Key = "Дата", PropertyType = "date" });
                schemas.Add(new PropertySchema { ObjectTypeId = docId, Key = "Предмет", PropertyType = "string" });
                schemas.Add(new PropertySchema { ObjectTypeId = docId, Key = "Сумма", PropertyType = "string" });
                schemas.Add(new PropertySchema { ObjectTypeId = docId, Key = "Статус", PropertyType = "enum", Options = "[\"Действующий\",\"Фиктивный\",\"Расторгнут\"]" });
            }

            // Имущество
            if (ot("Имущество") is int propId)
            {
                schemas.Add(new PropertySchema { ObjectTypeId = propId, Key = "Стоимость", PropertyType = "string" });
                schemas.Add(new PropertySchema { ObjectTypeId = propId, Key = "Дата покупки", PropertyType = "date" });
            }

            // --- Типы связей ---

            // Перевод средств
            if (rt("Перевод средств") is int transferId)
            {
                schemas.Add(new PropertySchema { RelationTypeId = transferId, Key = "weight", PropertyType = "number", DefaultValue = "1" });
                schemas.Add(new PropertySchema { RelationTypeId = transferId, Key = "date", PropertyType = "date" });
            }

            // Владеет
            if (rt("Владеет") is int ownsId)
            {
                schemas.Add(new PropertySchema { RelationTypeId = ownsId, Key = "weight", PropertyType = "number", DefaultValue = "1" });
                schemas.Add(new PropertySchema { RelationTypeId = ownsId, Key = "date", PropertyType = "date" });
                schemas.Add(new PropertySchema { RelationTypeId = ownsId, Key = "Доля", PropertyType = "string" });
            }

            // Контролирует
            if (rt("Контролирует") is int ctrlId)
            {
                schemas.Add(new PropertySchema { RelationTypeId = ctrlId, Key = "weight", PropertyType = "number", DefaultValue = "1" });
                schemas.Add(new PropertySchema { RelationTypeId = ctrlId, Key = "date", PropertyType = "date" });
                schemas.Add(new PropertySchema { RelationTypeId = ctrlId, Key = "Тип", PropertyType = "enum", Options = "[\"Теневой контроль\",\"Бенефициар\",\"Прямой\"]" });
            }

            // Работает в
            if (rt("Работает в") is int worksId)
            {
                schemas.Add(new PropertySchema { RelationTypeId = worksId, Key = "weight", PropertyType = "number", DefaultValue = "1" });
                schemas.Add(new PropertySchema { RelationTypeId = worksId, Key = "date", PropertyType = "date" });
                schemas.Add(new PropertySchema { RelationTypeId = worksId, Key = "Должность", PropertyType = "string" });
            }

            // Связан с
            if (rt("Связан с") is int relatedId)
            {
                schemas.Add(new PropertySchema { RelationTypeId = relatedId, Key = "weight", PropertyType = "number", DefaultValue = "1" });
                schemas.Add(new PropertySchema { RelationTypeId = relatedId, Key = "date", PropertyType = "date" });
                schemas.Add(new PropertySchema { RelationTypeId = relatedId, Key = "Связь", PropertyType = "string" });
            }

            // Имеет счёт
            if (rt("Имеет счёт") is int accId)
            {
                schemas.Add(new PropertySchema { RelationTypeId = accId, Key = "date", PropertyType = "date" });
            }

            // Подписал
            if (rt("Подписал") is int signId)
            {
                schemas.Add(new PropertySchema { RelationTypeId = signId, Key = "date", PropertyType = "date" });
            }

            // Получил
            if (rt("Получил") is int recvId)
            {
                schemas.Add(new PropertySchema { RelationTypeId = recvId, Key = "date", PropertyType = "date" });
                schemas.Add(new PropertySchema { RelationTypeId = recvId, Key = "weight", PropertyType = "number", DefaultValue = "1" });
            }

            if (schemas.Count > 0)
            {
                context.PropertySchemas.AddRange(schemas);
                await context.SaveChangesAsync();
                Console.WriteLine($"Added {schemas.Count} property schemas for existing types.");
            }
        }

        /// <summary>
        /// Очистить все данные из БД
        /// </summary>
        private static async Task ClearAllDataAsync(GraphDbContext context)
        {
            Console.WriteLine("Clearing existing data...");

            context.PropertySchemas.RemoveRange(context.PropertySchemas);
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
        /// Шаблон для расследования финансовых махинаций
        /// </summary>
        private static async Task SeedInvestigationTemplateAsync(GraphDbContext context)
        {
            Console.WriteLine("Seeding Fraud Investigation template...");

            // 1. Создаем типы объектов
            var personType = new ObjectType
            {
                Name = "Персона",
                Description = "Физическое лицо - подозреваемый или свидетель"
            };
            var companyType = new ObjectType
            {
                Name = "Компания",
                Description = "Юридическое лицо (в том числе фирмы-однодневки)"
            };
            var bankAccountType = new ObjectType
            {
                Name = "Банковский счёт",
                Description = "Расчётный счёт в банке"
            };
            var transactionType = new ObjectType
            {
                Name = "Транзакция",
                Description = "Финансовая операция / перевод средств"
            };
            var documentType = new ObjectType
            {
                Name = "Документ",
                Description = "Контракт, договор, акт"
            };
            var propertyType = new ObjectType
            {
                Name = "Имущество",
                Description = "Недвижимость, автомобили, ценности"
            };

            context.ObjectTypes.AddRange(personType, companyType, bankAccountType, transactionType, documentType, propertyType);
            await context.SaveChangesAsync();

            // 1.5. Схемы свойств для типов объектов
            context.PropertySchemas.AddRange(
                new PropertySchema { ObjectTypeId = personType.Id, Key = "Возраст", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "Роль", PropertyType = "enum", Options = "[\"Организатор схемы\",\"Номинальный директор\",\"Номинальный учредитель\",\"Главный бухгалтер\",\"Юридическое сопровождение\",\"Супруга организатора\",\"Свидетель\",\"Инвестор\",\"Аудитор\"]" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "Паспорт", PropertyType = "string" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "Город", PropertyType = "enum", Options = "[\"Минск\",\"Брест\",\"Москва\",\"Кипр\"]" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "latitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "longitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "УНП", PropertyType = "string", Required = true },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "Дата регистрации", PropertyType = "date" },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "Статус", PropertyType = "enum", Options = "[\"Действующая\",\"Ликвидирована\",\"В процессе ликвидации\",\"Фирма-однодневка\",\"Транзитная компания\",\"Оффшор\"]" },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "Отрасль", PropertyType = "enum", Options = "[\"Торговля\",\"IT\",\"Строительство\",\"Консалтинг\",\"Финансы\",\"Недвижимость\"]" },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "latitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "longitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = bankAccountType.Id, Key = "Банк", PropertyType = "string" },
                new PropertySchema { ObjectTypeId = bankAccountType.Id, Key = "Валюта", PropertyType = "enum", Options = "[\"BYN\",\"USD\",\"EUR\",\"RUB\"]" },
                new PropertySchema { ObjectTypeId = transactionType.Id, Key = "Сумма", PropertyType = "string", Required = true },
                new PropertySchema { ObjectTypeId = transactionType.Id, Key = "Дата", PropertyType = "date", Required = true },
                new PropertySchema { ObjectTypeId = transactionType.Id, Key = "Назначение", PropertyType = "string" },
                new PropertySchema { ObjectTypeId = documentType.Id, Key = "Дата", PropertyType = "date" },
                new PropertySchema { ObjectTypeId = documentType.Id, Key = "Предмет", PropertyType = "string" },
                new PropertySchema { ObjectTypeId = documentType.Id, Key = "Сумма", PropertyType = "string" },
                new PropertySchema { ObjectTypeId = documentType.Id, Key = "Статус", PropertyType = "enum", Options = "[\"Действующий\",\"Фиктивный\",\"Расторгнут\"]" },
                new PropertySchema { ObjectTypeId = propertyType.Id, Key = "Стоимость", PropertyType = "string" },
                new PropertySchema { ObjectTypeId = propertyType.Id, Key = "Дата покупки", PropertyType = "date" }
            );
            await context.SaveChangesAsync();

            // 2. Создаем типы связей
            var ownsRelation = new RelationType { Name = "Владеет", Description = "Отношения владения", ObjectTypeId = personType.Id };
            var controlsRelation = new RelationType { Name = "Контролирует", Description = "Теневой контроль", ObjectTypeId = personType.Id };
            var transferRelation = new RelationType { Name = "Перевод средств", Description = "Денежный перевод", ObjectTypeId = bankAccountType.Id };
            var signedRelation = new RelationType { Name = "Подписал", Description = "Подпись документа", ObjectTypeId = personType.Id };
            var receivedRelation = new RelationType { Name = "Получил", Description = "Получение средств/имущества", ObjectTypeId = personType.Id };
            var worksForRelation = new RelationType { Name = "Работает в", Description = "Номинальная или реальная должность", ObjectTypeId = personType.Id };
            var relatedToRelation = new RelationType { Name = "Связан с", Description = "Родственные или деловые связи", ObjectTypeId = personType.Id };
            var hasAccountRelation = new RelationType { Name = "Имеет счёт", Description = "Владелец банковского счёта", ObjectTypeId = companyType.Id };

            context.RelationTypes.AddRange(ownsRelation, controlsRelation, transferRelation, signedRelation, receivedRelation, worksForRelation, relatedToRelation, hasAccountRelation);
            await context.SaveChangesAsync();

            // 2.5. Схемы свойств для типов связей
            context.PropertySchemas.AddRange(
                new PropertySchema { RelationTypeId = transferRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = transferRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = ownsRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = ownsRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = ownsRelation.Id, Key = "Доля", PropertyType = "string" },
                new PropertySchema { RelationTypeId = controlsRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = controlsRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = controlsRelation.Id, Key = "Тип", PropertyType = "enum", Options = "[\"Теневой контроль\",\"Бенефициар\",\"Прямой\"]" },
                new PropertySchema { RelationTypeId = worksForRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = worksForRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = worksForRelation.Id, Key = "Должность", PropertyType = "string" },
                new PropertySchema { RelationTypeId = relatedToRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = relatedToRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = relatedToRelation.Id, Key = "Связь", PropertyType = "string" },
                new PropertySchema { RelationTypeId = hasAccountRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = signedRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = receivedRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = receivedRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" }
            );
            await context.SaveChangesAsync();

            // 3. ПЕРСОНЫ (подозреваемые и их окружение)
            var mastermind = new GraphObject
            {
                Name = "Виктор Черненко",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "54" },
                    new ObjectProperty { Key = "Роль", Value = "Организатор схемы" },
                    new ObjectProperty { Key = "Паспорт", Value = "MP3456789" },
                    new ObjectProperty { Key = "Адрес", Value = "г. Минск, ул. Захарова, 15" },
                    new ObjectProperty { Key = "latitude", Value = "53.9045" },
                    new ObjectProperty { Key = "longitude", Value = "27.5615" }
                },
                Color = "#D32F2F", Icon = "🎯", PositionX = 500, PositionY = 100
            };

            var nominee1 = new GraphObject
            {
                Name = "Сергей Лукашевич",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "32" },
                    new ObjectProperty { Key = "Роль", Value = "Номинальный директор" },
                    new ObjectProperty { Key = "Паспорт", Value = "MP1234567" },
                    new ObjectProperty { Key = "latitude", Value = "52.4345" },
                    new ObjectProperty { Key = "longitude", Value = "30.9754" }
                },
                Color = "#FF5722", Icon = "👤", PositionX = 200, PositionY = 250
            };

            var nominee2 = new GraphObject
            {
                Name = "Анна Коваленко",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "28" },
                    new ObjectProperty { Key = "Роль", Value = "Номинальный учредитель" },
                    new ObjectProperty { Key = "Паспорт", Value = "MP7654321" },
                    new ObjectProperty { Key = "latitude", Value = "52.0976" },
                    new ObjectProperty { Key = "longitude", Value = "23.7341" }
                },
                Color = "#FF5722", Icon = "👤", PositionX = 800, PositionY = 250
            };

            var accountant = new GraphObject
            {
                Name = "Елена Громова",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "41" },
                    new ObjectProperty { Key = "Роль", Value = "Главный бухгалтер" },
                    new ObjectProperty { Key = "Образование", Value = "БГЭУ, 2005" },
                    new ObjectProperty { Key = "latitude", Value = "53.6693" },
                    new ObjectProperty { Key = "longitude", Value = "23.8131" }
                },
                Color = "#FFC107", Icon = "👩‍💼", PositionX = 500, PositionY = 250
            };

            var lawyer = new GraphObject
            {
                Name = "Дмитрий Волков",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "47" },
                    new ObjectProperty { Key = "Роль", Value = "Юридическое сопровождение" },
                    new ObjectProperty { Key = "Лицензия", Value = "№ 02354/2010" },
                    new ObjectProperty { Key = "latitude", Value = "53.9022" },
                    new ObjectProperty { Key = "longitude", Value = "30.3306" }
                },
                Color = "#9C27B0", Icon = "⚖️", PositionX = 350, PositionY = 100
            };

            var relative = new GraphObject
            {
                Name = "Ирина Черненко",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "48" },
                    new ObjectProperty { Key = "Роль", Value = "Супруга организатора" },
                    new ObjectProperty { Key = "Связь", Value = "Родственная" },
                    new ObjectProperty { Key = "latitude", Value = "55.1904" },
                    new ObjectProperty { Key = "longitude", Value = "30.2049" }
                },
                Color = "#E91E63", Icon = "👩", PositionX = 650, PositionY = 100
            };

            // 4. КОМПАНИИ (схема фирм-однодневок)
            var mainCompany = new GraphObject
            {
                Name = "ООО 'ТрейдИнвест'",
                ObjectTypeId = companyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "УНП", Value = "192345678" },
                    new ObjectProperty { Key = "Дата регистрации", Value = "12.03.2021" },
                    new ObjectProperty { Key = "Уставной капитал", Value = "50 BYN" },
                    new ObjectProperty { Key = "Статус", Value = "Действующая" },
                    new ObjectProperty { Key = "latitude", Value = "53.8963" },
                    new ObjectProperty { Key = "longitude", Value = "27.5556" }
                },
                Color = "#1976D2", Icon = "🏢", PositionX = 200, PositionY = 450
            };

            var shell1 = new GraphObject
            {
                Name = "ООО 'АльфаКонсалт'",
                ObjectTypeId = companyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "УНП", Value = "193456789" },
                    new ObjectProperty { Key = "Дата регистрации", Value = "05.07.2022" },
                    new ObjectProperty { Key = "Статус", Value = "Фирма-однодневка" },
                    new ObjectProperty { Key = "latitude", Value = "52.4248" },
                    new ObjectProperty { Key = "longitude", Value = "31.0140" }
                },
                Color = "#F44336", Icon = "🏚️", PositionX = 400, PositionY = 450
            };

            var shell2 = new GraphObject
            {
                Name = "ИП Коваленко А.В.",
                ObjectTypeId = companyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "УНП", Value = "194567890" },
                    new ObjectProperty { Key = "Дата регистрации", Value = "18.11.2022" },
                    new ObjectProperty { Key = "Статус", Value = "Транзитная компания" }
                },
                Color = "#F44336", Icon = "🏚️", PositionX = 600, PositionY = 450
            };

            var offshore = new GraphObject
            {
                Name = "Cyprus Holdings Ltd",
                ObjectTypeId = companyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Регистрация", Value = "Кипр, Никосия" },
                    new ObjectProperty { Key = "Дата регистрации", Value = "23.01.2020" },
                    new ObjectProperty { Key = "Статус", Value = "Оффшор" }
                },
                Color = "#795548", Icon = "🌍", PositionX = 800, PositionY = 450
            };

            // 5. БАНКОВСКИЕ СЧЕТА
            var account1 = new GraphObject
            {
                Name = "BY20ALFA30125678901234567890",
                ObjectTypeId = bankAccountType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Банк", Value = "Альфабанк" },
                    new ObjectProperty { Key = "Валюта", Value = "BYN" },
                    new ObjectProperty { Key = "Открыт", Value = "15.03.2021" }
                },
                Color = "#4CAF50", Icon = "💳", PositionX = 200, PositionY = 650
            };

            var account2 = new GraphObject
            {
                Name = "BY45PRIOR3012987654321098765",
                ObjectTypeId = bankAccountType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Банк", Value = "Приорбанк" },
                    new ObjectProperty { Key = "Валюта", Value = "USD" },
                    new ObjectProperty { Key = "Открыт", Value = "10.07.2022" }
                },
                Color = "#4CAF50", Icon = "💳", PositionX = 400, PositionY = 650
            };

            var account3 = new GraphObject
            {
                Name = "BY78BELB30121111222233334444",
                ObjectTypeId = bankAccountType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Банк", Value = "Белинвестбанк" },
                    new ObjectProperty { Key = "Валюта", Value = "EUR" },
                    new ObjectProperty { Key = "Открыт", Value = "25.11.2022" }
                },
                Color = "#4CAF50", Icon = "💳", PositionX = 600, PositionY = 650
            };

            var offshoreAccount = new GraphObject
            {
                Name = "CY9876543210EUR",
                ObjectTypeId = bankAccountType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Банк", Value = "Bank of Cyprus" },
                    new ObjectProperty { Key = "Валюта", Value = "EUR" },
                    new ObjectProperty { Key = "Открыт", Value = "01.02.2020" }
                },
                Color = "#FF9800", Icon = "💰", PositionX = 800, PositionY = 650
            };

            // 6. ТРАНЗАКЦИИ (подозрительные переводы)
            var tx1 = new GraphObject
            {
                Name = "Платёж #TRX-001",
                ObjectTypeId = transactionType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Сумма", Value = "150 000 BYN" },
                    new ObjectProperty { Key = "Назначение", Value = "Консультационные услуги" },
                    new ObjectProperty { Key = "Дата", Value = "20.04.2023" }
                },
                Color = "#E91E63", Icon = "💸", PositionX = 300, PositionY = 850
            };

            var tx2 = new GraphObject
            {
                Name = "Платёж #TRX-002",
                ObjectTypeId = transactionType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Сумма", Value = "75 000 USD" },
                    new ObjectProperty { Key = "Назначение", Value = "Маркетинговые услуги" },
                    new ObjectProperty { Key = "Дата", Value = "15.06.2023" }
                },
                Color = "#E91E63", Icon = "💸", PositionX = 500, PositionY = 850
            };

            var tx3 = new GraphObject
            {
                Name = "Платёж #TRX-003",
                ObjectTypeId = transactionType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Сумма", Value = "200 000 EUR" },
                    new ObjectProperty { Key = "Назначение", Value = "Инвестиции в проект" },
                    new ObjectProperty { Key = "Дата", Value = "03.09.2023" }
                },
                Color = "#E91E63", Icon = "💸", PositionX = 700, PositionY = 850
            };

            // 7. ДОКУМЕНТЫ (фиктивные контракты)
            var contract1 = new GraphObject
            {
                Name = "Договор №15/2023",
                ObjectTypeId = documentType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Дата", Value = "10.04.2023" },
                    new ObjectProperty { Key = "Предмет", Value = "Консультационные услуги" },
                    new ObjectProperty { Key = "Сумма", Value = "150 000 BYN" },
                    new ObjectProperty { Key = "Статус", Value = "Фиктивный" }
                },
                Color = "#FF9800", Icon = "📄", PositionX = 100, PositionY = 350
            };

            var contract2 = new GraphObject
            {
                Name = "Договор №28/2023",
                ObjectTypeId = documentType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Дата", Value = "01.06.2023" },
                    new ObjectProperty { Key = "Предмет", Value = "Маркетинговое исследование" },
                    new ObjectProperty { Key = "Сумма", Value = "75 000 USD" },
                    new ObjectProperty { Key = "Статус", Value = "Фиктивный" }
                },
                Color = "#FF9800", Icon = "📄", PositionX = 500, PositionY = 350
            };

            // 8. ИМУЩЕСТВО (нажитое преступным путём)
            var apartment = new GraphObject
            {
                Name = "Квартира в ЖК 'Маяк'",
                ObjectTypeId = propertyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Адрес", Value = "г. Минск, ул. Притыцкого, 89-45" },
                    new ObjectProperty { Key = "Площадь", Value = "120 кв.м" },
                    new ObjectProperty { Key = "Стоимость", Value = "280 000 USD" },
                    new ObjectProperty { Key = "Дата покупки", Value = "15.12.2023" }
                },
                Color = "#3F51B5", Icon = "🏠", PositionX = 650, PositionY = 0
            };

            var car = new GraphObject
            {
                Name = "Mercedes-Benz S-Class",
                ObjectTypeId = propertyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Гос. номер", Value = "7777 AA-7" },
                    new ObjectProperty { Key = "Год выпуска", Value = "2023" },
                    new ObjectProperty { Key = "Стоимость", Value = "180 000 EUR" },
                    new ObjectProperty { Key = "Дата покупки", Value = "20.10.2023" }
                },
                Color = "#607D8B", Icon = "🚗", PositionX = 800, PositionY = 0
            };

            context.GraphObjects.AddRange(
                mastermind, nominee1, nominee2, accountant, lawyer, relative,
                mainCompany, shell1, shell2, offshore,
                account1, account2, account3, offshoreAccount,
                tx1, tx2, tx3,
                contract1, contract2,
                apartment, car
            );

            // ДОПОЛНИТЕЛЬНЫЕ ОБЪЕКТЫ ДЛЯ ДЕМОНСТРАЦИИ (РАСШИРЕНИЕ ДАТАСЕТА)
            var investor = new GraphObject
            {
                Name = "Михаил Захаров",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "60" },
                    new ObjectProperty { Key = "Роль", Value = "Инвестор" },
                    new ObjectProperty { Key = "Паспорт", Value = "MP9876543" },
                    new ObjectProperty { Key = "Город", Value = "Москва" },
                    new ObjectProperty { Key = "latitude", Value = "55.7558" },
                    new ObjectProperty { Key = "longitude", Value = "37.6173" }
                },
                Color = "#FFC107", Icon = "😎", PositionX = 900, PositionY = 100
            };

            var auditor = new GraphObject
            {
                Name = "Сергей Смирнов",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "38" },
                    new ObjectProperty { Key = "Роль", Value = "Аудитор" },
                    new ObjectProperty { Key = "Город", Value = "Минск" },
                    new ObjectProperty { Key = "latitude", Value = "53.8930" },
                    new ObjectProperty { Key = "longitude", Value = "27.5674" }
                },
                Color = "#9C27B0", Icon = "🕵️", PositionX = 450, PositionY = 150
            };

            var courier = new GraphObject
            {
                Name = "Алексей Дроздов",
                ObjectTypeId = personType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Возраст", Value = "24" },
                    new ObjectProperty { Key = "Роль", Value = "Свидетель" },
                    new ObjectProperty { Key = "Город", Value = "Брест" },
                    new ObjectProperty { Key = "latitude", Value = "52.0975" },
                    new ObjectProperty { Key = "longitude", Value = "23.6877" }
                },
                Color = "#8D6E63", Icon = "🏃", PositionX = 100, PositionY = 150
            };

            var newShell = new GraphObject
            {
                Name = "ООО 'ВекторПлюс'",
                ObjectTypeId = companyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "УНП", Value = "195678901" },
                    new ObjectProperty { Key = "Дата регистрации", Value = "10.01.2023" },
                    new ObjectProperty { Key = "Статус", Value = "В процессе ликвидации" },
                    new ObjectProperty { Key = "Отрасль", Value = "Строительство" },
                    new ObjectProperty { Key = "latitude", Value = "53.9000" },
                    new ObjectProperty { Key = "longitude", Value = "27.5667" }
                },
                Color = "#F44336", Icon = "🏚️", PositionX = 300, PositionY = 550
            };

            var investCorp = new GraphObject
            {
                Name = "ЗАО 'ГлобалИнвест'",
                ObjectTypeId = companyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "УНП", Value = "100234567" },
                    new ObjectProperty { Key = "Дата регистрации", Value = "05.05.2015" },
                    new ObjectProperty { Key = "Статус", Value = "Действующая" },
                    new ObjectProperty { Key = "Отрасль", Value = "Финансы" },
                    new ObjectProperty { Key = "latitude", Value = "55.7512" },
                    new ObjectProperty { Key = "longitude", Value = "37.6184" }
                },
                Color = "#1976D2", Icon = "🏦", PositionX = 900, PositionY = 450
            };

            var account4 = new GraphObject
            {
                Name = "RU04SBER30125555666677778888",
                ObjectTypeId = bankAccountType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Банк", Value = "Сбербанк" },
                    new ObjectProperty { Key = "Валюта", Value = "RUB" },
                    new ObjectProperty { Key = "Открыт", Value = "20.06.2021" }
                },
                Color = "#4CAF50", Icon = "💳", PositionX = 900, PositionY = 650
            };

            var tx4 = new GraphObject
            {
                Name = "Платёж #TRX-004",
                ObjectTypeId = transactionType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Сумма", Value = "5 000 000 RUB" },
                    new ObjectProperty { Key = "Назначение", Value = "Пополнение оборотных средств" },
                    new ObjectProperty { Key = "Дата", Value = "10.05.2023" }
                },
                Color = "#E91E63", Icon = "💸", PositionX = 900, PositionY = 850
            };

            var tx5 = new GraphObject
            {
                Name = "Платёж #TRX-005",
                ObjectTypeId = transactionType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Сумма", Value = "120 000 BYN" },
                    new ObjectProperty { Key = "Назначение", Value = "Оплата строительных материалов" },
                    new ObjectProperty { Key = "Дата", Value = "12.06.2023" }
                },
                Color = "#E91E63", Icon = "💸", PositionX = 300, PositionY = 950
            };

            var contract3 = new GraphObject
            {
                Name = "Договор займа №05/23",
                ObjectTypeId = documentType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Дата", Value = "05.05.2023" },
                    new ObjectProperty { Key = "Предмет", Value = "Беспроцентный займ" },
                    new ObjectProperty { Key = "Сумма", Value = "5 000 000 RUB" },
                    new ObjectProperty { Key = "Статус", Value = "Действующий" }
                },
                Color = "#FF9800", Icon = "📄", PositionX = 750, PositionY = 350
            };

            var countryHouse = new GraphObject
            {
                Name = "Коттедж в Раубичах",
                ObjectTypeId = propertyType.Id,
                Properties = new List<ObjectProperty>
                {
                    new ObjectProperty { Key = "Адрес", Value = "Минский р-н, д. Раубичи" },
                    new ObjectProperty { Key = "Площадь", Value = "350 кв.м" },
                    new ObjectProperty { Key = "Стоимость", Value = "450 000 USD" },
                    new ObjectProperty { Key = "Дата покупки", Value = "01.08.2023" }
                },
                Color = "#3F51B5", Icon = "🏡", PositionX = 950, PositionY = 0
            };

            context.GraphObjects.AddRange(
                investor, auditor, courier,
                newShell, investCorp,
                account4, tx4, tx5,
                contract3, countryHouse
            );
            await context.SaveChangesAsync();

            // 9. СВЯЗИ (с датами для Timeline!)
            var relations = new[]
            {
                // Организатор контролирует схему
                new GraphRelation
                {
                    Source = mastermind.Id, Target = nominee1.Id, RelationTypeId = controlsRelation.Id, Color = "#D32F2F",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "01.03.2021" },
                        new RelationProperty { Key = "Тип", Value = "Теневой контроль" }
                    }
                },
                new GraphRelation
                {
                    Source = mastermind.Id, Target = nominee2.Id, RelationTypeId = controlsRelation.Id, Color = "#D32F2F",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "05.07.2022" },
                        new RelationProperty { Key = "Тип", Value = "Теневой контроль" }
                    }
                },
                new GraphRelation
                {
                    Source = mastermind.Id, Target = accountant.Id, RelationTypeId = relatedToRelation.Id, Color = "#FFC107",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "15.03.2021" },
                        new RelationProperty { Key = "Связь", Value = "Сообщник" }
                    }
                },
                new GraphRelation
                {
                    Source = mastermind.Id, Target = lawyer.Id, RelationTypeId = relatedToRelation.Id, Color = "#9C27B0",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "01.02.2021" },
                        new RelationProperty { Key = "Связь", Value = "Юридическое сопровождение" }
                    }
                },
                new GraphRelation
                {
                    Source = mastermind.Id, Target = relative.Id, RelationTypeId = relatedToRelation.Id, Color = "#E91E63",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "10.06.1998" },
                        new RelationProperty { Key = "Связь", Value = "Брак" }
                    }
                },

                // Номинальные директора в компаниях
                new GraphRelation
                {
                    Source = nominee1.Id, Target = mainCompany.Id, RelationTypeId = worksForRelation.Id, Color = "#1976D2",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "12.03.2021" },
                        new RelationProperty { Key = "Должность", Value = "Директор" }
                    }
                },
                new GraphRelation
                {
                    Source = nominee1.Id, Target = shell1.Id, RelationTypeId = worksForRelation.Id, Color = "#F44336",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "05.07.2022" },
                        new RelationProperty { Key = "Должность", Value = "Директор" }
                    }
                },
                new GraphRelation
                {
                    Source = nominee2.Id, Target = shell2.Id, RelationTypeId = ownsRelation.Id, Color = "#F44336",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "18.11.2022" },
                        new RelationProperty { Key = "Доля", Value = "100%" }
                    }
                },
                new GraphRelation
                {
                    Source = mastermind.Id, Target = offshore.Id, RelationTypeId = controlsRelation.Id, Color = "#795548",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "23.01.2020" },
                        new RelationProperty { Key = "Тип", Value = "Бенефициар" }
                    }
                },

                // Компании и счета
                new GraphRelation
                {
                    Source = mainCompany.Id, Target = account1.Id, RelationTypeId = hasAccountRelation.Id, Color = "#4CAF50",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "15.03.2021" }
                    }
                },
                new GraphRelation
                {
                    Source = shell1.Id, Target = account2.Id, RelationTypeId = hasAccountRelation.Id, Color = "#4CAF50",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "10.07.2022" }
                    }
                },
                new GraphRelation
                {
                    Source = shell2.Id, Target = account3.Id, RelationTypeId = hasAccountRelation.Id, Color = "#4CAF50",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "25.11.2022" }
                    }
                },
                new GraphRelation
                {
                    Source = offshore.Id, Target = offshoreAccount.Id, RelationTypeId = hasAccountRelation.Id, Color = "#FF9800",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "01.02.2020" }
                    }
                },

                // Переводы средств (цепочка отмывания)
                new GraphRelation
                {
                    Source = account1.Id, Target = tx1.Id, RelationTypeId = transferRelation.Id, Color = "#E91E63",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "20.04.2023" },
                        new RelationProperty { Key = "Направление", Value = "Исходящий" }
                    }
                },
                new GraphRelation
                {
                    Source = tx1.Id, Target = account2.Id, RelationTypeId = transferRelation.Id, Color = "#E91E63",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "20.04.2023" },
                        new RelationProperty { Key = "Направление", Value = "Входящий" }
                    }
                },
                new GraphRelation
                {
                    Source = account2.Id, Target = tx2.Id, RelationTypeId = transferRelation.Id, Color = "#E91E63",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "15.06.2023" },
                        new RelationProperty { Key = "Направление", Value = "Исходящий" }
                    }
                },
                new GraphRelation
                {
                    Source = tx2.Id, Target = account3.Id, RelationTypeId = transferRelation.Id, Color = "#E91E63",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "15.06.2023" },
                        new RelationProperty { Key = "Направление", Value = "Входящий" }
                    }
                },
                new GraphRelation
                {
                    Source = account3.Id, Target = tx3.Id, RelationTypeId = transferRelation.Id, Color = "#E91E63",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "03.09.2023" },
                        new RelationProperty { Key = "Направление", Value = "Исходящий" }
                    }
                },
                new GraphRelation
                {
                    Source = tx3.Id, Target = offshoreAccount.Id, RelationTypeId = transferRelation.Id, Color = "#FF9800",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "03.09.2023" },
                        new RelationProperty { Key = "Направление", Value = "Вывод в оффшор" }
                    }
                },

                // Документы (фиктивные договоры)
                new GraphRelation
                {
                    Source = nominee1.Id, Target = contract1.Id, RelationTypeId = signedRelation.Id, Color = "#FF9800",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "10.04.2023" },
                        new RelationProperty { Key = "Роль", Value = "Исполнитель" }
                    }
                },
                new GraphRelation
                {
                    Source = accountant.Id, Target = contract1.Id, RelationTypeId = signedRelation.Id, Color = "#FF9800",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "10.04.2023" },
                        new RelationProperty { Key = "Роль", Value = "Гл. бухгалтер" }
                    }
                },
                new GraphRelation
                {
                    Source = nominee1.Id, Target = contract2.Id, RelationTypeId = signedRelation.Id, Color = "#FF9800",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "01.06.2023" },
                        new RelationProperty { Key = "Роль", Value = "Заказчик" }
                    }
                },

                // Имущество (приобретённое на средства схемы)
                new GraphRelation
                {
                    Source = relative.Id, Target = apartment.Id, RelationTypeId = ownsRelation.Id, Color = "#3F51B5",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "15.12.2023" },
                        new RelationProperty { Key = "Основание", Value = "Договор купли-продажи" }
                    }
                },
                new GraphRelation
                {
                    Source = mastermind.Id, Target = car.Id, RelationTypeId = ownsRelation.Id, Color = "#607D8B",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "20.10.2023" },
                        new RelationProperty { Key = "Основание", Value = "Договор лизинга" }
                    }
                },

                // Юрист оформлял документы
                new GraphRelation
                {
                    Source = lawyer.Id, Target = contract1.Id, RelationTypeId = signedRelation.Id, Color = "#9C27B0",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "10.04.2023" },
                        new RelationProperty { Key = "Роль", Value = "Юридическая экспертиза" }
                    }
                },
                new GraphRelation
                {
                    Source = lawyer.Id, Target = contract2.Id, RelationTypeId = signedRelation.Id, Color = "#9C27B0",
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "date", Value = "01.06.2023" },
                        new RelationProperty { Key = "Роль", Value = "Юридическая экспертиза" }
                    }
                }
            };

            var newRelations = new[]
            {
                new GraphRelation { Source = investor.Id, Target = investCorp.Id, RelationTypeId = ownsRelation.Id, Color = "#1976D2", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "05.05.2015" }, new RelationProperty { Key = "Доля", Value = "100%" } } },
                new GraphRelation { Source = investCorp.Id, Target = account4.Id, RelationTypeId = hasAccountRelation.Id, Color = "#4CAF50", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "20.06.2021" } } },
                new GraphRelation { Source = account4.Id, Target = tx4.Id, RelationTypeId = transferRelation.Id, Color = "#E91E63", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "10.05.2023" }, new RelationProperty { Key = "Направление", Value = "Исходящий" } } },
                new GraphRelation { Source = tx4.Id, Target = account1.Id, RelationTypeId = transferRelation.Id, Color = "#E91E63", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "10.05.2023" }, new RelationProperty { Key = "Направление", Value = "Входящий" } } },
                new GraphRelation { Source = investor.Id, Target = contract3.Id, RelationTypeId = signedRelation.Id, Color = "#FF9800", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "05.05.2023" }, new RelationProperty { Key = "Роль", Value = "Кредитор" } } },
                new GraphRelation { Source = mainCompany.Id, Target = contract3.Id, RelationTypeId = signedRelation.Id, Color = "#FF9800", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "05.05.2023" }, new RelationProperty { Key = "Роль", Value = "Заемщик" } } },
                new GraphRelation { Source = auditor.Id, Target = mainCompany.Id, RelationTypeId = worksForRelation.Id, Color = "#1976D2", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "01.04.2022" }, new RelationProperty { Key = "Должность", Value = "Независимый аудитор" } } },
                new GraphRelation { Source = courier.Id, Target = shell1.Id, RelationTypeId = worksForRelation.Id, Color = "#F44336", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "10.08.2022" }, new RelationProperty { Key = "Должность", Value = "Курьер" } } },
                new GraphRelation { Source = mastermind.Id, Target = newShell.Id, RelationTypeId = controlsRelation.Id, Color = "#D32F2F", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "10.01.2023" }, new RelationProperty { Key = "Тип", Value = "Теневой контроль" } } },
                new GraphRelation { Source = mastermind.Id, Target = countryHouse.Id, RelationTypeId = ownsRelation.Id, Color = "#3F51B5", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "01.08.2023" }, new RelationProperty { Key = "Доля", Value = "100%" } } },
                new GraphRelation { Source = account1.Id, Target = tx5.Id, RelationTypeId = transferRelation.Id, Color = "#E91E63", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "12.06.2023" }, new RelationProperty { Key = "Направление", Value = "Исходящий" } } },
                new GraphRelation { Source = tx5.Id, Target = account2.Id, RelationTypeId = transferRelation.Id, Color = "#E91E63", Properties = new List<RelationProperty> { new RelationProperty { Key = "date", Value = "12.06.2023" }, new RelationProperty { Key = "Направление", Value = "Входящий" } } }
            };

            context.GraphRelations.AddRange(relations);
            context.GraphRelations.AddRange(newRelations);
            await context.SaveChangesAsync();

            Console.WriteLine($"Fraud Investigation template created: {context.GraphObjects.Count()} objects, {context.GraphRelations.Count()} relations");
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
        /// Большой набор данных для тестирования (1000 объектов)
        /// </summary>
        private static async Task SeedLargeTemplateAsync(GraphDbContext context)
        {
            Console.WriteLine("Seeding large dataset with 1000 objects...");

            var random = new Random(42); // Фиксированное seed для воспроизводимости

            // 1. Создаем типы объектов
            var personType = new ObjectType { Name = "Персона", Description = "Человек" };
            var companyType = new ObjectType { Name = "Компания", Description = "Организация" };
            var projectType = new ObjectType { Name = "Проект", Description = "Проект" };
            var assetType = new ObjectType { Name = "Актив", Description = "Ресурс/Актив" };

            context.ObjectTypes.AddRange(personType, companyType, projectType, assetType);
            await context.SaveChangesAsync();

            // 1.5. Схемы свойств для типов объектов
            context.PropertySchemas.AddRange(
                new PropertySchema { ObjectTypeId = personType.Id, Key = "Возраст", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "Роль", PropertyType = "enum", Options = "[\"Developer\",\"Manager\",\"Analyst\",\"Architect\",\"Director\"]" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "Паспорт", PropertyType = "string" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "Опыт (лет)", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "latitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = personType.Id, Key = "longitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "УНП", PropertyType = "string", Required = true },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "Дата регистрации", PropertyType = "date" },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "Размер", PropertyType = "enum", Options = "[\"Small\",\"Medium\",\"Large\",\"Enterprise\"]" },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "latitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = companyType.Id, Key = "longitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = projectType.Id, Key = "Статус", PropertyType = "enum", Options = "[\"Planning\",\"Active\",\"Review\",\"Completed\"]" },
                new PropertySchema { ObjectTypeId = projectType.Id, Key = "Бюджет", PropertyType = "string" },
                new PropertySchema { ObjectTypeId = projectType.Id, Key = "Дата старта", PropertyType = "date" },
                new PropertySchema { ObjectTypeId = projectType.Id, Key = "latitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = projectType.Id, Key = "longitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = assetType.Id, Key = "Тип", PropertyType = "enum", Options = "[\"Server\",\"License\",\"Database\",\"API\",\"Tool\"]" },
                new PropertySchema { ObjectTypeId = assetType.Id, Key = "Стоимость", PropertyType = "string" },
                new PropertySchema { ObjectTypeId = assetType.Id, Key = "latitude", PropertyType = "number" },
                new PropertySchema { ObjectTypeId = assetType.Id, Key = "longitude", PropertyType = "number" }
            );
            await context.SaveChangesAsync();

            // 2. Создаем типы связей
            var worksAtRelation = new RelationType { Name = "Работает в", Description = "", ObjectTypeId = personType.Id };
            var ownedByRelation = new RelationType { Name = "Владеет", Description = "", ObjectTypeId = personType.Id };
            var managesRelation = new RelationType { Name = "Управляет", Description = "", ObjectTypeId = personType.Id };
            var partOfRelation = new RelationType { Name = "Часть от", Description = "", ObjectTypeId = companyType.Id };
            var relatedToRelation = new RelationType { Name = "Связан с", Description = "", ObjectTypeId = personType.Id };

            context.RelationTypes.AddRange(worksAtRelation, ownedByRelation, managesRelation, partOfRelation, relatedToRelation);
            await context.SaveChangesAsync();

            // 2.5. Схемы свойств для типов связей
            context.PropertySchemas.AddRange(
                new PropertySchema { RelationTypeId = worksAtRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = worksAtRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = worksAtRelation.Id, Key = "Должность", PropertyType = "string" },
                new PropertySchema { RelationTypeId = ownedByRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = ownedByRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = ownedByRelation.Id, Key = "Доля", PropertyType = "string" },
                new PropertySchema { RelationTypeId = managesRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = managesRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = partOfRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = partOfRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = relatedToRelation.Id, Key = "weight", PropertyType = "number", DefaultValue = "1" },
                new PropertySchema { RelationTypeId = relatedToRelation.Id, Key = "date", PropertyType = "date" },
                new PropertySchema { RelationTypeId = relatedToRelation.Id, Key = "Тип связи", PropertyType = "enum", Options = "[\"Коллега\",\"Друг\",\"Партнер\",\"Знакомый\"]" }
            );
            await context.SaveChangesAsync();

            // 3. Создаем объекты
            var objects = new List<GraphObject>();

            // Создаем компании (~100 компаний)
            var companies = new List<GraphObject>();
            string[] companyNames = new[] { "TechCorp", "DataFlow", "CloudVision", "NetMatic", "ByteHub", "InfoSys", "DevWorks", "AutoTrack", "MegaBuild", "QuickScale" };
            string[] companySuffixes = new[] { "Inc.", "LLC", "Ltd", "Corp", "Systems" };

            for (int i = 0; i < 100; i++)
            {
                var company = new GraphObject
                {
                    Name = $"{companyNames[i % 10]} {companySuffixes[i % 5]} #{i}",
                    ObjectTypeId = companyType.Id,
                    Color = $"#{random.Next(256):X2}{random.Next(256):X2}{random.Next(256):X2}",
                    Icon = "🏢",
                    PositionX = random.Next(0, 1000),
                    PositionY = random.Next(0, 800),
                    Properties = new List<ObjectProperty>
                    {
                        new ObjectProperty { Key = "УНП", Value = $"{random.Next(100000000, 999999999)}" },
                        new ObjectProperty { Key = "Дата регистрации", Value = $"{2010 + random.Next(15)}-{random.Next(1, 13):D2}-{random.Next(1, 29):D2}" },
                        new ObjectProperty { Key = "Размер", Value = new[] { "Small", "Medium", "Large", "Enterprise" }[random.Next(4)] },
                        new ObjectProperty { Key = "latitude", Value = (35.0 + random.NextDouble() * 40.0).ToString("F6").Replace(",", ".") },
                        new ObjectProperty { Key = "longitude", Value = (20.0 + random.NextDouble() * 160.0).ToString("F6").Replace(",", ".") }
                    }
                };
                companies.Add(company);
                objects.Add(company);
            }

            // Создаем людей (~650 людей)
            var people = new List<GraphObject>();
            string[] firstNames = new[] { "Александр", "Виктор", "Данила", "Евгений", "Федор", "Геор", "Иван", "Константин", "Лев", "Максим", "Николай", "Павел"};
            string[] lastNames = new[] { "Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Волков", "Соколов", "Лебедев", "Козлов", "Новиков", "Морозов", "Павлов" };
            string[] roles = new[] { "Developer", "Manager", "Analyst", "Architect", "Director", "Lead", "Specialist", "Consultant" };

            for (int i = 0; i < 650; i++)
            {
                var person = new GraphObject
                {
                    Name = $"{firstNames[random.Next(firstNames.Length)]} {lastNames[random.Next(lastNames.Length)]}",
                    ObjectTypeId = personType.Id,
                    Color = $"#{random.Next(256):X2}{random.Next(256):X2}{random.Next(256):X2}",
                    Icon = random.Next(2) == 0 ? "👤" : "👨",
                    PositionX = random.Next(0, 1000),
                    PositionY = random.Next(0, 800),
                    Properties = new List<ObjectProperty>
                    {
                        new ObjectProperty { Key = "Возраст", Value = random.Next(22, 65).ToString() },
                        new ObjectProperty { Key = "Роль", Value = roles[random.Next(roles.Length)] },
                        new ObjectProperty { Key = "Паспорт", Value = $"MP{random.Next(1000000, 9999999)}" },
                        new ObjectProperty { Key = "Опыт (лет)", Value = random.Next(1, 25).ToString() },
                        new ObjectProperty { Key = "latitude", Value = (35.0 + random.NextDouble() * 40.0).ToString("F6").Replace(",", ".") },
                        new ObjectProperty { Key = "longitude", Value = (20.0 + random.NextDouble() * 160.0).ToString("F6").Replace(",", ".") }
                    }
                };
                people.Add(person);
                objects.Add(person);
            }

            // Создаем проекты (~100 проектов)
            var projects = new List<GraphObject>();
            string[] projectNames = new[] { "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Sigma", "Omega", "Phoenix", "Atlas", "Horizon" };

            for (int i = 0; i < 100; i++)
            {
                var project = new GraphObject
                {
                    Name = $"{projectNames[i % 10]} Project #{i}",
                    ObjectTypeId = projectType.Id,
                    Color = $"#{random.Next(100, 200):X2}{random.Next(100, 200):X2}{random.Next(100, 200):X2}",
                    Icon = "📋",
                    PositionX = random.Next(0, 1000),
                    PositionY = random.Next(0, 800),
                    Properties = new List<ObjectProperty>
                    {
                        new ObjectProperty { Key = "Статус", Value = new[] { "Planning", "Active", "Review", "Completed" }[random.Next(4)] },
                        new ObjectProperty { Key = "Бюджет", Value = $"{random.Next(10, 1000)}k USD" },
                        new ObjectProperty { Key = "Дата старта", Value = $"{2020 + random.Next(5)}-{random.Next(1, 13):D2}-{random.Next(1, 29):D2}" },
                        new ObjectProperty { Key = "latitude", Value = (35.0 + random.NextDouble() * 40.0).ToString("F6").Replace(",", ".") },
                        new ObjectProperty { Key = "longitude", Value = (20.0 + random.NextDouble() * 160.0).ToString("F6").Replace(",", ".") }
                    }
                };
                projects.Add(project);
                objects.Add(project);
            }

            // Создаем активы (~50 активов)
            var assets = new List<GraphObject>();
            string[] assetTypes = new[] { "Server", "License", "Database", "API", "Tool", "Library", "Storage", "Network" };

            for (int i = 0; i < 50; i++)
            {
                var asset = new GraphObject
                {
                    Name = $"{assetTypes[i % assetTypes.Length]} #{i}",
                    ObjectTypeId = assetType.Id,
                    Color = "#FFB300",
                    Icon = "💾",
                    PositionX = random.Next(0, 1000),
                    PositionY = random.Next(0, 800),
                    Properties = new List<ObjectProperty>
                    {
                        new ObjectProperty { Key = "Тип", Value = assetTypes[random.Next(assetTypes.Length)] },
                        new ObjectProperty { Key = "Стоимость", Value = $"${random.Next(100, 100000)}" },
                        new ObjectProperty { Key = "latitude", Value = (35.0 + random.NextDouble() * 40.0).ToString("F6").Replace(",", ".") },
                        new ObjectProperty { Key = "longitude", Value = (20.0 + random.NextDouble() * 160.0).ToString("F6").Replace(",", ".") }
                    }
                };
                assets.Add(asset);
                objects.Add(asset);
            }

            context.GraphObjects.AddRange(objects);
            await context.SaveChangesAsync();

            // 4. Создаем связи
            var relations = new List<GraphRelation>();

            // Люди работают в компаниях
            for (int i = 0; i < 500; i++)
            {
                var person = people[random.Next(people.Count)];
                var company = companies[random.Next(companies.Count)];

                relations.Add(new GraphRelation
                {
                    Source = person.Id,
                    Target = company.Id,
                    RelationTypeId = worksAtRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "weight", Value = random.Next(1, 5).ToString() },
                        new RelationProperty { Key = "date", Value = $"{2015 + random.Next(10)}-{random.Next(1, 13):D2}-{random.Next(1, 29):D2}" },
                        new RelationProperty { Key = "Должность", Value = new[] { "Developer", "Manager", "Analyst", "Engineer" }[random.Next(4)] }
                    }
                });
            }

            // Люди управляют компаниями
            for (int i = 0; i < 80; i++)
            {
                var person = people[random.Next(people.Count)];
                var company = companies[random.Next(companies.Count)];

                relations.Add(new GraphRelation
                {
                    Source = person.Id,
                    Target = company.Id,
                    RelationTypeId = managesRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "weight", Value = random.Next(3, 10).ToString() },
                        new RelationProperty { Key = "date", Value = $"{2018 + random.Next(7)}-{random.Next(1, 13):D2}-{random.Next(1, 29):D2}" }
                    }
                });
            }

            // Люди владеют активами
            for (int i = 0; i < 100; i++)
            {
                var person = people[random.Next(people.Count)];
                var asset = assets[random.Next(assets.Count)];

                relations.Add(new GraphRelation
                {
                    Source = person.Id,
                    Target = asset.Id,
                    RelationTypeId = ownedByRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "weight", Value = random.Next(1, 8).ToString() },
                        new RelationProperty { Key = "date", Value = $"{2019 + random.Next(6)}-{random.Next(1, 13):D2}-{random.Next(1, 29):D2}" },
                        new RelationProperty { Key = "Доля", Value = $"{random.Next(10, 100)}%" }
                    }
                });
            }

            // Компании связаны между собой
            for (int i = 0; i < 120; i++)
            {
                var company1 = companies[random.Next(companies.Count)];
                var company2 = companies[random.Next(companies.Count)];

                if (company1.Id != company2.Id)
                {
                    relations.Add(new GraphRelation
                    {
                        Source = company1.Id,
                        Target = company2.Id,
                        RelationTypeId = partOfRelation.Id,
                        Properties = new List<RelationProperty>
                        {
                            new RelationProperty { Key = "weight", Value = random.Next(2, 15).ToString() },
                            new RelationProperty { Key = "date", Value = $"{2017 + random.Next(8)}-{random.Next(1, 13):D2}-{random.Next(1, 29):D2}" }
                        }
                    });
                }
            }

            // Люди связаны между собой
            for (int i = 0; i < 200; i++)
            {
                var person1 = people[random.Next(people.Count)];
                var person2 = people[random.Next(people.Count)];

                if (person1.Id != person2.Id)
                {
                    relations.Add(new GraphRelation
                    {
                        Source = person1.Id,
                        Target = person2.Id,
                        RelationTypeId = relatedToRelation.Id,
                        Properties = new List<RelationProperty>
                        {
                            new RelationProperty { Key = "weight", Value = random.Next(1, 5).ToString() },
                            new RelationProperty { Key = "date", Value = $"{2016 + random.Next(9)}-{random.Next(1, 13):D2}-{random.Next(1, 29):D2}" },
                            new RelationProperty { Key = "Тип связи", Value = new[] { "Коллега", "Друг", "Партнер", "Знакомый" }[random.Next(4)] }
                        }
                    });
                }
            }

            // Проекты связаны с компаниями
            for (int i = 0; i < 80; i++)
            {
                var project = projects[random.Next(projects.Count)];
                var company = companies[random.Next(companies.Count)];

                relations.Add(new GraphRelation
                {
                    Source = company.Id,
                    Target = project.Id,
                    RelationTypeId = managesRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "weight", Value = random.Next(2, 12).ToString() },
                        new RelationProperty { Key = "date", Value = $"{2020 + random.Next(5)}-{random.Next(1, 13):D2}-{random.Next(1, 29):D2}" }
                    }
                });
            }

            // Проекты используют активы
            for (int i = 0; i < 60; i++)
            {
                var project = projects[random.Next(projects.Count)];
                var asset = assets[random.Next(assets.Count)];

                relations.Add(new GraphRelation
                {
                    Source = project.Id,
                    Target = asset.Id,
                    RelationTypeId = partOfRelation.Id,
                    Properties = new List<RelationProperty>
                    {
                        new RelationProperty { Key = "weight", Value = random.Next(1, 6).ToString() },
                        new RelationProperty { Key = "date", Value = $"{2021 + random.Next(4)}-{random.Next(1, 13):D2}-{random.Next(1, 29):D2}" }
                    }
                });
            }

            context.GraphRelations.AddRange(relations);
            await context.SaveChangesAsync();

            Console.WriteLine($"Large template created: {objects.Count} objects, {relations.Count} relations");
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
