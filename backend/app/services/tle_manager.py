import os
import time
from skyfield.api import Loader

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(CACHE_DIR, exist_ok=True)
load = Loader(CACHE_DIR)

def get_tle_data(group_name: str):
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group_name}&FORMAT=tle"
    filename = f"{group_name}.tle"
    filepath = os.path.join(CACHE_DIR, filename)

    if os.path.exists(filepath):
        file_age_days = (time.time() - os.path.getmtime(filepath)) / 86400
        if file_age_days > 1:
            os.remove(filepath)

    return load.tle_file(url, filename=filename)