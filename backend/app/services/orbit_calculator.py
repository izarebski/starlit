import math

from skyfield.api import load, wgs84
from app.services.tle_manager import get_tle_data, load

def satellite_coords(group_name: str, sat_name: str):

    # fetching TLE data from CelesTrak for the specified satellite group
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group_name}&FORMAT=tle"
    satellites = load.tle_file(url)

    # map satellites by their names for quick lookup
    by_name = {sat.name.strip(): sat for sat in satellites}
    satellite = by_name.get(group_name)

    if not satellite:
        raise ValueError(f"Satellite not found: {group_name}")

    # defining the timescale and get the current time object
    ts = load.timescale()
    ts_now = ts.now()

    # calculating the geocentric position of the satellite at the given time
    geocentric = satellite.at(ts_now)

    # extracting position, velocity, and distance vectors
    position_vector = geocentric.position.km
    velocity_vector = geocentric.velocity.km_per_s
    distance_km = geocentric.distance().km

    # projecting the geocentric position onto the WGS84 reference ellipsoid
    subpoint = wgs84.subpoint(geocentric)
    lat = subpoint.latitude.degrees
    lon = subpoint.longitude.degrees
    elevation = subpoint.elevation.m

    
    return {
        "satellite_name": group_name,
        "norad_id": satellite.model.satnum,
        "distance": distance_km,
        "lat": lat,
        "lon": lon,
        "elevation": elevation,
        "position_x_y_z": list(position_vector),
        "velocity_x_y_z": list(velocity_vector),
    }

def group_coords(group_name: str):
    satellites = get_tle_data(group_name)
    ts = load.timescale()
    ts_now = ts.now()
    
    results = []
    for satellite in satellites:
        geocentric = satellite.at(ts_now)
        subpoint = wgs84.subpoint(geocentric)
        velocity_vector = geocentric.velocity.km_per_s
        speed = math.sqrt(sum(v ** 2 for v in velocity_vector))
        
        results.append({
            "satellite_name": satellite.name.strip(),
            "norad_id": satellite.model.satnum,
            "lat": subpoint.latitude.degrees,
            "lon": subpoint.longitude.degrees,
            "elevation": subpoint.elevation.m,
            "inclination": round(math.degrees(satellite.model.inclo), 2),
            "velocity": round(speed, 2)
        })
        
    return results