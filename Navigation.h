#ifndef NAVIGATION_H
#define NAVIGATION_H

#include "Graph.h"           
#include "LocationManager.h"

struct PathResult {
    int path[MAX_NODES]; 
    int pathSize;        
    int totalDist;       
};

class Navigation {
private:
    Graph* graph;
    LocationManager* lm;

public:
    Navigation(Graph* g, LocationManager* l);
    PathResult shortestPath(int src, int dest);
};

#endif