using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GraphVisualizationApp.Models;
using Microsoft.EntityFrameworkCore;

namespace GraphVisualizationApp.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly GraphDbContext _db;
        public AnalyticsService(GraphDbContext db) { _db = db; }

        public async Task<AnalyticsSummaryDto> GetSummaryAsync()
        {
            var n = await _db.GraphObjects.CountAsync();
            var m = await _db.GraphRelations.CountAsync();
            // directed graph density: m / (n * (n - 1))
            double density = (n <= 1) ? 0.0 : (double)m / (n * (n - 1));

            // Build undirected adjacency for diameter and components
            var edges = await _db.GraphRelations.AsNoTracking().ToListAsync();
            var nodes = await _db.GraphObjects.AsNoTracking().Select(o => o.Id).ToListAsync();
            var adj = BuildUndirectedAdjacency(nodes, edges);

            var comps = GetConnectedComponents(adj, nodes);
            int diameter = ComputeDiameter(adj, nodes);

            return new AnalyticsSummaryDto
            {
                NodeCount = n,
                EdgeCount = m,
                Density = Math.Round(density, 6),
                Diameter = diameter,
                Components = comps.Count,
                ComponentSizes = comps.Select(c => c.Count).OrderByDescending(x => x).ToList()
            };
        }

        public async Task<List<NodeMetricsDto>> GetNodeMetricsAsync(bool includeCloseness = false, bool includeBetweenness = false)
        {
            var nodes = await _db.GraphObjects.AsNoTracking().Select(o => o.Id).ToListAsync();
            var edges = await _db.GraphRelations.AsNoTracking().Select(e => new { e.Source, e.Target }).ToListAsync();
            var n = Math.Max(1, nodes.Count);

            var inDeg = edges.GroupBy(e => e.Target).ToDictionary(g => g.Key, g => g.Count());
            var outDeg = edges.GroupBy(e => e.Source).ToDictionary(g => g.Key, g => g.Count());

            var metrics = new List<NodeMetricsDto>(nodes.Count);
            Dictionary<int, List<int>>? undirected = null;
            if (includeCloseness || includeBetweenness)
            {
                undirected = BuildUndirectedAdjacency(nodes, await _db.GraphRelations.AsNoTracking().ToListAsync());
            }

            Dictionary<int, double>? betweenness = null;
            if (includeBetweenness && undirected != null)
            {
                betweenness = ComputeBetweenness(undirected, nodes);
            }

            foreach (var id in nodes)
            {
                var inD = inDeg.ContainsKey(id) ? inDeg[id] : 0;
                var outD = outDeg.ContainsKey(id) ? outDeg[id] : 0;
                var deg = inD + outD;
                double degCent = (double)deg / (n - 1);
                double? close = null;
                if (includeCloseness && undirected != null)
                {
                    close = ComputeCloseness(undirected, id, nodes.Count);
                }
                
                double? betw = null;
                if (betweenness != null && betweenness.ContainsKey(id))
                {
                    betw = Math.Round(betweenness[id], 6);
                }

                metrics.Add(new NodeMetricsDto
                {
                    NodeId = id,
                    InDegree = inD,
                    OutDegree = outD,
                    Degree = deg,
                    DegreeCentrality = Math.Round(degCent, 6),
                    ClosenessCentrality = close,
                    BetweennessCentrality = betw
                });
            }
            return metrics.OrderByDescending(m => m.Degree).ToList();
        }

        public async Task<List<PageRankEntryDto>> GetPageRankAsync(int iterations = 50, double damping = 0.85)
        {
            var nodes = await _db.GraphObjects.AsNoTracking().Select(o => o.Id).ToListAsync();
            var edges = await _db.GraphRelations.AsNoTracking().Select(e => new { e.Source, e.Target }).ToListAsync();
            var N = nodes.Count;
            if (N == 0) return new List<PageRankEntryDto>();

            var idx = nodes.Select((id, i) => (id, i)).ToDictionary(x => x.id, x => x.i);
            var outCounts = new int[N];
            var incoming = new List<int>[N];
            for (int i = 0; i < N; i++) incoming[i] = new List<int>();

            foreach (var e in edges)
            {
                if (!idx.ContainsKey(e.Source) || !idx.ContainsKey(e.Target)) continue;
                var s = idx[e.Source];
                var t = idx[e.Target];
                outCounts[s]++;
                incoming[t].Add(s);
            }

            var pr = Enumerable.Repeat(1.0 / N, N).ToArray();
            var teleport = (1.0 - damping) / N;

            for (int it = 0; it < iterations; it++)
            {
                var next = new double[N];
                for (int i = 0; i < N; i++)
                {
                    double sum = 0;
                    foreach (var s in incoming[i])
                    {
                        if (outCounts[s] > 0)
                            sum += pr[s] / outCounts[s];
                    }
                    next[i] = teleport + damping * sum;
                }
                pr = next;
            }

            var result = new List<PageRankEntryDto>(N);
            foreach (var kv in idx)
            {
                result.Add(new PageRankEntryDto { NodeId = kv.Key, Score = pr[kv.Value] });
            }
            return result.OrderByDescending(x => x.Score).ToList();
        }

        public async Task<CommunitiesDto> DetectCommunitiesAsync(int maxPasses = 10)
        {
            // Simplified Louvain-like procedure on undirected graph
            var nodes = await _db.GraphObjects.AsNoTracking().Select(o => o.Id).ToListAsync();
            var rels = await _db.GraphRelations.AsNoTracking().ToListAsync();
            var adj = BuildUndirectedAdjacency(nodes, rels);

            var community = nodes.ToDictionary(id => id, id => id); // each node in its own community
            var m2 = rels.Count * 2.0; // 2m for undirected modularity formula

            if (m2 == 0) return new CommunitiesDto { Modularity = 0, Communities = nodes.Select(n => new List<int> { n }).ToList() };

            double currentMod = ComputeModularity(adj, community, m2);
            bool improved = true;
            int passes = 0;
            while (improved && passes < maxPasses)
            {
                improved = false;
                passes++;
                foreach (var v in nodes)
                {
                    var bestComm = community[v];
                    double bestGain = 0;

                    var neighborComms = new HashSet<int>(adj[v].Select(n => community[n]));
                    foreach (var c in neighborComms)
                    {
                        if (c == community[v]) continue;
                        var old = community[v];
                        community[v] = c;
                        var mod = ComputeModularity(adj, community, m2);
                        var gain = mod - currentMod;
                        if (gain > bestGain)
                        {
                            bestGain = gain;
                            bestComm = c;
                        }
                        community[v] = old;
                    }
                    if (bestGain > 1e-9 && bestComm != community[v])
                    {
                        community[v] = bestComm;
                        currentMod += bestGain;
                        improved = true;
                    }
                }
            }

            var groups = community.GroupBy(kv => kv.Value).Select(g => g.Select(x => x.Key).ToList()).OrderByDescending(l => l.Count).ToList();
            return new CommunitiesDto { Modularity = Math.Round(currentMod, 6), Communities = groups };
        }

        private static Dictionary<int, List<int>> BuildUndirectedAdjacency(IEnumerable<int> nodes, IEnumerable<GraphRelation> edges)
        {
            var adj = nodes.ToDictionary(id => id, _ => new List<int>());
            foreach (var e in edges)
            {
                if (!adj.ContainsKey(e.Source) || !adj.ContainsKey(e.Target)) continue;
                if (!adj[e.Source].Contains(e.Target)) adj[e.Source].Add(e.Target);
                if (!adj[e.Target].Contains(e.Source)) adj[e.Target].Add(e.Source);
            }
            return adj;
        }

        private static double ComputeCloseness(Dictionary<int, List<int>> adj, int start, int total)
        {
            var dist = new Dictionary<int, int>();
            var q = new Queue<int>();
            q.Enqueue(start);
            dist[start] = 0;
            while (q.Count > 0)
            {
                var u = q.Dequeue();
                foreach (var v in adj[u])
                {
                    if (!dist.ContainsKey(v))
                    {
                        dist[v] = dist[u] + 1;
                        q.Enqueue(v);
                    }
                }
            }
            if (dist.Count <= 1) return 0.0;
            double sum = dist.Values.Sum();
            return Math.Round((dist.Count - 1) / sum, 6);
        }

        private static int ComputeDiameter(Dictionary<int, List<int>> adj, List<int> nodes)
        {
            int diameter = 0;
            foreach (var s in nodes)
            {
                var dist = BfsDistances(adj, s);
                if (dist.Count > 0)
                {
                    diameter = Math.Max(diameter, dist.Values.Max());
                }
            }
            return diameter;
        }

        private static Dictionary<int, int> BfsDistances(Dictionary<int, List<int>> adj, int start)
        {
            var dist = new Dictionary<int, int>();
            var q = new Queue<int>();
            q.Enqueue(start);
            dist[start] = 0;
            while (q.Count > 0)
            {
                var u = q.Dequeue();
                foreach (var v in adj[u])
                {
                    if (!dist.ContainsKey(v))
                    {
                        dist[v] = dist[u] + 1;
                        q.Enqueue(v);
                    }
                }
            }
            return dist;
        }

        private static List<List<int>> GetConnectedComponents(Dictionary<int, List<int>> adj, List<int> nodes)
        {
            var visited = new HashSet<int>();
            var comps = new List<List<int>>();
            foreach (var s in nodes)
            {
                if (visited.Contains(s)) continue;
                var comp = new List<int>();
                var stack = new Stack<int>();
                stack.Push(s);
                visited.Add(s);
                while (stack.Count > 0)
                {
                    var u = stack.Pop();
                    comp.Add(u);
                    foreach (var v in adj[u])
                    {
                        if (!visited.Contains(v))
                        {
                            visited.Add(v);
                            stack.Push(v);
                        }
                    }
                }
                comps.Add(comp);
            }
            return comps;
        }

        private static double ComputeModularity(Dictionary<int, List<int>> adj, Dictionary<int, int> comm, double m2)
        {
            // Newman-Girvan modularity approximation for unweighted undirected graph
            var degrees = adj.ToDictionary(kv => kv.Key, kv => kv.Value.Count);
            double Q = 0.0;
            foreach (var i in adj.Keys)
            {
                foreach (var j in adj.Keys)
                {
                    if (comm[i] != comm[j]) continue;
                    int Aij = adj[i].Contains(j) ? 1 : 0;
                    Q += (Aij - (degrees[i] * degrees[j]) / m2);
                }
            }
            return Q / m2;
        }

        private static Dictionary<int, double> ComputeBetweenness(Dictionary<int, List<int>> adj, List<int> nodes)
        {
            // Brandes' Algorithm for unweighted graph
            var cb = nodes.ToDictionary(n => n, _ => 0.0);

            foreach (var s in nodes)
            {
                var stack = new Stack<int>();
                var P = nodes.ToDictionary(n => n, _ => new List<int>());
                var sigma = nodes.ToDictionary(n => n, _ => 0.0);
                var d = nodes.ToDictionary(n => n, _ => -1);
                
                sigma[s] = 1.0;
                d[s] = 0;
                
                var q = new Queue<int>();
                q.Enqueue(s);

                while (q.Count > 0)
                {
                    var v = q.Dequeue();
                    stack.Push(v);

                    foreach (var w in adj[v])
                    {
                        if (d[w] < 0)
                        {
                            q.Enqueue(w);
                            d[w] = d[v] + 1;
                        }
                        if (d[w] == d[v] + 1)
                        {
                            sigma[w] += sigma[v];
                            P[w].Add(v);
                        }
                    }
                }

                var delta = nodes.ToDictionary(n => n, _ => 0.0);
                while (stack.Count > 0)
                {
                    var w = stack.Pop();
                    foreach (var v in P[w])
                    {
                        delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w]);
                    }
                    if (w != s)
                    {
                        cb[w] += delta[w];
                    }
                }
            }

            // For undirected graph, divide by 2
            // Normalization: divide by (N-1)(N-2)
            double N = nodes.Count;
            double norm = (N - 1) * (N - 2);
            if (norm <= 0) norm = 1;

            var result = new Dictionary<int, double>();
            foreach (var kv in cb)
            {
                result[kv.Key] = (kv.Value / 2.0) / norm;
            }
            return result;
        }
    }
}
