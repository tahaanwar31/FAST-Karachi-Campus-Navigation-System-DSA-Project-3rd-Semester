# FAST Karachi Campus Navigation System
> **3rd Semester DSA Project** | FAST NUCES Karachi

An interactive campus navigation system that finds the shortest path between locations across the FAST NUCES Karachi campus and inside buildings (EE & CS Departments). Built with custom implementations of core data structures and algorithms — no STL containers used for the core logic.

---

## Team

| Member | Role |
|---|---|
| **Taha Anwar** | Lead Developer |
| **Hassan Nasir** | Developer |
| **Asad Khan** | Developer |

---

## Data Structures & Algorithms Used

This project was built from scratch to demonstrate practical mastery of DSA concepts:

### Graph (Adjacency Matrix)
- The entire campus map is modeled as an **undirected weighted graph** using a 2D adjacency matrix (`int adjMatrix[20][20]`).
- Each campus location (buildings, courts, mosque, entrances) is a vertex. Edges carry real distance weights in meters.
- Interior building navigation also uses per-floor graphs with corridor-based routing.

### Dijkstra's Shortest Path Algorithm
- Implements **Dijkstra's algorithm** to find the minimum-distance route between any two campus locations or rooms inside a building.
- Path reconstruction uses a **parent-tracking array** to trace back from destination to source.

### Custom Min-Heap (Priority Queue)
- A **complete binary heap** implemented from scratch using a static array — no `std::priority_queue` or `std::make_heap`.
- Supports `push` (bubble-up) and `pop` (bubble-down) operations in **O(log n)** time.
- Used as the priority queue for Dijkstra's algorithm to efficiently extract the minimum-distance vertex.

### Hash Table (unordered_map)
- A **hash map** maps location names to their integer IDs for **O(1) lookup**.
- Keys are normalized to lowercase for case-insensitive search.
- Enables instant room/location search across all buildings and floors.

### Arrays & Static Memory
- Fixed-size arrays are used throughout for predictable memory usage — no dynamic allocation.
- Room positions, floor data, adjacency matrix, and path results all use pre-allocated static structures.

---

## Tech Stack

| Component | Technology |
|---|---|
| **Core Language** | C++ (desktop), JavaScript (web) |
| **Graphics** | raylib (C/C++), HTML5 Canvas API (web) |
| **Algorithm** | Dijkstra's with custom Min-Heap |
| **Data Structures** | Graph (Adjacency Matrix), Hash Table, Min-Heap, Arrays |
| **Deployment** | Vercel (static web app) |

---

## Features

- **Campus-wide navigation** — Find shortest path between any 9 campus locations with visual route highlighting
- **Interior building navigation** — Navigate between rooms across 8 floors (EE: 5 floors, CS: 3 floors)
- **Corridor-aware routing** — Interior paths route through hallways, not through walls
- **Room search** — Instant search across all rooms and buildings using hash-based lookup
- **Interactive floor plans** — Each floor has a textured map with pinned room nodes
- **Animated path visualization** — Moving dashed lines show the calculated route
- **Cross-platform** — Desktop (C++/raylib) and Web (HTML5 Canvas)

---

## Campus Map

The campus graph includes **9 nodes** and **22 weighted edges** representing real walking distances:

```
EE Building ←→ CS Building ←→ Main Entrance ←→ Tennis Court
                    ↕                    ↕
              Basketball Court    MultiPurpose Building
                    ↕
            Football Court ←→ Sports Room ←→ Masjid
```

---

## How It Works

1. **Campus View** — Click any two locations on the campus map to calculate the shortest walking route
2. **Enter Buildings** — Right-click (or hold on mobile) the EE or CS building to enter
3. **Floor Select** — Choose a floor to view its interior layout
4. **Room Navigation** — Click any two rooms to find the shortest path through corridors
5. **Search** — Type a room name in the search bar to jump directly to it

---

## Project Structure

```
├── app.js                  # Web version — full JS/Canvas port
├── index.html              # Web entry point
├── style.css               # UI styling (welcome screen, overlays)
├── Main.cpp                # Desktop version — C++ raylib source
├── Graph.h / Graph.cpp     # Graph class (adjacency matrix)
├── Navigation.h / .cpp     # Dijkstra + custom Min-Heap
├── LocationManager.h/.cpp  # Hash table for location lookup
├── Makefile                # Build config (desktop + web targets)
├── campus_map.png          # Campus overhead map
├── EEFloor*.png            # EE Department floor plans (5 floors)
├── CSFloor*.jpg            # CS Department floor plans (3 floors)
└── vercel.json             # Vercel deployment config
```

---

## Running

### Web (Recommended)
Open `index.html` in any modern browser, or visit the deployed version on Vercel.

### Desktop (C++ / raylib)
Requires [raylib](https://www.raylib.com/) installed with a C++ compiler:
```bash
make PLATFORM=PLATFORM_DESKTOP
```

---

## DSA Concepts Demonstrated

| Concept | Where It's Used |
|---|---|
| **Graph representation** (Adjacency Matrix) | Campus & building floor maps |
| **Dijkstra's Algorithm** | Shortest path between any two nodes |
| **Min-Heap / Priority Queue** | Efficient min extraction in Dijkstra's |
| **Hash Table** | O(1) location name → ID lookup |
| **Breadth-first path reconstruction** | Tracing shortest path via parent array |
| **Greedy Algorithm** | Dijkstra's greedy vertex selection |
| **Tree (Complete Binary)** | Heap structure for priority queue |
| **Static Array** | All data storage — no dynamic memory |

---

## License

This project was developed as part of the **Data Structures & Algorithms** course at FAST NUCES Karachi (3rd Semester, 2025).
