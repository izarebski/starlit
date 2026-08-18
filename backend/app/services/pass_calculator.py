from skyfield.api import Topos, wgs84
from datetime import datetime, timedelta, timezone
from app.services.tle_manager import get_tle_data, load

def satellite_passes(group_name: str, sat_name: str, lat: float, lon: float, days_ahead: int = 1):
    satellites = get_tle_data(group_name)
    
    sat = next((s for s in satellites if s.name.strip().upper() == sat_name.strip().upper()), None)

    if not sat:
        raise ValueError(f"Satelita '{sat_name}' nie został znaleziony.")

    ts = load.timescale()
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days_ahead)

    ts_start = ts.from_datetime(now)
    ts_end = ts.from_datetime(end)

    observer = Topos(latitude_degrees=lat, longitude_degrees=lon)

    t, events = sat.find_events(observer, ts_start, ts_end, altitude_degrees=0)

    pass_events = []
    trajectory_list = []

    rises = []
    sets = []

    for ti, event in zip(t, events):
        name = ('rise', 'culminate', 'set')[event]

        difference = sat - observer
        topocentric = difference.at(ti)

        alt, az, distance = topocentric.altaz()

        pass_events.append({
            "time": ti.utc_iso(),
            "event": name,
            "distance": float(distance.km),
            "azimuth": round(float(az.degrees), 2),
            "elevation": round(float(alt.degrees), 2)
        })

        if event == 0:
            rises.append(ti)
        elif event == 2:
            sets.append(ti)

    if rises and sets:
        rise_time = rises[0]
        set_time = sets[0]
        
        step = (set_time.tt - rise_time.tt) / 100.0
        for i in range(100):
            t_step = ts.tt(jd=(rise_time.tt + step * i))
            geocentric = sat.at(t_step)
            subpoint = wgs84.subpoint(geocentric)
            
            trajectory_list.append([
                float(subpoint.latitude.degrees),
                float(subpoint.longitude.degrees)
            ])

    return {
        "passes": pass_events,
        "trajectory": trajectory_list
    }