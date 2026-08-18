from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import asyncio
from app.services.orbit_calculator import satellite_coords, group_coords
from app.services.pass_calculator import satellite_passes

router = APIRouter()

@router.get("/satellite-position")
def satellite_position(group: str = "starlink", name: str = "STARLINK-30113"):
    try:
        result = satellite_coords(group_name=group, sat_name=name)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/satellite-group")
def get_satellite_group_positions(group: str = "stations"):
    try:
        result = group_coords(group_name=group)
        return {"group": group, "count": len(result), "satellites": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/satellite-passes")
def get_satellite_passes_endpoint(group: str, name: str, lat: float, lon: float, days: int = 1):
    try:
        result = satellite_passes(group_name=group, sat_name=name, lat=lat, lon=lon, days_ahead=days)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.websocket("/ws/satellite-group")
async def websocket_satellite_group(websocket: WebSocket, group: str):
    await websocket.accept()
    try:
        while True:
            result = group_coords(group_name=group)
            data = {"group": group, "count": len(result), "satellites": result}
            
            await websocket.send_json(data)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass