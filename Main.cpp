#include "raylib.h"
#include "LocationManager.h"
#include "Graph.h"
#include "Navigation.h"
#include <map>
#include <string>
#include <vector>
#include <cstring>
#include <algorithm>
#include <iostream>
#include <cmath>

using namespace std;

const int screenWidth = 1920;  
const int screenHeight = 1200; 
const int nodeRadius = 15;    

namespace Theme {
    Color BG = { 240, 242, 245, 255 };      
    Color UI_DARK = { 40, 44, 52, 255 };    
    Color UI_LIGHT = { 255, 255, 255, 240 };
    Color ACCENT = { 0, 122, 255, 255 };  
    Color TEXT_DARK = { 30, 30, 30, 255 };
    
    Color CLASS = { 255, 149, 0, 255 };   
    Color LAB = { 175, 82, 222, 255 };     
    Color OFFICE = { 10, 132, 255, 255 }; 
    Color ADMIN = { 48, 209, 88, 255 };   
    Color UTIL = { 142, 142, 147, 255 }; 
    Color SPECIAL = { 255, 69, 58, 255 }; 
}

enum AppState {
    STATE_CAMPUS,
    STATE_FLOOR_SELECT,
    STATE_LOADING,
    STATE_INSIDE
};

const int MAX_BUILDINGS = 2; 
const int MAX_FLOORS_LIMIT = 10; 
const int MAX_ROOMS = 30; 

struct RoomNode {
    char name[30];
    int x;
    int y;
    Color color;
};

struct Floor {
    char name[30];
    RoomNode rooms[MAX_ROOMS];
    int roomCount;
    Texture2D texture; 
    pair<int, int> connections[30]; 
    int connectionCount;
};

struct Building {
    char name[30];
    Floor floors[MAX_FLOORS_LIMIT];
    int totalFloors;
};

Building departments[MAX_BUILDINGS]; 
int currentBuildingIndex = -1;       
int currentFloorIndex = -1;          

float loadingTimer = 0.0f;
const float loadingDuration = 1.5f; 
int pendingBuildingIndex = -1;
int pendingFloorIndex = -1; 
int targetRoomIndex = -1; 

// Campus Data
struct Point { int x; int y; };
map<int, Point> locationCoords = {
    {0, {1750, 525}}, // EE
    {1, {960, 520}},  // CS
    {2, {139, 705}}, 
    {3, {806, 882}}, {4, {162, 347}}, {5, {179, 115}}, 
    {6, {1255, 92}}, {7, {1360, 1030}}, {8, {460, 360}}
};
map<pair<int, int>, vector<Point>> visualPaths;

// DrawNodes
void DrawMapNode(int x, int y, const char* label, Color baseColor, bool isHovered, bool isSelected, bool isTarget) {
    float r = nodeRadius;
    Color c = baseColor;
    
    // Animation Logic
    if (isHovered || isTarget) {
        r += (sin(GetTime() * 8.0f) * 3.0f); 
        c = Theme::ACCENT;
    }
    if (isSelected) {
        c = Theme::SPECIAL;
        r += 2;
    }

    DrawCircle(x + 3, y + 3, r, Fade(BLACK, 0.3f));
    DrawCircle(x, y, r, c);
    DrawCircleLines(x, y, r, WHITE);

    int txtW = MeasureText(label, 20);
    Rectangle pill = { (float)x - txtW/2 - 10, (float)y + 25, (float)txtW + 20, 30 };
    DrawRectangleRounded(pill, 0.5f, 10, Fade(Theme::UI_DARK, 0.8f));
    DrawText(label, x - txtW/2, y + 30, 20, WHITE);
}

