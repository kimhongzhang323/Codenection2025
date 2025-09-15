package com.example.AutoDocX.service;

import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphLink;
import com.example.AutoDocX.parser.model.GraphNode;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Community detection for Graph nodes using:
 *  - Louvain (multi-level modularity optimization; undirected projection)
 *  - Label Propagation (fast baseline)
 *
 * Notes:
 *  - We project the directed graph into an undirected weighted graph (sum of both directions).
 *  - Self-loops are ignored.
 *  - You can filter which link types are considered.
 */
@Service
public class GraphClusteringService {

    // ------------------------ Public API ------------------------

    /**
     * Assigns clusters to nodes by running the selected algorithm.
     * clusterId format: "<ALGO>:<level>:<communityId>"
     */
    public void assignClusters(
            Graph graph,
            Set<GraphLink.LinkType> edgeTypesToUse,
            int maxIterations
    ) {
        // Build undirected weighted adjacency
        UndirectedGraph ug = buildUndirected(graph, edgeTypesToUse);

        Map<String, Integer> community = louvain(ug, maxIterations);

        // Write back cluster IDs to nodes
        // Normalize to contiguous community ids
        Map<Integer, Integer> remap = remapCommunities(community.values());
        for (GraphNode node : graph.getNodes()) {
            Integer c = community.get(node.getId());
            if (c == null) {
                node.setClusterId("-1");
            } else {
                node.setClusterId("" + remap.get(c));
            }
        }
    }

    // ------------------------ Label Propagation ------------------------

    /**
     * Simple asynchronous Label Propagation Algorithm (Raghavan et al.).
     * Each node adopts the most frequent label among its neighbors.
     */
    private Map<String, Integer> labelPropagation(UndirectedGraph ug, int maxIterations, Long seed) {
        List<String> nodes = new ArrayList<>(ug.nodes());
        Map<String, Integer> label = new HashMap<>();
        // init labels to unique ids
        for (int i = 0; i < nodes.size(); i++) {
            label.put(nodes.get(i), i);
        }

        Random rnd = (seed == null) ? ThreadLocalRandom.current() : new Random(seed);

        for (int it = 0; it < Math.max(1, maxIterations); it++) {
            // random order update (asynchronous LPA typically converges faster)
            Collections.shuffle(nodes, rnd);
            boolean changed = false;

            for (String u : nodes) {
                Map<Integer, Double> freq = new HashMap<>();
                Map<String, Double> nbrs = ug.neighbors(u);
                if (nbrs == null || nbrs.isEmpty()) continue;

                for (Map.Entry<String, Double> e : nbrs.entrySet()) {
                    String v = e.getKey();
                    double w = e.getValue();
                    Integer lbl = label.get(v);
                    if (lbl == null) continue;
                    freq.merge(lbl, w, Double::sum);
                }

                if (!freq.isEmpty()) {
                    int bestLabel = argMax(freq);
                    if (bestLabel != label.get(u)) {
                        label.put(u, bestLabel);
                        changed = true;
                    }
                }
            }

            if (!changed) break; // converged
        }
        return label;
    }

    // ------------------------ Louvain ------------------------

