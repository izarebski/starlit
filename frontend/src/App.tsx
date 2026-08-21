import React, { useEffect, useState, useRef } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
    useMapEvents,
    Circle,
    useMap,
} from "react-leaflet";
import toast, { Toaster } from "react-hot-toast";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

import issImg from "./assets/iss.png";
import starlinkImg from "./assets/starlink.png";
import gpsImg from "./assets/gps.png";
import weatherImg from "./assets/weather.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const stationIcon = new L.Icon({
    iconUrl: issImg,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
});

const satIcon = new L.Icon({
    iconUrl: starlinkImg,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
});

const gpsIcon = new L.Icon({
    iconUrl: gpsImg,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
});

const weatherIcon = new L.Icon({
    iconUrl: weatherImg,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
});

const defaultIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    shadowSize: [41, 41],
});

const getCustomIcon = (groupName: string) => {
    if (groupName === "stations") return stationIcon;
    if (groupName === "starlink") return satIcon;
    if (groupName === "gps-ops") return gpsIcon;
    if (groupName === "weather") return weatherIcon;
    return defaultIcon;
};

const DEFAULT_CENTER: [number, number] = [0, 0];
const DEFAULT_ZOOM = 2;

interface Satellite {
    satellite_name: string;
    norad_id: number;
    lat: number;
    lon: number;
    elevation: number;
    velocity: number;
    inclination: number;
}

interface PassEvent {
    time: string;
    event: string;
    azimuth: number;
    elevation: number;
}

function LocationMarker({
    position,
    setPosition,
}: {
    position: L.LatLng;
    setPosition: (pos: L.LatLng) => void;
}) {
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

function MapUpdater({
    center,
    zoom,
}: {
    center: [number, number] | null;
    zoom: number;
}) {
    const map = useMap();

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => clearTimeout(timeoutId);
    }, [map]);

    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { animate: true, duration: 1.5 });
        }
    }, [center, zoom, map]);

    return null;
}