void InitInteriors() {
    int idx = 0;

    // BUILDING 0: EE DEPARTMENT (5 Floors)
    strcpy(departments[0].name, "EE Department");
    departments[0].totalFloors = 5;

    // EE FLOOR A (Ground) 
    Floor* fA = &departments[0].floors[0];
    strcpy(fA->name, "Ground Floor (A)");
    fA->texture = LoadTexture("EEFloorA.png"); 
    idx = 0;
    fA->rooms[idx++] = { "Washroom (M)", 130, 210, Theme::UTIL };
    fA->rooms[idx++] = { "Class A-1", 500, 140, Theme::CLASS };
    fA->rooms[idx++] = { "Class A-2", 750, 140, Theme::CLASS };
    fA->rooms[idx++] = { "Faculty Office", 960, 140, Theme::OFFICE };
    fA->rooms[idx++] = { "Class A-3", 1160, 140, Theme::CLASS };
    fA->rooms[idx++] = { "Class A-4", 1410, 140, Theme::CLASS };
    fA->rooms[idx++] = { "Washroom (F)", 1770, 210, Theme::UTIL };
    fA->rooms[idx++] = { "Class A-5", 500, 850, Theme::CLASS };
    fA->rooms[idx++] = { "Class A-6", 750, 850, Theme::CLASS };
    fA->rooms[idx++] = { "Main Entrance", 960, 850, Theme::ADMIN };
    fA->rooms[idx++] = { "Class A-7", 1160, 850, Theme::CLASS };
    fA->rooms[idx++] = { "Class A-8", 1410, 850, Theme::CLASS };
    fA->roomCount = idx;
    fA->connections[0] = {1, 2}; fA->connections[1] = {2, 3};
    fA->connectionCount = 2;

    // EE FLOOR B (1st) 
    Floor* fB = &departments[0].floors[1];
    strcpy(fB->name, "First Floor (B)");
    fB->texture = LoadTexture("EEFloorB.png"); 
    idx = 0;
    fB->rooms[idx++] = { "Washroom (M)", 130, 210, Theme::UTIL };
    fB->rooms[idx++] = { "Faculty Office", 500, 140, Theme::OFFICE };
    fB->rooms[idx++] = { "Class B-11", 750, 140, Theme::CLASS }; 
    fB->rooms[idx++] = { "Faculty Office", 960, 140, Theme::OFFICE };
    fB->rooms[idx++] = { "Class B-9", 1160, 140, Theme::CLASS };
    fB->rooms[idx++] = { "Class B-10", 1410, 140, Theme::CLASS };
    fB->rooms[idx++] = { "Washroom (F)", 1770, 210, Theme::UTIL };
    fB->rooms[idx++] = { "Lab 6", 160, 850, Theme::LAB };
    fB->rooms[idx++] = { "Lab 7", 420, 850, Theme::LAB };
    fB->rooms[idx++] = { "Lab 8", 660, 850, Theme::LAB };
    fB->rooms[idx++] = { "Staff Room", 1270, 850, Theme::OFFICE };
    fB->rooms[idx++] = { "Class B-12", 1525, 850, Theme::CLASS };
    fB->roomCount = idx;

    // EE FLOOR C (2nd)
    Floor* fC = &departments[0].floors[2];
    strcpy(fC->name, "Second Floor (C)");
    fC->texture = LoadTexture("EEFloorC.png"); 
    idx = 0;
    fC->rooms[idx++] = { "Washroom (M)", 130, 210, Theme::UTIL };
    fC->rooms[idx++] = { "Class C-13", 500, 140, Theme::CLASS };
    fC->rooms[idx++] = { "Class C-14", 750, 140, Theme::CLASS };
    fC->rooms[idx++] = { "Faculty Room", 960, 140, Theme::OFFICE }; 
    fC->rooms[idx++] = { "Class C-15", 1160, 140, Theme::CLASS };
    fC->rooms[idx++] = { "Class C-16", 1410, 140, Theme::CLASS };
    fC->rooms[idx++] = { "Washroom (F)", 1770, 210, Theme::UTIL };
    fC->rooms[idx++] = { "Class C-17", 160, 850, Theme::CLASS }; 
    fC->rooms[idx++] = { "Class C-18", 420, 850, Theme::CLASS };
    fC->rooms[idx++] = { "Class C-19", 660, 850, Theme::CLASS };
    fC->rooms[idx++] = { "Lab 9", 1770, 850, Theme::LAB }; 
    fC->rooms[idx++] = { "Class C-20", 1270, 850, Theme::CLASS };
    fC->rooms[idx++] = { "Class C-21", 1525, 850, Theme::CLASS };
    fC->roomCount = idx;

    // EE FLOOR D (3rd)
    Floor* fD = &departments[0].floors[3];
    strcpy(fD->name, "Third Floor (D)");
    fD->texture = LoadTexture("EEFloorD.png"); 
    idx = 0;
    fD->rooms[idx++] = { "Washroom (M)", 130, 210, Theme::UTIL };
    fD->rooms[idx++] = { "Class D-23", 480, 140, Theme::CLASS };
    fD->rooms[idx++] = { "Class D-24", 730, 140, Theme::CLASS };
    fD->rooms[idx++] = { "Reading Hall", 1220, 850, Theme::OFFICE };
    fD->rooms[idx++] = { "Class D-25", 1190, 140, Theme::CLASS };
    fD->rooms[idx++] = { "Class D-26", 1440, 140, Theme::CLASS };
    fD->rooms[idx++] = { "Washroom (F)", 1770, 210, Theme::UTIL };
    fD->rooms[idx++] = { "Lab 10", 180, 850, Theme::LAB }; 
    fD->rooms[idx++] = { "Lab 11", 450, 850, Theme::LAB };
    fD->rooms[idx++] = { "Class D-27", 710, 850, Theme::CLASS };
    fD->rooms[idx++] = { "Class D-28", 1485, 850, Theme::CLASS };
    fD->roomCount = idx;

    // EE FLOOR E (4th)
    Floor* fE = &departments[0].floors[4];
    strcpy(fE->name, "Fourth Floor (E)");
    fE->texture = LoadTexture("EEFloorD.png"); 
    idx = 0;
    fE->rooms[idx++] = { "Washroom (M)", 130, 210, Theme::UTIL };
    fE->rooms[idx++] = { "Class E-29", 480, 140, Theme::CLASS };  
    fE->rooms[idx++] = { "Class E-30", 730, 140, Theme::CLASS };  
    fE->rooms[idx++] = { "Boys Common Room", 1750, 850, Theme::ADMIN }; 
    fE->rooms[idx++] = { "Class E-31", 1190, 140, Theme::CLASS }; 
    fE->rooms[idx++] = { "Class E-32", 1440, 140, Theme::CLASS }; 
    fE->rooms[idx++] = { "Washroom (F)", 1770, 210, Theme::UTIL };
    fE->rooms[idx++] = { "Lab 12", 180, 850, Theme::LAB };     
    fE->rooms[idx++] = { "Lab 13", 450, 850, Theme::LAB };     
    fE->rooms[idx++] = { "Lab 14", 710, 850, Theme::LAB };     
    fE->rooms[idx++] = { "Class E-33", 1220, 850, Theme::CLASS }; 
    fE->rooms[idx++] = { "Class E-34", 1485, 850, Theme::CLASS }; 
    fE->roomCount = idx;


    // CS DEPARTMENT (3 Floors) 
    strcpy(departments[1].name, "CS Department");
    departments[1].totalFloors = 3;

    // CS FLOOR 0 (Basement)
    Floor* csB = &departments[1].floors[0];
    strcpy(csB->name, "CS Basement Floor");
    csB->texture = LoadTexture("CSFloorB.jpg");
    idx = 0;
    
    csB->rooms[idx++] = { "CS Lab 4", 430, 680, Theme::LAB };
    csB->rooms[idx++] = { "Server Room", 210, 230, Theme::UTIL };
    csB->rooms[idx++] = { "Record Room", 1660, 370, Theme::UTIL };
    csB->rooms[idx++] = { "Faculty Office B1", 210, 480, Theme::OFFICE };
    csB->rooms[idx++] = { "Faculty Office B2", 430, 950, Theme::OFFICE };
    csB->rooms[idx++] = { "Faculty Office B3", 1210, 950, Theme::OFFICE };
    csB->rooms[idx++] = { "Faculty Office B4", 1340, 950, Theme::OFFICE };
    csB->rooms[idx++] = { "Faculty Office B5", 1480, 950, Theme::OFFICE };
    csB->rooms[idx++] = { "Staff Room", 1210, 700, Theme::OFFICE };
    csB->rooms[idx++] = { "Staff Room", 1660, 600, Theme::OFFICE };
    csB->rooms[idx++] = { "Admin Office", 1340, 700, Theme::ADMIN };
    csB->rooms[idx++] = { "Meeting Room", 1480, 700, Theme::CLASS };
    csB->roomCount = idx;


    // CS FLOOR 1 (Ground) 
    Floor* csG = &departments[1].floors[1];
    strcpy(csG->name, "CS Ground Floor");
    csG->texture = LoadTexture("CSFloorG.jpg"); 
    idx = 0;
    
    csG->rooms[idx++] = { "Washroom (M)", 120, 200, Theme::UTIL };
    csG->rooms[idx++] = { "Washroom (F)", 1780, 200, Theme::UTIL };
    csG->rooms[idx++] = { "S2", 120, 550, Theme::CLASS };
    csG->rooms[idx++] = { "One Stop", 1780, 550, Theme::ADMIN };
    csG->rooms[idx++] = { "Finance Office", 1555, 740, Theme::OFFICE };
    csG->rooms[idx++] = { "Mystery Room", 1470, 1000, Theme::UTIL };
    csG->rooms[idx++] = { "HOD Office", 340, 740, Theme::OFFICE };
    csG->rooms[idx++] = { "LLC", 1140, 1000, Theme::UTIL };
    csG->rooms[idx++] = { "Faculty Office 4", 400, 1000, Theme::OFFICE };
    csG->rooms[idx++] = { "Faculty Office 1", 1350, 740, Theme::OFFICE };
    csG->rooms[idx++] = { "Faculty Office 2", 530, 740, Theme::OFFICE };
    csG->rooms[idx++] = { "Faculty Office 3", 1140, 740, Theme::OFFICE };
    csG->rooms[idx++] = { "Class R-11", 710, 740, Theme::CLASS };
    csG->rooms[idx++] = { "Class R-12", 660, 1000, Theme::CLASS };
    csG->roomCount = idx;

    // CS FLOOR 2 (First)
    Floor* cs1 = &departments[1].floors[2];
    strcpy(cs1->name, "CS First Floor");
    cs1->texture = LoadTexture("CSFloor1.jpg"); 
    idx = 0;
    
    cs1->rooms[idx++] = { "Class E-1", 1720, 600, Theme::CLASS };
    cs1->rooms[idx++] = { "Class E-2", 1720, 400, Theme::CLASS };
    cs1->rooms[idx++] = { "Class E-3", 1720, 200, Theme::CLASS };
    cs1->rooms[idx++] = { "Class E-4", 145, 600, Theme::CLASS };
    cs1->rooms[idx++] = { "Class E-5", 145, 400, Theme::CLASS };
    cs1->rooms[idx++] = { "Class E-6", 145, 200, Theme::CLASS };
    cs1->rooms[idx++] = { "CS Lab 1", 1420, 1000, Theme::LAB };
    cs1->rooms[idx++] = { "CS Lab 2", 660, 1000, Theme::LAB };
    cs1->rooms[idx++] = { "CS Lab 3", 400, 1000, Theme::LAB };
    cs1->rooms[idx++] = { "Network Ops", 1140, 1000, Theme::UTIL };
    cs1->rooms[idx++] = { "FYP Lab 1", 1130, 740, Theme::SPECIAL };
    cs1->rooms[idx++] = { "FYP Lab 2", 1310, 740, Theme::SPECIAL };
    cs1->rooms[idx++] = { "SYS AI Lab", 1510, 740, Theme::LAB };
    cs1->rooms[idx++] = { "Faculty Office 1", 360, 740, Theme::OFFICE };
    cs1->rooms[idx++] = { "Faculty Office 2", 530, 740, Theme::OFFICE };
    cs1->rooms[idx++] = { "Faculty Office 3", 710, 740, Theme::OFFICE };
    cs1->roomCount = idx;
}

