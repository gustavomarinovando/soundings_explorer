import logging
import math
from datetime import datetime
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, func, extract
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
from pydantic import BaseModel
from decouple import config

# --- 1. Database and Model Setup (No changes here) ---

DATABASE_URL = config("DATABASE_URL", default="sqlite:///./database.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy Models (No changes here)
class Launch(Base):
    __tablename__ = "launches"
    id = Column(Integer, primary_key=True, index=True)
    launch_date = Column(DateTime, nullable=False, unique=True)
    filename = Column(String, nullable=False)
    measurements = relationship("Measurement", back_populates="launch")

class Measurement(Base):
    __tablename__ = "measurements"
    id = Column(Integer, primary_key=True, index=True)
    launch_id = Column(Integer, ForeignKey("launches.id"), nullable=False)
    time = Column(Float); Pscl = Column(Float); T = Column(Float); RH = Column(Float); v = Column(Float); u = Column(Float); Height = Column(Float); P = Column(Float); TD = Column(Float); MR = Column(Float); DD = Column(Float); FF = Column(Float); AZ = Column(Float); Range = Column(Float); Lon = Column(Float); Lat = Column(Float); SpuKey = Column(Integer); UsrKey = Column(Integer); RadarH = Column(Float)
    launch = relationship("Launch", back_populates="measurements")

# --- 2. Pydantic Schemas ---
class LaunchSchema(BaseModel):
    id: int; launch_date: datetime; filename: str
    class Config: from_attributes = True

class MeasurementSchema(BaseModel):
    id: int; launch_id: int; time: Optional[float] = None; Height: Optional[float] = None; T: Optional[float] = None; RH: Optional[float] = None; P: Optional[float] = None; Lon: Optional[float] = None; Lat: Optional[float] = None; u: Optional[float] = None; v: Optional[float] = None; Pscl: Optional[float] = None; TD: Optional[float] = None; MR: Optional[float] = None; DD: Optional[float] = None; FF: Optional[float] = None; AZ: Optional[float] = None; Range: Optional[float] = None; SpuKey: Optional[int] = None; UsrKey: Optional[int] = None; RadarH: Optional[float] = None
    class Config: from_attributes = True

# NEW: Schema for our monthly performance endpoint
class MonthlyPerformanceData(BaseModel):
    day: int
    max_altitude: float
    ascent_time: float

# --- 3. FastAPI Application Setup ---
app = FastAPI(title="Atmospheric Sounding API", description="API for accessing radiosonde launch data from La Paz, Bolivia.", version="1.0.0")
origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- 4. API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Atmospheric Sounding API. Go to /docs for documentation."}

@app.get("/launches", response_model=List[LaunchSchema])
def get_all_launches(db: Session = Depends(get_db)):
    launches = db.query(Launch).order_by(Launch.launch_date.desc()).all()
    return launches

@app.get("/launches/{launch_id}", response_model=List[MeasurementSchema])
def get_measurements_for_launch(launch_id: int, db: Session = Depends(get_db)):
    launch = db.query(Launch).filter(Launch.id == launch_id).first()
    if not launch: raise HTTPException(status_code=404, detail=f"Launch with ID {launch_id} not found.")
    measurements = db.query(Measurement).filter(Measurement.launch_id == launch_id).order_by(Measurement.time).all()
    return measurements

# --- NEW: Monthly Performance Endpoint ---
@app.get("/performance/monthly/{year}/{month}", response_model=List[MonthlyPerformanceData])
def get_monthly_performance(year: int, month: int, db: Session = Depends(get_db)):
    """
    Calculates the max altitude and ascent time for each day in a given month that has a launch.
    """
    # This subquery finds the max height and time for each launch
    subquery = db.query(
        Measurement.launch_id,
        func.max(Measurement.Height).label("max_altitude"),
        func.max(Measurement.time).label("max_time")
    ).group_by(Measurement.launch_id).subquery()

    # This query joins the launch info with the calculated stats
    results = db.query(
        Launch.launch_date,
        subquery.c.max_altitude,
        subquery.c.max_time
    ).join(subquery, Launch.id == subquery.c.launch_id).filter(
        extract('year', Launch.launch_date) == year,
        extract('month', Launch.launch_date) == month
    ).order_by(Launch.launch_date).all()

    performance_data = [
        {
            "day": result.launch_date.day,
            "max_altitude": result.max_altitude,
            "ascent_time": result.max_time / 60 if result.max_time else 0
        }
        for result in results
    ]
    
    # In case of multiple launches on the same day, we take the one with the highest altitude
    final_data = {}
    for record in performance_data:
        day = record['day']
        if day not in final_data or record['max_altitude'] > final_data[day]['max_altitude']:
            final_data[day] = record

    return list(final_data.values())


# --- 5. Main execution block ---
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
