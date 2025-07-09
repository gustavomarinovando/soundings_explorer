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
from decouple import config # Import config from decouple

# --- 1. Database and Model Setup ---

# Use decouple to get the DATABASE_URL.
# It defaults to your local SQLite DB if the environment variable is not set.
DATABASE_URL = config("RENDER_DATABASE_URL", default="sqlite:///./database.db")

# The 'connect_args' is only for SQLite.
# Create the engine without it for production.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# (SQLAlchemy Models remain the same)
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

# (Pydantic Schemas remain the same)
class LaunchSchema(BaseModel):
    id: int; launch_date: datetime; filename: str
    class Config: from_attributes = True
class MeasurementSchema(BaseModel):
    id: int; launch_id: int; time: Optional[float] = None; Height: Optional[float] = None; T: Optional[float] = None; RH: Optional[float] = None; P: Optional[float] = None; Lon: Optional[float] = None; Lat: Optional[float] = None; u: Optional[float] = None; v: Optional[float] = None; Pscl: Optional[float] = None; TD: Optional[float] = None; MR: Optional[float] = None; DD: Optional[float] = None; FF: Optional[float] = None; AZ: Optional[float] = None; Range: Optional[float] = None; SpuKey: Optional[int] = None; UsrKey: Optional[int] = None; RadarH: Optional[float] = None
    class Config: from_attributes = True
class MonthlyPerformanceData(BaseModel):
    day: int; max_altitude: float; ascent_time: float

# --- 3. FastAPI Application Setup ---
app = FastAPI(title="Atmospheric Sounding API", description="API for accessing radiosonde launch data from La Paz, Bolivia.", version="1.0.0")

# --- NEW: Production-Ready CORS Setup ---
# Read the frontend URL from environment variables, defaulting to local dev URLs
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173,http://127.0.0.1:5173")
origins = [url.strip() for url in FRONTEND_URL.split(",")]

app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# (The rest of the file remains the same)
# ...
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

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

    def sanitize_float(val):
        try:
            if val is None:
                return None
            if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                return None
            return val
        except:
            return None

    def clean_measurement(m):
        return MeasurementSchema(
            id=m.id,
            launch_id=m.launch_id,
            time=sanitize_float(m.time),
            Height=sanitize_float(m.Height),
            T=sanitize_float(m.T),
            RH=sanitize_float(m.RH),
            P=sanitize_float(m.P),
            Lon=sanitize_float(m.Lon),
            Lat=sanitize_float(m.Lat),
            u=sanitize_float(m.u),
            v=sanitize_float(m.v),
            Pscl=sanitize_float(m.Pscl),
            TD=sanitize_float(m.TD),
            MR=sanitize_float(m.MR),
            DD=sanitize_float(m.DD),
            FF=sanitize_float(m.FF),
            AZ=sanitize_float(m.AZ),
            Range=sanitize_float(m.Range),
            SpuKey=m.SpuKey,
            UsrKey=m.UsrKey,
            RadarH=sanitize_float(m.RadarH)
        )

    sanitized_measurements = [clean_measurement(m) for m in measurements]
    return sanitized_measurements

@app.get("/performance/monthly/{year}/{month}", response_model=List[MonthlyPerformanceData])
def get_monthly_performance(year: int, month: int, db: Session = Depends(get_db)):
    subquery = db.query(Measurement.launch_id, func.max(Measurement.Height).label("max_altitude"), func.max(Measurement.time).label("max_time")).group_by(Measurement.launch_id).subquery()
    results = db.query(Launch.launch_date, subquery.c.max_altitude, subquery.c.max_time).join(subquery, Launch.id == subquery.c.launch_id).filter(extract('year', Launch.launch_date) == year, extract('month', Launch.launch_date) == month).order_by(Launch.launch_date).all()
    performance_data = [{"day": result.launch_date.day, "max_altitude": result.max_altitude, "ascent_time": result.max_time / 60 if result.max_time else 0} for result in results]
    final_data = {}
    for record in performance_data:
        day = record['day']
        if day not in final_data or record['max_altitude'] > final_data[day]['max_altitude']:
            final_data[day] = record
    return list(final_data.values())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