// VISUAL PATHS FOR CAMPUS MAP
void InitVisualPaths() {
    visualPaths[{0, 7}] = { {1360, 525}, {1360, 525} };
    visualPaths[{1, 7}] = { {960, 750}, {1360,750} };
    visualPaths[{2, 7}] = { {143, 654}, {255, 654}, {255, 600}, {605, 600}, {605, 750},{1360, 750} };
    visualPaths[{3, 7}] = { {805, 740}, {1360, 750} };
    visualPaths[{4, 7}] = { {255, 600}, {605, 600}, {605, 750},{1360, 750} };
    visualPaths[{6, 7}] = { {1360, 92} };
    visualPaths[{1, 8}] = { {620, 520}, {620, 360}};
    visualPaths[{5, 8}] = {{258, 200}, {258, 354}};
    visualPaths[{2, 8}] = { {140, 670}, {258, 670}, {258, 354}};
    visualPaths[{3, 8}] = { {805, 750}, {620, 750}, {620, 360} };
    visualPaths[{4, 8}] = { {258, 607}, {258, 354}};
    visualPaths[{6, 8}] = { {1255, 275}, {620, 275}, {620, 360} };
    visualPaths[{0, 6}] = { {1360, 525}, {1360,92}};
    visualPaths[{1, 6}] = { {960, 275}, {1255, 275} };
    visualPaths[{2, 5}] = { {143, 654}, {258, 654}, {258, 200} };
    visualPaths[{4, 5}] = { {258, 607}, {258,200} };
    visualPaths[{2, 4}] = { {143, 654}, {258, 654}, {258, 607} };
    visualPaths[{3, 4}] = { {805, 750}, {605, 750}, {605, 600}, {255, 600} };
    visualPaths[{1, 3}] = { {960, 760}, {805, 760}};
    visualPaths[{2, 3}] = { {143, 654}, {255, 654}, {255, 600}, {605, 600}, {605, 750},{805, 750} };
}