    /**
     * Louvain (Blondel et al., 2008).
     * Multi-level modularity optimization:
     *   - Phase 1: locally move nodes to maximize modularity gain
     *   - Phase 2: aggregate communities into super-nodes and repeat
     *
     * We stop when no improvement or iterations exhausted.
     */
    private Map<String, Integer> louvain(UndirectedGraph ug, int maxIterations) {
        // Initial community: each node in its own community
        Map<String, Integer> node2comm = new HashMap<>();
        int cid = 0;
        for (String n : ug.nodes()) node2comm.put(n, cid++);

        UndirectedGraph current = ug;
        Map<String, Integer> currentAssignment = new HashMap<>(node2comm);

        double prevMod = modularity(current, currentAssignment);
        int level = 0;

        for (int outer = 0; outer < Math.max(1, maxIterations); outer++) {
            boolean improved = louvainPhase1(current, currentAssignment);
            double newMod = modularity(current, currentAssignment);

            if (!improved || newMod <= prevMod + 1e-12) {
                break;
            }

            // Phase 2: aggregate
            AggregationResult agg = aggregate(current, currentAssignment);
            current = agg.superGraph;
            currentAssignment = agg.superAssignment;
            prevMod = newMod;
            level++;
        }

        // Map back super-communities to original nodes if necessary
        // Here currentAssignment is at the final level. We need a flat mapping of original nodes to final community.
        // We tracked mappings inside aggregate(); rebuild final mapping:
        Map<String, Integer> finalAssignment = new HashMap<>();
        // Walk the chain of aggregations stored in ug.originalNodes map
        // However, we kept original node ids only in the first ug. To keep it simple:
        // We'll propagate communities down using the recorded "superNodeMembers" composed during aggregate().
        // For simplicity, we stored "membership" in UndirectedGraph; so we always maintain node->members
        // In our implementation, aggregate() ensures superGraph carries original members sets.

        // final map: for each super node, assign its community id to all original members
        Map<String, Set<String>> members = current.membership(); // super node -> original members
        for (Map.Entry<String, Set<String>> e : members.entrySet()) {
            String superNode = e.getKey();
            Integer community = currentAssignment.get(superNode);
            if (community == null) continue;
            for (String orig : e.getValue()) {
                finalAssignment.put(orig, community);
            }
        }
        return finalAssignment;
    }

    /**
     * Phase 1 of Louvain: locally move nodes to neighboring communities if it increases modularity.
     * Returns true if any move happened.
     */
    private boolean louvainPhase1(UndirectedGraph ug, Map<String, Integer> assignment) {
        boolean moved = false;
        double m2 = 2.0 * ug.totalWeight; // 2m

        // Precompute community degrees and internal weights
        // community -> sum of degrees (tot)
        Map<Integer, Double> commTot = computeCommunityTotals(ug, assignment);

        // Node order (randomized improves escape from local minima)
        List<String> nodes = new ArrayList<>(ug.nodes());
        Collections.shuffle(nodes, ThreadLocalRandom.current());

        boolean localMoved;
        int safety = 0;
        do {
            localMoved = false;
            for (String node : nodes) {
                int c0 = assignment.get(node);
                double k_i = ug.degree(node);

                // Remove node from its current community totals
                double k_i_in_c0 = sumWeightsToCommunity(ug, node, c0, assignment);
                commTot.merge(c0, -k_i, Double::sum);

                // Best gain search
                int bestComm = c0;
                double bestGain = 0.0;

                // Consider neighbor communities
                Set<Integer> neighborComms = neighborCommunities(ug, node, assignment);
                for (int c : neighborComms) {
                    double k_i_in = sumWeightsToCommunity(ug, node, c, assignment);
                    double tot_c = commTot.getOrDefault(c, 0.0);

                    // ΔQ = [ (k_i_in / m) - (k_i * tot_c) / (2m^2) ] * 2?  Use standard Louvain delta:
                    // Using resolution=1:
                    // ΔQ = (k_i_in - (k_i * tot_c) / (2m))
                    double gain = k_i_in - (k_i * tot_c) / m2;
                    if (gain > bestGain) {
                        bestGain = gain;
                        bestComm = c;
                    }
                }

                // Move if beneficial
                if (bestComm != c0 && bestGain > 1e-12) {
                    assignment.put(node, bestComm);
                    commTot.merge(bestComm, k_i, Double::sum);
                    localMoved = true;
                    moved = true;
                } else {
                    // put back
                    commTot.merge(c0, k_i, Double::sum);
                }
            }
        } while (localMoved && ++safety < 20 * nodes.size()); // safety cap

        return moved;
    }

    private Map<Integer, Double> computeCommunityTotals(UndirectedGraph ug, Map<String, Integer> assignment) {
        Map<Integer, Double> commTot = new HashMap<>();
        for (String u : ug.nodes()) {
            int c = assignment.get(u);
            commTot.merge(c, ug.degree(u), Double::sum);
        }
        return commTot;
    }