function App() {
    const [satellites, setSatellites] = useState<Satellite[]>([]);
    const [group, setGroup] = useState<string>("stations");
    const [trails, setTrails] = useState<Record<number, [number, number][]>>({});

    const [favorites, setFavorites] = useState<number[]>(() => {
        const saved = localStorage.getItem("satellite_favorites");
        return saved ? JSON.parse(saved) : [];
    });

    const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        const saved = localStorage.getItem("satellite_dark_mode");
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [passes, setPasses] = useState<PassEvent[]>([]);
    const [predictedPath, setPredictedPath] = useState<[number, number][]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingPasses, setLoadingPasses] = useState(false);
    const [selectedSatName, setSelectedSatName] = useState("");

    const [observerPos, setObserverPos] = useState<L.LatLng>(
        new L.LatLng(53.885, 17.722),
    );
    const [showFootprint, setShowFootprint] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [targetCenter, setTargetCenter] = useState(DEFAULT_CENTER);
    const [targetZoom, setTargetZoom] = useState(DEFAULT_ZOOM);

    const notificationTimers = useRef<Record<string, number>>({});

    const [selectedSatellite, setSelectedSatellite] = useState<Satellite | null>(
        null,
    );

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("satellite_favorites", JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        localStorage.setItem("dark_mode", JSON.stringify(darkMode));
    }, [darkMode]);

    useEffect(() => {
        const ws = new WebSocket(
            `ws://127.0.0.1:8000/api/ws/satellite-group?group=${group}`,
        );

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setSatellites(data.satellites);

            setTrails((prevTrails) => {
                const newTrails = { ...prevTrails };
                data.satellites.forEach((sat: Satellite) => {
                    const currentTrail = prevTrails[sat.norad_id] || [];
                    const updatedTrail = [
                        ...currentTrail,
                        [sat.lat, sat.lon] as [number, number],
                    ];

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

    const toggleFavorite = (noradId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorites((prev) => {
            if (prev.includes(noradId)) {
                toast.success("Usunięto z ulubionych");
                return prev.filter((id) => id !== noradId);
            } else {
                toast.success("Dodano do ulubionych ⭐");
                return [...prev, noradId];
            }
        });
    };

    const handleSelectSatellite = (sat: Satellite) => {
        setSelectedSatellite(sat);
        setTargetZoom(5);
        focusOnSatellite(sat.lat, sat.lon);
    };

    const handleResetMap = () => {
        setSelectedSatellite(null);
        setTargetCenter(DEFAULT_CENTER);
        setTargetZoom(DEFAULT_ZOOM);
    };

    const locateUser = () => {
        if ("geolocation" in navigator) {
            toast.loading("Szukanie Twojej lokalizacji...", { id: "geo-toast" });
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newPos = new L.LatLng(
                        position.coords.latitude,
                        position.coords.longitude,
                    );
                    setObserverPos(newPos);
                    setTargetCenter([newPos.lat, newPos.lng]);
                    toast.success("Znaleziono!", { id: "geo-toast" });
                },
                () => {
                    toast.error("Nie udało się pobrać lokalizacji.", { id: "geo-toast" });
                },
            );
        } else {
            toast.error("Twoja przeglądarka nie obsługuje geolokalizacji.");
        }
    };

    const checkPasses = async (satName: string) => {
        setSelectedSatName(satName);
        setIsModalOpen(true);
        setLoadingPasses(true);
        setPasses([]);
        setPredictedPath([]);

        try {
            const url = `http://127.0.0.1:8000/api/satellite-passes?group=${group}&name=${encodeURIComponent(satName)}&lat=${observerPos.lat}&lon=${observerPos.lng}&days=1`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.passes) {
                setPasses(data.passes);
            } else if (Array.isArray(data)) {
                setPasses(data);
            }

            if (data.trajectory) {
                setPredictedPath(data.trajectory);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingPasses(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setPredictedPath([]);
    };

    const setAlert = (satName: string, passTimeISO: string) => {
        const passTimeMs = new Date(passTimeISO).getTime();
        const nowMs = new Date().getTime();
        const timeToPass = passTimeMs - nowMs;
        const notifyTime = timeToPass - 5 * 60 * 1000;

        if (notifyTime > 0) {
            if (notificationTimers.current[satName]) {
                clearTimeout(notificationTimers.current[satName]);
            }

            notificationTimers.current[satName] = setTimeout(() => {
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("🛰️ Przelot Satelity", {
                        body: `Obiekt ${satName} pojawi się na horyzoncie za 5 minut!`,
                        icon: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                    });
                } else {
                    toast(`Obiekt ${satName} pojawi się na horyzoncie za 5 minut!`, {
                        icon: "🛰️",
                        duration: 8000,
                    });
                }
                delete notificationTimers.current[satName];
            }, notifyTime);

            toast.success(`Ustawiono alarm! Powiadomimy Cię 5 min przed przelotem.`, {
                duration: 4000,
            });
        } else {
            toast.error("Ten przelot jest zbyt blisko lub już minął.", {
                duration: 4000,
            });
        }
    };

    const filteredSatellites = satellites
        .filter((sat) => {
            const matchesSearch = sat.satellite_name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesFavoriteFilter = showOnlyFavorites
                ? favorites.includes(sat.norad_id)
                : true;
            return matchesSearch && matchesFavoriteFilter;
        })
        .slice(0, 50);

    const focusOnSatellite = (lat: number, lon: number) => {
        setTargetCenter([lat, lon]);
    };

    return (
        <div className={`app-container ${darkMode ? "dark-theme" : "light-theme"}`}>
            <Toaster position="top-right" />
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="flex-left-right">
                        <h2>Starlit</h2>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            style={{
                                background: darkMode ? "#4a5568" : "#e2e8f0",
                                color: darkMode ? "#ffd700" : "#d69e2e",
                                border: "none",
                                borderRadius: "20px",
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontWeight: "bold",
                            }}
                        >
                            {darkMode ? "☀️ Jasny" : "🌙 Ciemny"}
                        </button>
                    </div>
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

                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                        <label className="checkbox-label" style={{ marginBottom: 0 }}>
                            <input
                                type="checkbox"
                                checked={showFootprint}
                                onChange={(e) => setShowFootprint(e.target.checked)}
                            />
                            Zasięg widoczności
                        </label>

                        <button
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            style={{
                                background: showOnlyFavorites ? "#ffc107" : "#e9ecef",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                padding: "2px 8px",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontWeight: "bold",
                            }}
                        >
                            ⭐ Tylko ulubione
                        </button>
                    </div>

                    <div className="observer-hint">
                        <button
                            className="localize-btn"
                            onClick={locateUser}
                            style={{
                                marginBottom: "8px",
                                width: "100%",
                                padding: "8px",
                                cursor: "pointer",
                            }}
                        >
                            Zlokalizuj mnie automatycznie
                        </button>
                        Lokalizację możesz też zmienić klikając na mapę.
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
                    {filteredSatellites.map((sat) => {
                        const isFav = favorites.includes(sat.norad_id);
                        return (
                            <div key={sat.norad_id} className={`${selectedSatellite?.norad_id === sat.norad_id ? "sidebar-item-selected" : "sidebar-item"}`}>
                                <div className="sidebar-item-name">
                                    <span
                                        onClick={(e) => toggleFavorite(sat.norad_id, e)}
                                        style={{ cursor: "pointer", fontSize: "1.1rem" }}
                                        title={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                                    >
                                        {isFav ? "⭐" : "☆"}
                                    </span>
                                    <span
                                        className="sat-name"
                                        style={{
                                            whiteSpace: "nowrap",
                                            textOverflow: "ellipsis",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {sat.satellite_name}
                                    </span>
                                </div>
                                {selectedSatellite?.norad_id !== sat.norad_id && (
                                    <button className="btn" onClick={() => handleSelectSatellite(sat)}>
                                        Rozwiń
                                    </button>
                                )}
                                {selectedSatellite?.norad_id === sat.norad_id && (
                                    <div className="sat-details-expanded">
                                        <p>Wysokość: {(sat.elevation / 1000).toFixed(0)} km</p>
                                        <p>Prędkość: {sat.velocity} km/s</p>
                                        <p>Inklinacja: {sat.inclination}°</p>
                                        <div className="flex-left-right">
                                            <button className="btn" onClick={() => checkPasses(sat.satellite_name)}>
                                                Sprawdź widoczność
                                            </button>
                                            <button
                                                className="close-details-btn"
                                                onClick={() => handleResetMap()}
                                            >
                                                Zamknij
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filteredSatellites.length === 0 && (
                        <div className="no-results">Brak wyników</div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Przeloty: {selectedSatName}</h3>
                            <button className="close-btn" onClick={closeModal}>
                                X
                            </button>
                        </div>
                        {loadingPasses ? (
                            <p>Obliczanie trajektorii...</p>
                        ) : (
                            <ul>
                                {passes.map((p, index) => (
                                    <li
                                        key={index}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span>
                                            <b>{p.event.toUpperCase()}</b>:{" "}
                                            {new Date(p.time).toLocaleTimeString()}
                                            <span
                                                style={{
                                                    fontSize: "0.85em",
                                                    color: "#666",
                                                    marginLeft: "5px",
                                                }}
                                            >
                                                (Az: {p.azimuth}°, El: {p.elevation}°)
                                            </span>
                                        </span>
                                        {p.event === "rise" && (
                                            <button
                                                onClick={() => setAlert(selectedSatName, p.time)}
                                                style={{
                                                    marginLeft: "10px",
                                                    padding: "4px 8px",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                ⏰ Ustaw alarm
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <div
                className="map-wrapper"
                style={{
                    filter: darkMode
                        ? "brightness(0.6) saturate(0.5) contrast(1.2)"
                        : "none",
                }}
            >
                <MapContainer
                    center={[0, 0]}
                    minZoom={2}
                    zoom={2}
                    maxBounds={[
                        [-90, -300],
                        [90, 300],
                    ]}
                    maxBoundsViscosity={1.2}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <LocationMarker position={observerPos} setPosition={setObserverPos} />
                    <MapUpdater center={targetCenter} zoom={targetZoom} />

                    {predictedPath.length > 0 && (
                        <Polyline
                            positions={predictedPath}
                            color="yellow"
                            weight={4}
                            dashArray="10, 10"
                        />
                    )}

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
                                        pathOptions={{
                                            color: "#4a90e2",
                                            fillColor: "#4a90e2",
                                            fillOpacity: 0.1,
                                            weight: 1,
                                        }}
                                    />
                                )}

                                <Marker
                                    position={[sat.lat, sat.lon]}
                                    icon={getCustomIcon(group)}
                                    eventHandlers={{
                                        click: () => {
                                            handleSelectSatellite(sat);
                                        }
                                    }}
                                >
                                </Marker>

                                {trails[sat.norad_id] && trails[sat.norad_id].length > 1 && (
                                    <Polyline
                                        positions={trails[sat.norad_id]}
                                        color="#e71b1b"
                                        weight={3}
                                        opacity={0.7}
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
