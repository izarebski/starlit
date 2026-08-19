# Satellite Tracker 🛰️

> An interactive web application for tracking Earth-orbiting satellites in real-time.

<img width="1919" height="945" alt="image" src="https://github.com/user-attachments/assets/f90c24d4-de62-4728-9266-36d91b61f9da" />


## 🌟 About the Project

Satellite Tracker is a full-stack WebGIS application designed to track and visualize spatial data regarding objects in Earth's orbit. The system fetches TLE (Two-Line Element) data from the CelesTrak API and displays satellite positions on an interactive map.

The application features a stateless backend architecture built with FastAPI. It performs real-time orbital mechanics calculations on the fly using the Python Skyfield library and streams the updated coordinates directly to the frontend via WebSockets, ensuring smooth, low-latency tracking without the need for persistent database storage.

## ✨ Key Features

- **Real-time Tracking:** Dynamic updating of satellite positions on the map.
- **Footprint Calculation:** Visualization of the satellite's visibility area on the Earth's surface using spatial buffers.
- **Motion Vectors:** Displaying the current direction and flight trajectory of the objects.
- **Dynamic Basemaps (Dark/Light Mode):** Seamless switching between light (OpenStreetMap) and dark (CARTO Dark Matter) map styles, adjusting the entire UI accordingly.
- **Search and Filtering:** Quick access to specific space stations and satellites via the side panel, including a "Favorites" feature.
- **Geolocation:** Automatically centering the map on the user's current position.

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript, Leaflet
- **Backend API:** Python, FastAPI, Uvicorn
- **Real-time Communication:** WebSockets
- **Data Processing:** Skyfield
- **Data Validation:** Pydantic
- **Basemaps:** OpenStreetMap, CARTO

## 🚀 How to Run Locally

To run the application on your local machine, follow these instructions:

### 1. Backend Setup

Navigate to the backend directory, create a virtual environment, activate it, and install dependencies:

```
  cd backend
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt
```

Note: If you are using macOS or Linux, activate the virtual environment using the following command instead: 
```
  source venv/bin/activate
```

Run the application:

```
  uvicorn app.main:app --reload
```
## 2. Frontend Setup

Open a new terminal tab, navigate to the frontend directory, install packages, and start the interface:

```
  cd frontend
  npm install
  npm start
```

Run the application:

```
 npm run start
```

## 👤 Author
GitHub: https://github.com/izarebski

LinkedIn: https://www.linkedin.com/in/igor-zar%C4%99bski-4623213aa/
