from skyfield.api import Topos
from datetime import datetime, timedelta, timezone
from app.services.tle_manager import get_tle_data, load

def satellite_passes(group_name: str, sat_name: str, lat: float, lon: float, days_ahead: int = 1):
    
    # fetching TLE data from CelesTrak for the specified satellite group
    satellites = get_tle_data(group_name)
    by_name = {s.name.strip(): s for s in satellites}
    sat = by_name.get(sat_name)


    if not sat:
        raise ValueError(f"Satelita o nazwie '{sat_name}' nie został znaleziony. Sprawdź terminal, aby zobaczyć listę poprawnych nazw.")

    ts = load.timescale()
    
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days_ahead)

    ts_start = ts.from_datetime(now)
    ts_end= ts.from_datetime(end)

    # observer coords
    observer = Topos(latitude_degrees=lat, longitude_degrees=lon)

    t, events = sat.find_events(observer, ts_start, ts_end, altitude_degrees=0)
    
    pass_events = []
    for ti, event in zip(t, events):
        name = ('rise', 'culminate', 'set')[event]

        difference = sat - observer
        topocentric = difference.at(ti)
        alt, az, distance = topocentric.altaz()

        pass_events.append({
            "time": ti.utc_iso(),
            "event": name,
            "distance": distance.km,
            "azimuth": round(az.degrees, 2),
            "elevation": round(alt.degrees, 2)
        })
        
    return pass_events