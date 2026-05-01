#include "LocationManager.h"

LocationManager::LocationManager() {
    count = 0;
}

void LocationManager::addLocation(int id, const std::string& name) {
    if (id >= 0 && id < MAX_LOCATIONS) {
        locationNames[id] = name;
        
        // Add to Hash Table (Lower case key)
        std::string lowerName = name;
        for(char &c : lowerName) c = tolower(c);
        lookupTable[lowerName] = id; 

        if (id >= count) {
            count = id + 1;
        }
    }
}

std::string LocationManager::getName(int id) const {
    if (id >= 0 && id < MAX_LOCATIONS) {
        return locationNames[id];
    }
    return "Unknown Location";
}

int LocationManager::getIdByName(std::string searchName) {
    std::string lowerSearch = searchName;
    for(char &c : lowerSearch) c = tolower(c);

    // O(1) Lookup
    if (lookupTable.find(lowerSearch) != lookupTable.end()) {
        return lookupTable[lowerSearch];
    }
    return -1; 
}

int LocationManager::getTotalLocations() const {
    return count;
}