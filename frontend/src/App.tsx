import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, Circle, useMap } from 'react-leaflet';
import toast, { Toaster } from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

import issImg from './assets/iss.png';
import starlinkImg from './assets/starlink.png';
import gpsImg from './assets/gps.png';
import weatherImg from './assets/weather.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const stationIcon = new L.Icon({
    iconUrl: issImg,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const satIcon = new L.Icon({
    iconUrl: starlinkImg,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

const gpsIcon = new L.Icon({
    iconUrl: gpsImg,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

const weatherIcon = new L.Icon({
    iconUrl: weatherImg,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});

const getCustomIcon = (groupName: string) => {
    if (groupName === 'stations') return stationIcon;
    if (groupName === 'starlink') return satIcon;
    if (groupName === 'gps-ops') return gpsIcon;
    if (groupName === 'weather') return weatherIcon;
    return defaultIcon;
};

interface Satellite {
    satellite_name: string;
    norad_id: number;
    lat: number;
    lon: number;
    elevation: number;
}

interface PassEvent {
    time: string;
    event: string;
    azimuth: number;
    elevation: number;
}

function LocationMarker({ position, setPosition }: { position: L.LatLng, setPosition: (pos: L.LatLng) => void }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return (
        <Marker position={position}>
            <Popup>Miejsce obserwacji</Popup>
        </Marker>
    );
}

function MapUpdater({ center }: { center: [number, number] | null }) {
    const map = useMap();
    
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            map.invalidateSize();
        }, 200);
        
        return () => clearTimeout(timeoutId);
    }, [map]);
    
    useEffect(() => {
        if (center) {
            map.flyTo(center, 7, { animate: true, duration: 1.5 });
        }
    }, [center, map]);
    
    return null;
}

