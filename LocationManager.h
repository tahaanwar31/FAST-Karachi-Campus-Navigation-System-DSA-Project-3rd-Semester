#ifndef LOCATION_MANAGER_H
#define LOCATION_MANAGER_H

#include <string>
#include <unordered_map> // For Hashing
#include <algorithm>

#define MAX_LOCATIONS 30

class LocationManager {
private:
    std::string locationNames[MAX_LOCATIONS];
    std::unordered_map<std::string, int> lookupTable; // Hash Table
    int count;

public:
    LocationManager();
    void addLocation(int id, const std::string& name);
    std::string getName(int id) const;
    int getIdByName(std::string searchName); // New Hashing Search
    int getTotalLocations() const;
};

#endif