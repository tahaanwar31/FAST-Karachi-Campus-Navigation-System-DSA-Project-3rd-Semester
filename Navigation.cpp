#include "Navigation.h"

const int INF = 999999;

// --- CUSTOM ARRAY-BASED MIN HEAP ---
// Replaces std::priority_queue to act as a custom Data Structure
struct HeapNode {
    int dist;
    int u;
};

class MinHeap {
private:
    HeapNode arr[1000]; // Static array (Safe size)
    int size;

public:
    MinHeap() { size = 0; }

    bool isEmpty() { return size == 0; }

    void push(int d, int u) {
        // 1. Insert at end
        int i = size;
        arr[i] = {d, u};
        size++;

        // 2. Bubble Up
        while (i > 0) {
            int parent = (i - 1) / 2;
            if (arr[i].dist < arr[parent].dist) {
                HeapNode temp = arr[i];
                arr[i] = arr[parent];
                arr[parent] = temp;
                i = parent;
            } else {
                break;
            }
        }
    }

    HeapNode pop() {
        if (size == 0) return {-1, -1};

        // 1. Save root
        HeapNode root = arr[0];

        // 2. Move last to root
        arr[0] = arr[size - 1];
        size--;

        // 3. Bubble Down
        int i = 0;
        while (true) {
            int left = 2 * i + 1;
            int right = 2 * i + 2;
            int smallest = i;

            if (left < size && arr[left].dist < arr[smallest].dist)
                smallest = left;
            if (right < size && arr[right].dist < arr[smallest].dist)
                smallest = right;

            if (smallest != i) {
                HeapNode temp = arr[i];
                arr[i] = arr[smallest];
                arr[smallest] = temp;
                i = smallest;
            } else {
                break;
            }
        }
        return root;
    }
};

// --- NAVIGATION LOGIC ---

Navigation::Navigation(Graph* g, LocationManager* l) {
    graph = g;
    lm = l;
}

PathResult Navigation::shortestPath(int src, int dest) {
    int V = graph->getVertices();
    
    int dist[MAX_NODES];
    int parent[MAX_NODES];

    for(int i = 0; i < MAX_NODES; i++) {
        dist[i] = INF;
        parent[i] = -1;
    }

    dist[src] = 0;

    // Use Custom Heap
    MinHeap pq;
    pq.push(0, src);

    while (!pq.isEmpty()) {
        HeapNode top = pq.pop();
        int u = top.u;
        int d = top.dist;

        if (d > dist[u]) continue;

        for(int v = 0; v < V; v++) {
            int weight = graph->getWeight(u, v);
            
            if(weight > 0) {
                if (dist[u] + weight < dist[v]) {
                    dist[v] = dist[u] + weight;
                    parent[v] = u;
                    pq.push(dist[v], v);
                }
            }
        }
    }

    // Reconstruct
    PathResult result;
    result.pathSize = 0;
    
    if(dist[dest] == INF) {
        result.totalDist = -1;
        return result;
    }

    result.totalDist = dist[dest];

    int crawl = dest;
    result.path[result.pathSize] = crawl;
    result.pathSize++;

    while (parent[crawl] != -1) {
        crawl = parent[crawl];
        result.path[result.pathSize] = crawl;
        result.pathSize++;
    }

    // Reverse
    for(int i = 0; i < result.pathSize / 2; i++) {
        int temp = result.path[i];
        int otherIndex = result.pathSize - 1 - i;
        result.path[i] = result.path[otherIndex];
        result.path[otherIndex] = temp;
    }

    return result;
}