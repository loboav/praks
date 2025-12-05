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

            context.GraphRelations.AddRange(relations);
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
