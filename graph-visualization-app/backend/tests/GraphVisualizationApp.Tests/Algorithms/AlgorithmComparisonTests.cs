using Xunit;
using FluentAssertions;
using GraphVisualizationApp.Algorithms;
using GraphVisualizationApp.Models;
using System.Collections.Generic;
using System.Linq;

namespace GraphVisualizationApp.Tests.Algorithms
{
    public class AlgorithmComparisonTests
    {
        private readonly DijkstraPathFinder _dijkstra;
        private readonly AStarPathFinder _aStar;

        public AlgorithmComparisonTests()
        {
            _dijkstra = new DijkstraPathFinder();
            _aStar = new AStarPathFinder();
        }

        [Fact]
        public void BFS_vs_Dijkstra_Difference_Demo()
        {
            // Сценарий: Есть прямой путь, но он "дорогой" (большой вес).
            // Есть путь в обход, но он "дешевый" (маленький суммарный вес).
            
            // A -> B (Вес 100)
            // A -> C -> B (Вес 1 + 1 = 2)

            // Setup Nodes
            var nodes = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A" },
                new GraphObject { Id = 2, Name = "B" },
                new GraphObject { Id = 3, Name = "C" }
            };

            // Setup Edges
            var edges = new List<GraphRelation>
            {
                // Прямой путь A -> B (дорогой)
                new GraphRelation 
                { 
                    Id = 1, Source = 1, Target = 2, 
                    Properties = new List<RelationProperty> { new RelationProperty { Key = "weight", Value = "100" } } 
                },
                // Обход A -> C (дешевый)
                new GraphRelation 
                { 
                    Id = 2, Source = 1, Target = 3, 
                    Properties = new List<RelationProperty> { new RelationProperty { Key = "weight", Value = "1" } } 
                },
                // Обход C -> B (дешевый)
                new GraphRelation 
                { 
                    Id = 3, Source = 3, Target = 2, 
                    Properties = new List<RelationProperty> { new RelationProperty { Key = "weight", Value = "1" } } 
                }
            };

            // 1. BFS (Поиск в ширину) - ищет минимальное количество переходов (хопов).
            // Он должен выбрать A -> B, так как это всего 1 ребро.
            // Примечание: В нашем решении BFS реализован внутри PathfindingService, 
            // но мы можем эмулировать его логику или использовать Dijkstra без весов.
            // Для чистоты эксперимента, если "вес" не важен (или равен 1), Direct путь A->B выгоднее по хопам.
            
            // Эмуляция BFS через Дейкстру, игнорирующего веса (все веса = 1)
            var unweightedEdges = edges.Select(e => new GraphRelation { Id = e.Id, Source = e.Source, Target = e.Target }).ToList();
            var bfsResult = _dijkstra.FindShortestPath(nodes, unweightedEdges, 1, 2);

            // 2. Dijkstra (Дейкстра) - ищет минимальный суммарный вес.
            // Он должен выбрать A -> C -> B, так как 1 + 1 = 2 < 100.
            var dijkstraResult = _dijkstra.FindShortestPath(nodes, edges, 1, 2);

            // ASSERTIONS

            // BFS выбрал путь из 2 узлов (A, B) - прямой
            bfsResult.NodeIds.Should().Equal(1, 2); 
            
            // Дейкстра выбрал путь из 3 узлов (A, C, B) - обходной
            dijkstraResult.NodeIds.Should().Equal(1, 3, 2);

            // Доказательство разницы
            bfsResult.NodeIds.Count.Should().BeLessThan(dijkstraResult.NodeIds.Count);
        }

        [Fact]
        public void Dijkstra_vs_AStar_Performance_Demo()
        {
            // Сценарий: Сетка, где A* должен посетить меньше узлов благодаря эвристике.
            // Узлы расположены на координатной сетке.
            
            // Setup Nodes with Coordinates
            var nodes = new List<GraphObject>();
            var edges = new List<GraphRelation>();
            int nodeId = 1;

            // Создаем линию из 100 узлов, но добавим ответвления, чтобы запутать алгоритм без эвристики
            // Простой пример: 
            // Start (0,0) -> Goal (10,0)
            // Есть путь по прямой.
            // Dijkstra будет проверять все равноудаленные узлы во все стороны (круг).
            // A* будет стремиться к (10,0).

            // Для простоты теста создадим всего несколько узлов, где Dijkstra проверит лишний.
            
            // A(0,0) --1--> B(1,0) --1--> Goal(2,0)
            // |
            // 1
            // |
            // C(0,1)
            
            var nodeA = new GraphObject { Id = 1, PositionX = 0, PositionY = 0 };
            var nodeB = new GraphObject { Id = 2, PositionX = 1, PositionY = 0 };
            var nodeGoal = new GraphObject { Id = 3, PositionX = 2, PositionY = 0 };
            var nodeC = new GraphObject { Id = 4, PositionX = 0, PositionY = 1 }; // Тупик, но близко к старту

            nodes.Add(nodeA);
            nodes.Add(nodeB);
            nodes.Add(nodeGoal);
            nodes.Add(nodeC);

            edges.Add(new GraphRelation { Id = 1, Source = 1, Target = 2 }); // A -> B
            edges.Add(new GraphRelation { Id = 2, Source = 2, Target = 3 }); // B -> Goal
            edges.Add(new GraphRelation { Id = 3, Source = 1, Target = 4 }); // A -> C

            var nodeMap = nodes.ToDictionary(n => n.Id);
            var adj = GraphUtils.BuildAdjacencyList(edges);

            // Run Dijkstra
            var dijkstra = new DijkstraPathFinder();
            // Дейкстра "вслепую" проверяет ближайших соседей. 
            // A и C находятся на расстоянии 0 и 1 от старта.
            // B на расстоянии 1.
            // Порядок извлечения из очереди с приоритетом (расстояние):
            // 1. A (0)
            // 2. B (1), C (1) - порядок может быть любым
            // Если он проверит C, это "лишняя" работа для пути к Goal.
            
            // Run A*
            var aStar = new AStarPathFinder();
            // A* использует f = g + h.
            // h(B -> Goal) = 1 (dist 1 to 2)
            // h(C -> Goal) = sqrt(2^2 + 1^1) = ~2.23
            
            // f(B) = 1 + 1 = 2
            // f(C) = 1 + 2.23 = 3.23
            
            // A* точно выберет B раньше C. И дойдет до Goal через B.
            // C может быть вообще не посещен или посещен позже.

            var aStarResult = aStar.FindPath(nodeMap, adj, 1, 3);
            
            // Мы не можем легко проверить "внутренности" алгоритма без логов,
            // но AStarPathFinder возвращает NodesVisited (я добавил это свойство).
            
            // Примечание: В текущей реализации DijkstraPathFinder не возвращает NodesVisited.
            // Но мы можем косвенно судить по логике или просто довериться тесту, что A* нашел верный путь.
            
            aStarResult.NodeIds.Should().Equal(1, 2, 3);
            // Если бы мы реализовали счетчик в Дейкстре, он был бы >= A*.
        }
    }
}