function App() {
    const [satellites, setSatellites] = useState<Satellite[]>([]);
    const [group, setGroup] = useState<string>('stations');
    const [trails, setTrails] = useState<Record<number, [number, number][]>>({});
    
    const [passes, setPasses] = useState<PassEvent[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingPasses, setLoadingPasses] = useState(false);
    const [selectedSatName, setSelectedSatName] = useState("");
    
    const [observerPos, setObserverPos] = useState<L.LatLng>(new L.LatLng(53.885, 17.722));
    const [showFootprint, setShowFootprint] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [targetCenter, setTargetCenter] = useState<[number, number] | null>(null);

    const notificationTimers = useRef<Record<string, NodeJS.Timeout>>({});

    useEffect(() => {
        const ws = new WebSocket(`ws://127.0.0.1:8000/api/ws/satellite-group?group=${group}`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setSatellites(data.satellites);

            setTrails(prevTrails => {
                const newTrails = { ...prevTrails };
                data.satellites.forEach((sat: Satellite) => {
                    const currentTrail = prevTrails[sat.norad_id] || [];
                    const updatedTrail = [...currentTrail, [sat.lat, sat.lon] as [number, number]];
                    
                    if (updatedTrail.length > 200) {
                        updatedTrail.shift();
                    }
                    
                    newTrails[sat.norad_id] = updatedTrail;
                });
                return newTrails;
            });
        };

        ws.onerror = (error) => {
            console.error(error);
        };

        return () => {
            ws.close();
            Object.values(notificationTimers.current).forEach(clearTimeout);
            notificationTimers.current = {};
        };
    }, [group]);

    useEffect(() => {
        setTrails({});
        setSearchQuery("");
    }, [group]);

    const checkPasses = async (satName: string) => {
        setSelectedSatName(satName);
        setIsModalOpen(true);
        setLoadingPasses(true);
        setPasses([]);
        
        try {
            const url = `http://127.0.0.1:8000/api/satellite-passes?group=${group}&name=${encodeURIComponent(satName)}&lat=${observerPos.lat}&lon=${observerPos.lng}&days=1`;
            const response = await fetch(url);
            const data = await response.json();
            setPasses(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingPasses(false);
        }
    };

    const setAlert = (satName: string, passTimeISO: string) => {
        const passTimeMs = new Date(passTimeISO).getTime();
        const nowMs = new Date().getTime();
        const timeToPass = passTimeMs - nowMs;
        const notifyTime = timeToPass - (5 * 60 * 1000);

        if (notifyTime > 0) {
            if (notificationTimers.current[satName]) {
                clearTimeout(notificationTimers.current[satName]);
            }

            notificationTimers.current[satName] = setTimeout(() => {
                toast(`Obiekt ${satName} pojawi się na horyzoncie za 5 minut!`, {
                    icon: '🛰️',
                    duration: 8000,
                });
                delete notificationTimers.current[satName];
            }, notifyTime);
            
            toast.success(`Ustawiono alarm! Powiadomimy Cię 5 min przed przelotem.`, {
                duration: 4000
            });
        } else {
            toast.error("Ten przelot jest zbyt blisko lub już minął.", {
                duration: 4000
            });
        }
    };

    const filteredSatellites = satellites.filter(sat => 
        sat.satellite_name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 50);

    const focusOnSatellite = (lat: number, lon: number) => {
        setTargetCenter([lat, lon]);
    };

    return (
        <div className="app-container">
            <Toaster position="top-right" />
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>Satelity</h2>
                    <select 
                        value={group} 
                        onChange={(e) => setGroup(e.target.value)}
                        className="group-select-sidebar"
                    >
                        <option value="stations">Stacje kosmiczne</option>
                        <option value="starlink">Starlink</option>
                        <option value="gps-ops">Nawigacja GPS</option>
                        <option value="weather">Satelity pogodowe</option>
                    </select>

                    <label className="checkbox-label">
                        <input 
                            type="checkbox" 
                            checked={showFootprint} 
                            onChange={(e) => setShowFootprint(e.target.checked)} 
                        />
                        Pokaż zasięg widoczności
                    </label>
                    <div className="observer-hint">
                        Kliknij na mapę, aby zmienić miejsce obserwacji.
                    </div>

                    <input 
                        type="text" 
                        placeholder="Szukaj satelity..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="sidebar-list">
                    {filteredSatellites.map(sat => (
                        <div 
                            key={sat.norad_id} 
                            className="sidebar-item"
                            onClick={() => focusOnSatellite(sat.lat, sat.lon)}
                        >
                            <span className="sat-name">{sat.satellite_name}</span>
                            <span className="sat-alt">{(sat.elevation / 1000).toFixed(0)} km</span>
                        </div>
                    ))}
                    {filteredSatellites.length === 0 && (
                        <div className="no-results">Brak wyników</div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Przeloty: {selectedSatName}</h3>
                        <button className="close-btn" onClick={() => setIsModalOpen(false)}>X</button>
                        {loadingPasses ? (
                            <p>Obliczanie trajektorii...</p>
                        ) : (
                            <ul>
                                {passes.map((p, index) => (
                                    <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>
                                            <b>{p.event.toUpperCase()}</b>: {new Date(p.time).toLocaleTimeString()} 
                                            <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '5px' }}>
                                                (Az: {p.azimuth}°, El: {p.elevation}°)
                                            </span>
                                        </span>
                                        {p.event === 'rise' && (
                                            <button 
                                                onClick={() => setAlert(selectedSatName, p.time)}
                                                style={{ marginLeft: '10px', padding: '4px 8px', cursor: 'pointer' }}
                                            >
                                                Ustaw alarm
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <div className="map-wrapper">
                <MapContainer center={[53.885, 17.722]} zoom={5} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    <LocationMarker position={observerPos} setPosition={setObserverPos} />
                    <MapUpdater center={targetCenter} />

                    {satellites.map((sat) => {
                        const R = 6371000;
                        const theta = Math.acos(R / (R + sat.elevation));
                        const footprintRadius = R * theta;

                        return (
                            <React.Fragment key={sat.norad_id}>
                                {showFootprint && (
                                    <Circle 
                                        center={[sat.lat, sat.lon]} 
                                        radius={footprintRadius} 
                                        pathOptions={{ color: '#4a90e2', fillColor: '#4a90e2', fillOpacity: 0.1, weight: 1 }} 
                                    />
                                )}

                                <Marker 
                                    position={[sat.lat, sat.lon]} 
                                    icon={getCustomIcon(group)}
                                >
                                    <Popup>
                                        <b>{sat.satellite_name}</b><br />
                                        Wysokość: {(sat.elevation / 1000).toFixed(1)} km<br /><br />
                                        <button onClick={() => checkPasses(sat.satellite_name)}>
                                        Sprawdź widoczność
                                        </button>
                                    </Popup>
                                </Marker>
                                
                                {trails[sat.norad_id] && trails[sat.norad_id].length > 1 && (
                                    <Polyline 
                                        positions={trails[sat.norad_id]} 
                                        color="red" 
                                        weight={3} 
                                        opacity={0.6} 
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
}

export default App;