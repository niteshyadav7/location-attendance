import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

export const locationService = {
  // Cache
  _cache: {
    locations: null,
    locationsOrg: null,
    locationsTimestamp: 0
  },

  // Get all locations for an organization
  async getLocations(organizationId, forceRefresh = false) {
    try {
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();

      if (!forceRefresh &&
          this._cache.locations &&
          this._cache.locationsOrg === organizationId &&
          (now - this._cache.locationsTimestamp < CACHE_DURATION)) {
          return this._cache.locations;
      }

      const q = query(
        collection(db, 'locations'),
        where('organizationId', '==', organizationId)
      );
      
      const snapshot = await getDocs(q);
      const locations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Update cache
      this._cache.locations = locations;
      this._cache.locationsOrg = organizationId;
      this._cache.locationsTimestamp = now;

      return locations;
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  },

  // Add a new location
  async addLocation(organizationId, locationData) {
    try {
      const docRef = await addDoc(collection(db, 'locations'), {
        ...locationData,
        organizationId,
        createdAt: serverTimestamp()
      });
      this._cache.locations = null; // Invalidate cache
      return { id: docRef.id, ...locationData };
    } catch (error) {
      console.error('Error adding location:', error);
      throw error;
    }
  },

  // Update a location
  async updateLocation(locationId, data) {
    try {
      const locationRef = doc(db, 'locations', locationId);
      await updateDoc(locationRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      this._cache.locations = null; // Invalidate cache
      return true;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  },

  // Delete a location
  async deleteLocation(locationId) {
    try {
      await deleteDoc(doc(db, 'locations', locationId));
      this._cache.locations = null; // Invalidate cache
      return true;
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  },
  
  // Organization Settings (Breaks, etc.)
  async getSettings(organizationId) {
    try {
        const q = query(collection(db, 'organization_settings'), where('organizationId', '==', organizationId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching settings:', error);
        return null;
    }
  },

  async updateSettings(organizationId, settingsId, data) {
      try {
          if (settingsId) {
             await updateDoc(doc(db, 'organization_settings', settingsId), data);
          } else {
             await addDoc(collection(db, 'organization_settings'), {
                 organizationId,
                 ...data
             });
          }
      } catch (error) {
          console.error("Error updating settings", error);
          throw error;
      }
  }
};
