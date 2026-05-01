#ifndef GRAPH_H
#define GRAPH_H

// Fixed size for arrays
#define MAX_NODES 20

class Graph {
private:
    int numVertices;
    int adjMatrix[MAX_NODES][MAX_NODES]; // Simple 2D Array

public:
    Graph(int vertices);
    void addEdge(int u, int v, int w);
    int getWeight(int u, int v);
    int getVertices();
};

#endif