    private Set<Integer> neighborCommunities(UndirectedGraph ug, String node, Map<String, Integer> assignment) {
        Map<String, Double> nbrs = ug.neighbors(node);
        if (nbrs == null) return Collections.emptySet();
        Set<Integer> set = new HashSet<>();
        for (String v : nbrs.keySet()) {
            Integer c = assignment.get(v);
            if (c != null) set.add(c);
        }
        return set;
    }

    private double sumWeightsToCommunity(UndirectedGraph ug, String node, int community, Map<String, Integer> assignment) {
        Map<String, Double> nbrs = ug.neighbors(node);
        if (nbrs == null) return 0.0;
        double s = 0.0;
        for (Map.Entry<String, Double> e : nbrs.entrySet()) {
            String v = e.getKey();
            if (assignment.get(v) != null && assignment.get(v) == community) {
                s += e.getValue();
            }
        }
        return s;
    }

    private double modularity(UndirectedGraph ug, Map<String, Integer> assignment) {
        // Q = (1/2m) * sum_{ij} [A_ij - (k_i k_j)/(2m)] * delta(c_i, c_j)
        double m2 = 2.0 * ug.totalWeight;
        if (m2 <= 0) return 0.0;

        double sum = 0.0;

        // community -> list of nodes
        Map<Integer, List<String>> commNodes = new HashMap<>();
        for (String n : ug.nodes()) {
            commNodes.computeIfAbsent(assignment.get(n), k -> new ArrayList<>()).add(n);
        }

        for (List<String> nodes : commNodes.values()) {
            // sum over edges inside the community
            double inWeight = 0.0; // sum of A_ij where i,j in community (undirected counted once)
            double degSum = 0.0;   // sum of degrees in community

            for (String u : nodes) {
                degSum += ug.degree(u);
                Map<String, Double> nbrs = ug.neighbors(u);
                if (nbrs == null) continue;
                for (Map.Entry<String, Double> e : nbrs.entrySet()) {
                    String v = e.getKey();
                    if (u.equals(v)) continue;
                    if (nodes.contains(v)) {
                        inWeight += e.getValue();
                    }
                }
            }
            // Since each internal edge was counted twice in the loop above:
            inWeight /= 2.0;

            sum += (inWeight / ug.totalWeight) - Math.pow(degSum / m2, 2);
        }
        return sum;
    }

    private AggregationResult aggregate(UndirectedGraph ug, Map<String, Integer> assignment) {
        // Build super-nodes: community id -> set of original members
        Map<Integer, Set<String>> commMembers = new HashMap<>();
        for (String n : ug.nodes()) {
            int c = assignment.get(n);
            commMembers.computeIfAbsent(c, k -> new HashSet<>()).addAll(ug.membership().getOrDefault(n, Set.of(n)));
        }

        // Build edges between super-nodes by summing weights between their member sets
        Map<String, Map<String, Double>> adj = new HashMap<>();
        Map<String, Set<String>> superMembership = new HashMap<>();

        // Assign super-node ids as "C<id>"
        Map<Integer, String> commIdToSuper = new HashMap<>();
        int idx = 0;
        for (Integer c : commMembers.keySet()) {
            String sid = "C" + idx++;
            commIdToSuper.put(c, sid);
            superMembership.put(sid, commMembers.get(c)); // carries original members
            adj.put(sid, new HashMap<>());
        }

        double totalW = 0.0;

        // Sum weights between communities
        for (String u : ug.nodes()) {
            int cu = assignment.get(u);
            String su = commIdToSuper.get(cu);
            Map<String, Double> nbrs = ug.neighbors(u);
            if (nbrs == null) continue;

            for (Map.Entry<String, Double> e : nbrs.entrySet()) {
                String v = e.getKey();
                if (u.equals(v)) continue;
                int cv = assignment.get(v);
                String sv = commIdToSuper.get(cv);
                if (su.equals(sv)) {
                    // internal edge; add once (undirected)
                    adj.get(su).merge(sv, e.getValue(), Double::sum);
                } else {
                    // inter-community; sum on su->sv (we'll mirror later)
                    adj.get(su).merge(sv, e.getValue(), Double::sum);
                }
                totalW += e.getValue();
            }
        }

        // Half total since each undirected edge counted twice above
        totalW /= 2.0;

        // Mirror to ensure symmetry
        for (String a : adj.keySet()) {
            for (Map.Entry<String, Double> e : new ArrayList<>(adj.get(a).entrySet())) {
                String b = e.getKey();
                double w = e.getValue();
                adj.computeIfAbsent(b, k -> new HashMap<>()).merge(a, w, Double::sum);
            }
        }

        UndirectedGraph superGraph = new UndirectedGraph(adj, superMembership, totalW);

        // Next level initial assignment: each super-node in its own community
        Map<String, Integer> superAssignment = new HashMap<>();
        int c = 0;
        for (String sn : superGraph.nodes()) superAssignment.put(sn, c++);

        return new AggregationResult(superGraph, superAssignment);
    }