vector<Point> GetVisualPathPoints(int startNode, int endNode) {
    vector<Point> points;
    auto key = minmax(startNode, endNode);
    if (locationCoords.find(startNode) == locationCoords.end() || locationCoords.find(endNode) == locationCoords.end()) return points;
    Point pStart = locationCoords[startNode];
    Point pEnd = locationCoords[endNode];
    points.push_back(pStart);
    if (visualPaths.count(key)) {
        vector<Point> waypoints = visualPaths[key];
        if (startNode > endNode) reverse(waypoints.begin(), waypoints.end());
        points.insert(points.end(), waypoints.begin(), waypoints.end());
    }
    points.push_back(pEnd);
    return points;
}

bool IsNodeHoveredOrClicked(Vector2 mousePos, Point center, float radius) {
    return CheckCollisionPointCircle(mousePos, {(float)center.x, (float)center.y}, radius);
}

// MAIN FUNCTION 
int main() {

    LocationManager lm;
    lm.addLocation(0, "EE Building");
    lm.addLocation(1, "CS Building");
    lm.addLocation(2, "Tennis Court");
    lm.addLocation(3, "Basketball Court");
    lm.addLocation(4, "Football Court");
    lm.addLocation(5, "Sports Room");
    lm.addLocation(6, "Masjid");
    lm.addLocation(7, "Main Entrance");
    lm.addLocation(8, "MultiPurpose Building");

    InitVisualPaths();

    Graph g(lm.getTotalLocations());
    g.addEdge(7, 0, 850); g.addEdge(7, 1, 850); g.addEdge(7, 2, 1600);
    g.addEdge(7, 3, 800); g.addEdge(7, 4, 1500); g.addEdge(7, 5, 1950);
    g.addEdge(7, 6, 1000); g.addEdge(7, 8, 1400); g.addEdge(0, 1, 400);
    g.addEdge(0, 2, 1950); g.addEdge(0, 3, 1150); g.addEdge(0, 4, 1850);
    g.addEdge(0, 5, 1950); g.addEdge(0, 6, 800); g.addEdge(0, 8, 1350);
    g.addEdge(1, 2, 1450); g.addEdge(1, 3, 500); g.addEdge(1, 4, 1350);
    g.addEdge(1, 5, 1800); g.addEdge(1, 6, 600); g.addEdge(1, 8, 500);
    g.addEdge(6, 2, 1850); g.addEdge(6, 3, 1200); g.addEdge(6, 4, 1750);
    g.addEdge(6, 5, 1350); g.addEdge(6, 8, 1050); g.addEdge(3, 2, 850);
    g.addEdge(3, 4, 750); g.addEdge(3, 5, 1200); g.addEdge(3, 8, 700);
    g.addEdge(2, 4, 100); g.addEdge(2, 5, 550); g.addEdge(2, 8, 700);
    g.addEdge(4, 5, 400); g.addEdge(4, 8, 600); g.addEdge(5, 8, 450);

    Navigation nav(&g, &lm);

    // 2. WINDOW & CAMERA
    InitWindow(0, 0, "FAST Campus Navigation"); 
    int monitorWidth = GetMonitorWidth(GetCurrentMonitor());
    int monitorHeight = GetMonitorHeight(GetCurrentMonitor());
    SetWindowSize(monitorWidth, monitorHeight);
    ToggleFullscreen();
    SetTargetFPS(60);

    float scale = min((float)monitorWidth / screenWidth, (float)monitorHeight / screenHeight);
    Camera2D camera = { 0 };
    camera.zoom = scale;
    camera.offset.x = (monitorWidth - screenWidth * scale) * 0.5f;
    camera.offset.y = (monitorHeight - screenHeight * scale) * 0.5f;

    InitInteriors();
    Texture2D mapTexture = LoadTexture("campus_map.png");
    Rectangle sourceRec = { 0.0f, 0.0f, (float)mapTexture.width, (float)mapTexture.height };
    Rectangle destRec = { 0.0f, 0.0f, (float)screenWidth, (float)screenHeight }; 

    AppState currentState = STATE_CAMPUS;

    int selectedSrc = -1;
    int selectedDest = -1;
    PathResult currentResult = {{0}, 0, -1};

    char searchText[64] = "\0";
    int letterCount = 0;
    bool textBoxActive = false;
    int searchResultNodeID = -1;
    int hoveredNodeID = -1;
    int hoveredRoomIndex = -1;
    bool designMode = false;

    while (!WindowShouldClose()) {
        Vector2 mousePos = GetScreenToWorld2D(GetMousePosition(), camera);
        
        hoveredNodeID = -1;
        hoveredRoomIndex = -1;

        if (IsKeyPressed(KEY_F1)) designMode = !designMode;

        if (currentState == STATE_CAMPUS) {
            for (int id = 0; id < lm.getTotalLocations(); id++) {
                if (IsNodeHoveredOrClicked(mousePos, locationCoords[id], nodeRadius + 8)) {
                    if (IsMouseButtonPressed(MOUSE_RIGHT_BUTTON)) {
                        if (id == 0) { currentBuildingIndex = 0; currentState = STATE_FLOOR_SELECT; } 
                        else if (id == 1) { currentBuildingIndex = 1; currentState = STATE_FLOOR_SELECT; }
                        break;
                    }
                }
            }

            Rectangle searchBox = { (float)screenWidth - 420, 20, 400, 50 };
            if (IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) {
                if (CheckCollisionPointRec(mousePos, searchBox)) {
                    textBoxActive = !textBoxActive;
                } else {
                    textBoxActive = false;
                    for (int id = 0; id < lm.getTotalLocations(); id++) {
                        if (IsNodeHoveredOrClicked(mousePos, locationCoords[id], nodeRadius + 8)) {
                            if (selectedSrc == -1) { selectedSrc = id; currentResult.pathSize = 0; selectedDest = -1; } 
                            else if (selectedDest == -1 && id != selectedSrc) { selectedDest = id; currentResult = nav.shortestPath(selectedSrc, selectedDest); } 
                            else { selectedSrc = id; selectedDest = -1; currentResult.pathSize = 0; }
                            searchResultNodeID = -1; break;
                        }
                    }
                }
            }
            if (textBoxActive) {
                int key = GetKeyPressed();
                while(key > 0) { 
                    if(key >= 32 && key <= 125 && letterCount < 63) { searchText[letterCount++] = (char)key; searchText[letterCount] = '\0'; } 
                    key = GetKeyPressed(); 
                }
                if(IsKeyPressed(KEY_BACKSPACE) && letterCount > 0) { searchText[--letterCount] = '\0'; }
                
                if (IsKeyPressed(KEY_ENTER)) {
                    searchResultNodeID = -1;
                    targetRoomIndex = -1; 
                    string searchString = searchText;
                    for (char &c : searchString) c = tolower(c);
                    bool found = false;
                    // Campus Search
                    for (int id = 0; id < lm.getTotalLocations(); id++) {
                        string locName = lm.getName(id);
                        for (char &c : locName) c = tolower(c);
                        if (locName.find(searchString) != string::npos) { searchResultNodeID = id; found = true; break; }
                    }
                    // Room Search
                    if (!found) {
                        for (int bIdx = 0; bIdx < MAX_BUILDINGS; bIdx++) {
                            for (int fIdx = 0; fIdx < departments[bIdx].totalFloors; fIdx++) {
                                Floor* f = &departments[bIdx].floors[fIdx];
                                for(int i=0; i < f->roomCount; i++) {
                                    string rName = f->rooms[i].name;
                                    string lowerN = rName;
                                    for(char &c : lowerN) c = tolower(c);
                                    if (lowerN.find(searchString) != string::npos) {
                                        pendingBuildingIndex = bIdx; pendingFloorIndex = fIdx; targetRoomIndex = i;
                                        loadingTimer = 0.0f; textBoxActive = false; currentState = STATE_LOADING; found = true; break;
                                    }
                                }
                                if(found) break;
                            }
                            if(found) break;
                        }
                    }
                    if (!found) textBoxActive = false;
                }
            }
            if (!CheckCollisionPointRec(mousePos, searchBox)) {
                for (int id = 0; id < lm.getTotalLocations(); id++) {
                    if (IsNodeHoveredOrClicked(mousePos, locationCoords[id], nodeRadius + 8)) { hoveredNodeID = id; break; }
                }
            }
        }
        else if (currentState == STATE_LOADING) {
            loadingTimer += GetFrameTime();
            if (loadingTimer >= loadingDuration) {
                currentBuildingIndex = pendingBuildingIndex;
                currentFloorIndex = pendingFloorIndex;
                currentState = STATE_INSIDE;
            }
        }
        else if (currentState == STATE_INSIDE) {
            if (designMode && IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) {
                 cout << "departments[" << currentBuildingIndex << "].floors[" << currentFloorIndex << "].rooms[idx++] = { \"NEW_NODE\", " << (int)mousePos.x << ", " << (int)mousePos.y << ", Theme::CLASS };" << endl;
            }
            Floor* f = &departments[currentBuildingIndex].floors[currentFloorIndex];
            for (int i = 0; i < f->roomCount; i++) {
                if (CheckCollisionPointCircle(mousePos, {(float)f->rooms[i].x, (float)f->rooms[i].y}, nodeRadius + 5)) hoveredRoomIndex = i;
            }
        }

        // DRAWING
        BeginDrawing();
        ClearBackground(BLACK); 
        BeginMode2D(camera);
        
        DrawRectangle(0, 0, screenWidth, screenHeight, Theme::BG); 

        if (currentState == STATE_CAMPUS) {
            if (mapTexture.id != 0) DrawTexturePro(mapTexture, sourceRec, destRec, {0,0}, 0.0f, WHITE);
            
            // Draw Path
            if (currentResult.pathSize > 1) {
                 for (int i = 0; i < currentResult.pathSize - 1; ++i) {
                    vector<Point> pts = GetVisualPathPoints(currentResult.path[i], currentResult.path[i+1]);
                    for (size_t k = 0; k < pts.size() - 1; k++) {
                        DrawLineEx({(float)pts[k].x, (float)pts[k].y}, {(float)pts[k+1].x, (float)pts[k+1].y}, 8.0f, Fade(ORANGE, 0.4f)); 
                        DrawLineEx({(float)pts[k].x, (float)pts[k].y}, {(float)pts[k+1].x, (float)pts[k+1].y}, 4.0f, ORANGE); 
                    }
                }
            }
            // Draw Nodes
            for (int id = 0; id < lm.getTotalLocations(); id++) {
                Point p = locationCoords[id];
                Color c = Theme::OFFICE;
                if (id == selectedSrc) c = Theme::ADMIN; 
                else if (id == selectedDest) c = Theme::SPECIAL; 
                else if (id == searchResultNodeID) c = Theme::LAB;
                
                DrawMapNode(p.x, p.y, lm.getName(id).c_str(), c, (id == hoveredNodeID), (id == selectedSrc || id == selectedDest), false);
                
                if ((id == 0 || id == 1) && id == hoveredNodeID) { 
                    const char* hintText = "Right Click to Enter";
                    int hintWidth = MeasureText(hintText, 20);
                    DrawRectangleRounded({(float)p.x - hintWidth/2 - 10, (float)p.y + 60, (float)hintWidth + 20, 30}, 0.5f, 10, Fade(BLACK, 0.85f));
                    DrawText(hintText, p.x - hintWidth/2, p.y + 65, 20, GREEN); 
                }
            }
            
            // Search Bar UI
            Rectangle searchBox = { (float)screenWidth - 420, 20, 400, 50 };
            Color borderColor = textBoxActive ? Theme::ACCENT : LIGHTGRAY;
            DrawRectangleRounded(searchBox, 0.5f, 10, Theme::UI_LIGHT);
            DrawRectangleRoundedLines(searchBox, 0.5f, 10, borderColor); 

            if (strlen(searchText) == 0 && !textBoxActive) {
                DrawText("Search Room (e.g. A-1)...", (int)searchBox.x + 15, (int)searchBox.y + 15, 20, GRAY);
            } else {
                DrawText(searchText, (int)searchBox.x + 15, (int)searchBox.y + 15, 20, Theme::TEXT_DARK);
            }
            if (textBoxActive && ((int)(GetTime() * 2) % 2 == 0)) {
                int txtWidth = MeasureText(searchText, 20);
                DrawText("_", (int)searchBox.x + 15 + txtWidth, (int)searchBox.y + 15, 20, BLACK);
            }

            // Status Panel
            Rectangle statusPanel = { 20, (float)screenHeight - 100, 600, 80 };
            DrawRectangleRounded(statusPanel, 0.3f, 10, Fade(Theme::UI_DARK, 0.9f));
            
            // RESTORED ROUTE INFO 
            const char* statusTitle = "FAST NUCES NAVIGATION";
            const char* statusSub = "Select a start point";
            Color statusColor = LIGHTGRAY;
            
            if (selectedSrc == -1) { 
                statusSub = "Click Green to Start"; 
                statusColor = GREEN; 
            } else if (selectedDest == -1) { 
                statusTitle = TextFormat("Start: %s", lm.getName(selectedSrc).c_str()); 
                statusSub = "Select Destination (Red)"; 
                statusColor = RED; 
            } else { 
                statusTitle = "Route Calculated"; 
                statusSub = TextFormat("%s > %s (%dm)", lm.getName(selectedSrc).c_str(), lm.getName(selectedDest).c_str(), currentResult.totalDist); 
                statusColor = ORANGE; 
            }
            DrawText(statusTitle, (int)statusPanel.x + 20, (int)statusPanel.y + 15, 20, WHITE);
            DrawText(statusSub, (int)statusPanel.x + 20, (int)statusPanel.y + 45, 26, statusColor);
        }
        else if (currentState == STATE_FLOOR_SELECT) {
            DrawRectangle(0, 0, screenWidth, screenHeight, Fade(Theme::UI_DARK, 0.9f));
            Building* b = &departments[currentBuildingIndex];
            
            DrawText(TextFormat("%s INTERIOR", b->name), 100, 100, 60, WHITE);
            
            int startY = 300;
            for(int i = 0; i < b->totalFloors; i++) {
                Rectangle btn = { 100, (float)startY + (i * 110), 500, 90 };
                bool hover = CheckCollisionPointRec(mousePos, btn);
                Color btnColor = hover ? Theme::ACCENT : LIGHTGRAY;
                
                DrawRectangleRounded(btn, 0.3f, 10, btnColor);
                DrawText(b->floors[i].name, btn.x + 40, btn.y + 30, 30, hover ? WHITE : Theme::TEXT_DARK);
                
                if (hover && IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) { 
                    pendingBuildingIndex = currentBuildingIndex; pendingFloorIndex = i; loadingTimer = 0.0f; targetRoomIndex = -1; currentState = STATE_LOADING; 
                }
            }
            
            Rectangle backBtn = { 50, 50, 150, 50 };
            if (CheckCollisionPointRec(mousePos, backBtn)) {
                DrawRectangleRounded(backBtn, 0.5f, 10, Theme::SPECIAL);
                if (IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) currentState = STATE_CAMPUS;
            } else { DrawRectangleRounded(backBtn, 0.5f, 10, GRAY); }
            DrawText("BACK", 95, 65, 20, WHITE);
        }
        else if (currentState == STATE_LOADING) {
            DrawRectangle(0, 0, screenWidth, screenHeight, Theme::UI_DARK); 
            Building* b = &departments[pendingBuildingIndex];
            const char* txt = targetRoomIndex != -1 ? TextFormat("Going to %s...", b->floors[pendingFloorIndex].rooms[targetRoomIndex].name) : TextFormat("Entering %s...", b->name);
            DrawText(txt, screenWidth/2 - MeasureText(txt, 40)/2, screenHeight/2 - 50, 40, WHITE);
            
            // Loading Bar
            float progress = loadingTimer / loadingDuration;
            DrawRectangle(screenWidth/2 - 300, screenHeight/2 + 30, 600, 10, GRAY);
            DrawRectangle(screenWidth/2 - 300, screenHeight/2 + 30, (int)(600 * progress), 10, Theme::ACCENT);
        }
        else if (currentState == STATE_INSIDE) {
            Building* b = &departments[currentBuildingIndex];
            Floor* f = &b->floors[currentFloorIndex];

            if (f->texture.id != 0) DrawTexture(f->texture, 0, 0, WHITE);

            // Connections
            for(int i = 0; i < f->connectionCount; i++) {
                int u = f->connections[i].first; int v = f->connections[i].second;
                DrawLineEx({(float)f->rooms[u].x, (float)f->rooms[u].y}, {(float)f->rooms[v].x, (float)f->rooms[v].y}, 4.0f, Fade(GRAY, 0.5f));
            }
            // Rooms
            for(int i=0; i < f->roomCount; i++) {
                bool isTarget = (i == targetRoomIndex);
                Color c = f->rooms[i].color;
                float r = nodeRadius;
                
                if (i == hoveredRoomIndex || isTarget) { 
                    c = Theme::ACCENT;
                    r += (sin(GetTime()*8)*3); 
                }
                
                DrawCircle(f->rooms[i].x, f->rooms[i].y, r + 3, Fade(BLACK, 0.3f));
                DrawCircle(f->rooms[i].x, f->rooms[i].y, r, c);
                DrawCircleLines(f->rooms[i].x, f->rooms[i].y, r, WHITE);
                
                int txtW = MeasureText(f->rooms[i].name, 20);
                DrawRectangleRounded({(float)f->rooms[i].x - txtW/2 - 5, (float)f->rooms[i].y + 25, (float)txtW + 10, 30}, 0.5f, 10, Fade(Theme::UI_DARK, 0.8f));
                DrawText(f->rooms[i].name, f->rooms[i].x - txtW/2, f->rooms[i].y + 30, 20, WHITE);
            }
            
            // Info Panel
            Rectangle infoPanel = { 20, (float)screenHeight - 80, 800, 60 };
            DrawRectangleRounded(infoPanel, 0.5f, 10, Fade(Theme::UI_DARK, 0.9f));
            DrawText(TextFormat("%s > %s", b->name, f->name), infoPanel.x + 30, infoPanel.y + 15, 30, WHITE);

            Rectangle backBtn = { (float)screenWidth - 180, (float)screenHeight - 80, 160, 60 };
            bool hoverBack = CheckCollisionPointRec(mousePos, backBtn);
            DrawRectangleRounded(backBtn, 0.5f, 10, hoverBack ? Theme::SPECIAL : GRAY);
            DrawText("BACK", backBtn.x + 50, backBtn.y + 20, 20, WHITE);
            
            if (hoverBack && IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) { targetRoomIndex = -1; currentState = STATE_FLOOR_SELECT; }
            if (designMode) DrawText(TextFormat("X:%d Y:%d", (int)mousePos.x, (int)mousePos.y), mousePos.x + 15, mousePos.y, 20, GREEN);
        }

        EndMode2D(); 
        EndDrawing();
    }

    UnloadTexture(mapTexture);
    for(int b=0; b<MAX_BUILDINGS; b++) {
        for(int f=0; f<departments[b].totalFloors; f++) {
            if(departments[b].floors[f].texture.id != 0) UnloadTexture(departments[b].floors[f].texture);
        }
    }
    CloseWindow();
    return 0;
}