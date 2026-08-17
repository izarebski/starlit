from skyfield.api import load, wgs84

def test_satellite_position():
    # 1. Pobierz dane TLE dla stacji kosmicznych (lub np. Starlink)
    url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"
    satellites = load.tle_file(url)
    
    print(f"Załadowano: {len(satellites)} satelitów")
    
    # 2. Znajdź np. Międzynarodową Stację Kosmiczną (ISS)
    by_name = {sat.name.strip(): sat for sat in satellites}
    iss = by_name.get("ISS (ZARYA)")
    
    assert iss is not None, "Nie znaleziono ISS w bazie TLE"
    
    # 3. Zdefiniuj aktualny czas
    ts = load.timescale()
    t = ts.now()
    
    # 4. Oblicz pozycję geograficzną (szerokość, długość, wysokość)
    geocentric = iss.at(t)
    lat, lon = wgs84.latlon_of(geocentric)
    
    print(f"Aktualna pozycja ISS:")
    print(f"Szerokość geograficzna: {lat.degrees:.2f}°")
    print(f"Długość geograficzna: {lon.degrees:.2f}°")

if __name__ == "__main__":
    test_satellite_position()