import React, { useState, useEffect, useRef } from 'react';
import { locationService } from '../services/location.service';
import { attendanceService } from '../services/attendance.service';
import { 
  MapPin, Users, Settings, Plus, Navigation, Edit, Save, Locate
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet/dist/leaflet.css';
import './LocationManagement.css';
import Loader from '../components/common/Loader';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LocationPicker = ({ position, onLocationSelect }) => {
  const mapRef = useRef(null);

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        onLocationSelect(e.latlng);
      },
    });
    return null;
  };

  useEffect(() => {
    if (mapRef.current && position) {
      mapRef.current.flyTo(position, mapRef.current.getZoom());
    }
  }, [position]);

  return (
    <MapContainer 
      center={position || [20.5937, 78.9629]} // Default to India center if null
      zoom={13} 
      style={{ height: '300px', width: '100%', borderRadius: '12px', zIndex: 1 }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {position && <Marker position={position} />}
      <MapEvents />
    </MapContainer>
  );
};

const LocationManagement = ({ user }) => {
  const [activeTab, setActiveTab] = useState('LOCATIONS');
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  
  // Forms
  const [formData, setFormData] = useState({
      name: '',
      latitude: '28.6139',
      longitude: '77.2090',
      radius: '100',
      address: ''
  });
  const [userFormData, setUserFormData] = useState({
      name: '',
      email: '',
      password: '',
      locationId: '',
      checkInTime: '09:00',
      checkOutTime: '17:00'
  });
  const [editingUser, setEditingUser] = useState(null);
  
  const [settings, setSettings] = useState({
      breakDuration: 60,
      enableBreaks: true,
      workingHours: 9,
      breakStartTime: '13:00',
      breakEndTime: '14:00'
  });

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [locs, usrs, stgs] = await Promise.all([
        locationService.getLocations(user.organizationId),
        attendanceService.getUsers(user.organizationId),
        locationService.getSettings(user.organizationId)
      ]);
      setLocations(locs);
      setUsers(usrs);
      if (stgs) setSettings(prev => ({ ...prev, ...stgs }));
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  }, [user.organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enrich data for display
  const enrichedLocations = React.useMemo(() => {
    return locations.map(loc => {
      const count = users.filter(u => u.assignedLocationId === loc.id).length;
      return { ...loc, usersCount: count };
    });
  }, [locations, users]);

  const enrichedUsers = React.useMemo(() => {
    return users.map(u => {
      if (u.role === 'admin' || u.role === 'company_admin') return u; 
      const loc = locations.find(l => l.id === u.assignedLocationId);
      return { ...u, locationName: loc ? loc.name : 'Unassigned' };
    });
  }, [users, locations]);

  if (loading && locations.length === 0) {
  if (loading && locations.length === 0) {
      return <Loader />;
  }
  }

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        address: formData.address || '',
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius) || 100,
      };

      if (editingLocation) {
         await locationService.updateLocation(editingLocation.id, payload);
      } else {
         await locationService.addLocation(user.organizationId, payload);
      }

      setShowLocationModal(false);
      setEditingLocation(null);
      setFormData({ name: '', latitude: '28.6139', longitude: '77.2090', radius: '100', address: '' }); // Reset
      fetchData();
    } catch (error) {
      alert("Failed to save location");
    }
  };

  const handleEditLocation = (loc) => {
      setEditingLocation(loc);
      setFormData({
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          radius: loc.radius
      });
      setShowLocationModal(true);
  };

  const handleUseCurrentLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  setFormData(prev => ({
                      ...prev,
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude
                  }));
              },
              (error) => {
                  alert("Error getting location: " + error.message);
              }
          );
      } else {
          alert("Geolocation is not supported by this browser.");
      }
  };
  
  const handleMapClick = (latlng) => {
      setFormData(prev => ({
          ...prev,
          latitude: latlng.lat,
          longitude: latlng.lng
      }));
  };

  const handleEditUser = (u) => {
      setEditingUser(u);
      setUserFormData({
          name: u.name,
          email: u.email,
          password: '', // Password not required for editing
          locationId: u.assignedLocationId || '',
          checkInTime: u.checkInTime || '09:00',
          checkOutTime: u.checkOutTime || '17:00'
      });
      setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
        if (!userFormData.name || !userFormData.email || (!editingUser && !userFormData.password)) {
            alert("Please fill all required fields");
            return;
        }

        // Show loading indicator
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) {
            btn.innerText = editingUser ? 'Updating...' : 'Creating...';
            btn.disabled = true;
        }

        if (editingUser) {
            await attendanceService.updateUser(editingUser.uid, {
                name: userFormData.name,
                assignedLocationId: userFormData.locationId,
                checkInTime: userFormData.checkInTime,
                checkOutTime: userFormData.checkOutTime
            });
            alert("User updated successfully!");
        } else {
            await attendanceService.createUser({
                ...userFormData,
                organizationId: user.organizationId,
                role: 'employee'
            });
            alert("User created successfully!");
        }

        setShowUserModal(false);
        setEditingUser(null);
        fetchData(); // Refresh users
        setUserFormData({ name: '', email: '', password: '', locationId: '', checkInTime: '09:00', checkOutTime: '17:00' });
    } catch (error) {
        console.error(error);
        alert("Failed to save user: " + error.message);
    } finally {
         const btn = e.target.querySelector('button[type="submit"]');
         if(btn) {
            btn.innerText = editingUser ? 'Save Changes' : 'Create Account';
            btn.disabled = false;
         }
    }
  };

  const handleSaveSettings = async () => {
    try {
        await locationService.updateSettings(user.organizationId, settings.id, settings);
        alert("Settings saved!");
    } catch (error) {
        alert("Error saving settings");
    }
  };

  return (
    <div className="location-management">
      <div className="header">
        <h1>
          <Navigation size={32} color="#6366f1" />
          Location & Access
        </h1>
        <button 
          className="add-btn"
          onClick={() => {
              setEditingLocation(null);
              setEditingUser(null); // Clear editing user
              setFormData({ name: '', latitude: '28.6139', longitude: '77.2090', radius: '100', address: '' });
              setUserFormData({ name: '', email: '', password: '', locationId: '', checkInTime: '09:00', checkOutTime: '17:00' }); // Clear user form
              activeTab === 'LOCATIONS' ? setShowLocationModal(true) : setShowUserModal(true);
          }}
          style={{ display: activeTab === 'SETTINGS' ? 'none' : 'flex' }}
        >
          <Plus size={20} />
          Add {activeTab === 'LOCATIONS' ? 'Location' : 'User'}
        </button>
      </div>

      {/* ... tabs ... */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'LOCATIONS' ? 'active' : ''}`}
          onClick={() => setActiveTab('LOCATIONS')}
        >
          <MapPin size={18} /> Locations
        </button>
        <button 
          className={`tab ${activeTab === 'USERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('USERS')}
        >
          <Users size={18} /> Employees
        </button>
        <button 
          className={`tab ${activeTab === 'SETTINGS' ? 'active' : ''}`}
          onClick={() => setActiveTab('SETTINGS')}
        >
          <Settings size={18} /> Settings
        </button>
      </div>

      <div className="content-container">
        {activeTab === 'LOCATIONS' && (
          <div className="content-grid">
             {enrichedLocations.map(loc => (
                <div key={loc.id} className="location-card" onClick={() => handleEditLocation(loc)} style={{ cursor: 'pointer' }}>
                  <div className="card-header">
                    <div className="card-icon"><MapPin size={24} /></div>
                    <button className="card-menu-btn" onClick={(e) => { e.stopPropagation(); handleEditLocation(loc); }}>
                        <Edit size={20} />
                    </button>
                  </div>
                  <div className="location-info">
                    <h3>{loc.name}</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{loc.address || 'No address provided'}</p>
                    <div className="location-coords">
                        Lat: {loc.latitude?.toFixed(4)}, Lng: {loc.longitude?.toFixed(4)}
                    </div>
                  </div>
                  <div className="location-stats">
                     <div className="stat-box">
                       <label>Radius</label>
                       <strong>{loc.radius}m</strong>
                     </div>
                     <div className="stat-box">
                       <label>Assigned</label>
                       <strong>{loc.usersCount} Users</strong>
                     </div>
                  </div>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'USERS' && (
            <div className="content-grid">
                {enrichedUsers.map(usr => (
                   <div key={usr.uid} className="user-card-item">
                      <div className="user-avatar">{usr.name?.charAt(0)}</div>
                      <div className="user-details-col">
                         <h3 style={{ margin: 0, fontSize: '16px' }}>{usr.name}</h3>
                         <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{usr.email}</p>
                         <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="user-role-badge">{usr.role || 'Employee'}</span>
                            {usr.locationName && (
                              <span style={{ fontSize: '11px', background: '#f8fafc', padding: '4px 8px', borderRadius: '12px', color: '#64748b', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                                 📍 {usr.locationName}
                              </span>
                            )}
                         </div>
                      </div>
                      <button className="card-menu-btn" onClick={() => handleEditUser(usr)}>
                          <Edit size={16} />
                      </button>
                   </div>
                ))}
            </div>
        )}

        {/* ... Settings Tab ... */}
        {activeTab === 'SETTINGS' && (
            <div className="settings-card">
                 <div className="form-group">
                    <label>Daily Break Duration (Minutes)</label>
                    <input 
                        type="number" 
                        className="form-input"
                        value={settings.breakDuration}
                        onChange={(e) => setSettings({...settings, breakDuration: parseInt(e.target.value)})}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                        <label>Break Start Time</label>
                        <input 
                            type="time" 
                            className="form-input"
                            value={settings.breakStartTime || '13:00'}
                            onChange={(e) => setSettings({...settings, breakStartTime: e.target.value})}
                        />
                    </div>
                     <div className="form-group">
                        <label>Break End Time</label>
                        <input 
                            type="time" 
                            className="form-input"
                            value={settings.breakEndTime || '14:00'}
                            onChange={(e) => setSettings({...settings, breakEndTime: e.target.value})}
                        />
                    </div>
                </div>
                 <div className="form-group">
                    <label>Standard Working Hours</label>
                    <input 
                        type="number" 
                        className="form-input"
                        value={settings.workingHours}
                        onChange={(e) => setSettings({...settings, workingHours: parseInt(e.target.value)})}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                     <input 
                       type="checkbox" 
                       checked={settings.enableBreaks}
                       onChange={(e) => setSettings({...settings, enableBreaks: e.target.checked})}
                       style={{ width: '20px', height: '20px' }}
                     />
                     <label style={{ margin: 0 }}>Enable Break Tracking</label>
                </div>
                <button className="btn-submit" onClick={handleSaveSettings}>
                    <Save size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Save Configuration
                </button>
            </div>
        )}
      </div>

      {/* ... Location Modal ... */}
      {showLocationModal && (
          <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                  <div className="modal-header">
                      <h2>{editingLocation ? 'Edit Office Location' : 'Add New Office Location'}</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                      <form onSubmit={handleSaveLocation}>
                          <div className="form-group">
                              <label>Location Name</label>
                              <input 
                                required className="form-input" 
                                placeholder="e.g. HQ" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                              />
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div className="form-group">
                                  <label>Latitude</label>
                                  <input required type="number" step="any" className="form-input" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
                              </div>
                              <div className="form-group">
                                  <label>Longitude</label>
                                  <input required type="number" step="any" className="form-input" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
                              </div>
                          </div>
                          
                          <div className="form-group">
                             <button type="button" className="btn-secondary" onClick={handleUseCurrentLocation} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Locate size={16} /> Get Current Location
                             </button>
                          </div>

                          <div className="form-group">
                              <label>Geofence Radius (meters)</label>
                              <input required type="number" className="form-input" value={formData.radius} onChange={e => setFormData({...formData, radius: e.target.value})} />
                          </div>
                           <div className="form-group">
                              <label>Address (Optional)</label>
                              <input className="form-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                          </div>

                          <div className="modal-actions">
                              <button type="button" className="btn-cancel" onClick={() => setShowLocationModal(false)}>Cancel</button>
                              <button type="submit" className="btn-submit">{editingLocation ? 'Save Changes' : 'Create Location'}</button>
                          </div>
                      </form>
                      
                      {/* MAP */}
                      <div className="map-container">
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
                              Pick Location on Map
                          </label>
                          <LocationPicker 
                            position={formData.latitude && formData.longitude ? [parseFloat(formData.latitude), parseFloat(formData.longitude)] : null} 
                            onLocationSelect={handleMapClick}
                          />
                          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                             Click anywhere on the map to set the location pin.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* User Modal */}
      {showUserModal && (
          <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                      <h2>{editingUser ? 'Edit User' : 'Invite New User'}</h2>
                  </div>
                  <form onSubmit={handleSaveUser}>
                      <div className="form-group">
                          <label>Full Name</label>
                          <input 
                            required 
                            className="form-input" 
                            placeholder="John Doe"
                            value={userFormData.name}
                            onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                          />
                      </div>
                      
                      <div className="form-group">
                          <label>Email Address</label>
                          <input 
                            required 
                            type="email" 
                            className="form-input" 
                            placeholder="john@company.com"
                            value={userFormData.email}
                            onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                            disabled={!!editingUser}
                            style={{ backgroundColor: editingUser ? '#f1f5f9' : 'white', cursor: editingUser ? 'not-allowed' : 'text' }}
                          />
                      </div>

                      {!editingUser && (
                          <div className="form-group">
                              <label>Password</label>
                              <input 
                                required 
                                type="password" 
                                className="form-input" 
                                placeholder="Set initial password"
                                value={userFormData.password}
                                onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                                minLength={6}
                              />
                          </div>
                      )}

                       <div className="form-group">
                          <label>Assign Location</label>
                          <select 
                            className="form-input"
                            value={userFormData.locationId}
                            onChange={(e) => setUserFormData({...userFormData, locationId: e.target.value})}
                          >
                              <option value="">Select Office...</option>
                              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label>Default Check In</label>
                            <input 
                                type="time" 
                                className="form-input"
                                value={userFormData.checkInTime}
                                onChange={(e) => setUserFormData({...userFormData, checkInTime: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Default Check Out</label>
                            <input 
                                type="time" 
                                className="form-input"
                                value={userFormData.checkOutTime}
                                onChange={(e) => setUserFormData({...userFormData, checkOutTime: e.target.value})}
                            />
                        </div>
                      </div>

                      <div className="modal-actions">
                          <button type="button" className="btn-cancel" onClick={() => setShowUserModal(false)}>Cancel</button>
                          <button type="submit" className="btn-submit">{editingUser ? 'Save Changes' : 'Create Account'}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default LocationManagement;
