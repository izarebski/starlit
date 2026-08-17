import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

function App() {
    const [satellites, setSatellites] = useState<Satellite[]>([]);

    useEffect(() => {
        const fetchSatellites = async () => {
            try {
                const response = await fetch('http://127.0.0.1:8000/api/satellite-group?group=stations');
                const data = await response.json();
                setSatellites(data.satellites);
            } catch (error) {
                console.error(error);
            }
        };

        fetchSatellites();

        const intervalId = setInterval(fetchSatellites, 3000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <MapContainer center={[0, 0]} zoom={2} style={{ height: "100vh", width: "100vw" }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {satellites.map((sat) => (
                <Marker key={sat.norad_id} position={[sat.lat, sat.lon]}>
                    <Popup>
                        <b>{sat.satellite_name}</b><br />
                        Wysokość: {(sat.elevation / 1000).toFixed(1)} km
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

export default App;