    private static class AggregationResult {
        final UndirectedGraph superGraph;
        final Map<String, Integer> superAssignment;

        AggregationResult(UndirectedGraph g, Map<String, Integer> a) {
            this.superGraph = g;
            this.superAssignment = a;
        }
    }

    // ------------------------ Utilities ------------------------

    private int argMax(Map<Integer, Double> map) {
        double best = -Double.MAX_VALUE;
        int bestK = -1;
        for (Map.Entry<Integer, Double> e : map.entrySet()) {
            if (e.getValue() > best) {
                best = e.getValue();
                bestK = e.getKey();
            }
        }
        return bestK;
    }

    private Map<Integer, Integer> remapCommunities(Collection<Integer> ids) {
        Map<Integer, Integer> map = new HashMap<>();
        int next = 0;
        for (Integer id : ids.stream().sorted().collect(Collectors.toList())) {
            map.putIfAbsent(id, next++);
        }
        return map;
    }

    // Build undirected weighted projection from selected edge types
    private UndirectedGraph buildUndirected(Graph graph, Set<GraphLink.LinkType> allowedTypes) {
        Map<String, Map<String, Double>> adj = new HashMap<>();
        Map<String, Set<String>> membership = new HashMap<>();

        // initialize nodes
        for (GraphNode n : graph.getNodes()) {
            adj.putIfAbsent(n.getId(), new HashMap<>());
            membership.put(n.getId(), Set.of(n.getId())); // each node contains itself (original member)
        }

        // add edges if they match allowed types; project to undirected (sum weights both ways)
        for (GraphLink link : graph.getLinks()) {
            if (!allowedTypes.contains(link.getType())) continue;
            String u = link.getSourceID();
            String v = link.getTargetID();
            if (u.equals(v)) continue; // ignore self-loops

            // undirected add
            adj.computeIfAbsent(u, k -> new HashMap<>()).merge(v, 1.0, Double::sum);
            adj.computeIfAbsent(v, k -> new HashMap<>()).merge(u, 1.0, Double::sum);
        }

        // compute total weight (sum of upper triangle)
        double total = 0.0;
        Set<String> visited = new HashSet<>();
        for (String u : adj.keySet()) {
            visited.add(u);
            for (Map.Entry<String, Double> e : adj.get(u).entrySet()) {
                if (!visited.contains(e.getKey())) {
                    total += e.getValue();
                }
            }
        }

        return new UndirectedGraph(adj, membership, total);
    }

    // Lightweight undirected graph container
    private static class UndirectedGraph {
        private final Map<String, Map<String, Double>> adj; // node -> neighbor -> weight
        private final Map<String, Set<String>> members;     // node -> original members
        private final double totalWeight;                   // sum of unique undirected edge weights

        UndirectedGraph(Map<String, Map<String, Double>> adj,
                        Map<String, Set<String>> members,
                        double totalWeight) {
            this.adj = adj;
            this.members = members;
            this.totalWeight = totalWeight;
        }

        Set<String> nodes() {
            return adj.keySet();
        }

        Map<String, Double> neighbors(String u) {
            return adj.getOrDefault(u, Collections.emptyMap());
        }

        double degree(String u) {
            return neighbors(u).values().stream().mapToDouble(Double::doubleValue).sum();
        }

        Map<String, Set<String>> membership() {
            return members;
        }
    }
}
