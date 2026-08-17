import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

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

function App() {
    const [satellites, setSatellites] = useState<Satellite[]>([]);
    const [group, setGroup] = useState<string>('stations');
    const [trails, setTrails] = useState<Record<number, [number, number][]>>({});
    
    const [passes, setPasses] = useState<PassEvent[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingPasses, setLoadingPasses] = useState(false);
    const [selectedSatName, setSelectedSatName] = useState("");
    
    const [observerPos, setObserverPos] = useState<L.LatLng>(new L.LatLng(53.885, 17.722));

    useEffect(() => {
        const fetchSatellites = async () => {
            try {
                const response = await fetch(`http://127.0.0.1:8000/api/satellite-group?group=${group}`);
                const data = await response.json();
                
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

            } catch (error) {
                console.error(error);
            }
        };

        fetchSatellites();
        const intervalId = setInterval(fetchSatellites, 3000);

        return () => clearInterval(intervalId);
    }, [group]);

    useEffect(() => {
        setTrails({});
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

    return (
        <div>
            <div className="controls">
                <label htmlFor="group-select">Konstelacja: </label>
                <select 
                    id="group-select" 
                    value={group} 
                    onChange={(e) => setGroup(e.target.value)}
                >
                    <option value="stations">Stacje kosmiczne</option>
                    <option value="starlink">Starlink</option>
                    <option value="gps-ops">Nawigacja GPS</option>
                    <option value="weather">Satelity pogodowe</option>
                </select>
                <div style={{ marginTop: '10px', fontSize: '0.85em', color: '#555' }}>
                    Kliknij na mapę, aby zmienić miejsce obserwacji.
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
                                    <li key={index}>
                                        <b>{p.event.toUpperCase()}</b>: {new Date(p.time).toLocaleTimeString()} 
                                        (Az: {p.azimuth}°, El: {p.elevation}°)
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <MapContainer center={[53.885, 17.722]} zoom={6} style={{ height: "100vh", width: "100vw" }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <LocationMarker position={observerPos} setPosition={setObserverPos} />

                {satellites.map((sat) => (
                    <React.Fragment key={sat.norad_id}>
                        <Marker position={[sat.lat, sat.lon]}>
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
                ))}
            </MapContainer>
        </div>
    );
}

export default App;