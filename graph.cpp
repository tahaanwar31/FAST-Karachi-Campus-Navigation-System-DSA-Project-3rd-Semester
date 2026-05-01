#include "Graph.h"

Graph::Graph(int vertices) {
    numVertices = vertices;
    // Initialize matrix to 0
    for(int i = 0; i < MAX_NODES; i++) {
        for(int j = 0; j < MAX_NODES; j++) {
            adjMatrix[i][j] = 0;
        }
    }
}

void Graph::addEdge(int u, int v, int w) {
    if(u >= 0 && u < MAX_NODES && v >= 0 && v < MAX_NODES) {
        adjMatrix[u][v] = w;
        adjMatrix[v][u] = w; // Undirected
    }
}

int Graph::getWeight(int u, int v) {
    if(u >= 0 && u < MAX_NODES && v >= 0 && v < MAX_NODES) {
        return adjMatrix[u][v];
    }
    return 0;
}

int Graph::getVertices() {
    return numVertices;
}