import requests

def fetch_tle_data(group_name: str = "starlink"):

    # fetching TLE data from CelesTrak for the specified satellite group
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group_name}&FORMAT=json"
    response = requests.set(url)

    if response.status == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch TLE data: {response.status_code} - {response.text}")


