import os
import re
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from sqlalchemy.exc import SQLAlchemyError
from decouple import config

# --- 1. Basic Setup: Logging and Database Configuration ---

# Configure logging to capture progress and errors in a file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ingestion.log", mode='w'), # Overwrite log file on each run
        logging.StreamHandler() # Also print logs to the console
    ]
)

# Define the database file and the root directory for the data
DATABASE_FILE = "database.db"
DATA_ROOT_DIR = "." # Assumes the script is in the root of 'Research' folder

# SQLAlchemy setup
DATABASE_URL = config("DATABASE_URL", default=f"sqlite:///{DATABASE_FILE}") 
engine = create_engine(DATABASE_URL)
Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- 2. Database Schema Definition ---

class Launch(Base):
    """
    SQLAlchemy model for a single radiosonde launch event.
    Each launch corresponds to one .tsv file.
    """
    __tablename__ = "launches"
    id = Column(Integer, primary_key=True, index=True)
    launch_date = Column(DateTime, nullable=False, unique=True)
    filename = Column(String, nullable=False)
    
    # Establish a relationship to the Measurement model
    measurements = relationship("Measurement", back_populates="launch")

class Measurement(Base):
    """
    SQLAlchemy model for a single data point measured during a launch.
    This schema now includes all columns found in a typical data file.
    """
    __tablename__ = "measurements"
    id = Column(Integer, primary_key=True, index=True)
    launch_id = Column(Integer, ForeignKey("launches.id"), nullable=False)
    
    # All available data columns from the files
    time = Column(Float)
    Pscl = Column(Float)
    T = Column(Float)
    RH = Column(Float)
    v = Column(Float)
    u = Column(Float)
    Height = Column(Float)
    P = Column(Float)
    TD = Column(Float)
    MR = Column(Float)
    DD = Column(Float)
    FF = Column(Float)
    AZ = Column(Float)
    Range = Column(Float)
    Lon = Column(Float)
    Lat = Column(Float)
    SpuKey = Column(Integer)
    UsrKey = Column(Integer)
    RadarH = Column(Float)
    
    # Establish a back-reference to the Launch model
    launch = relationship("Launch", back_populates="measurements")

# --- 3. Core Data Processing Functions ---

def find_file_metadata(filepath):
    """
    Reads the header of a .tsv file to find the launch time and the data start line.

    Args:
        filepath (str): The full path to the .tsv file.

    Returns:
        tuple: A tuple containing (launch_time, data_start_line_index).
               Returns (None, -1) if metadata cannot be found.
    """
    launch_time_str = None
    data_start_line = -1
    
    # Regex to find the launch time line, e.g., "Launch time: 2016-06-24 18:26:10 UTC"
    launch_time_regex = re.compile(r"Launch time:\s*(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\sUTC")

    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for i, line in enumerate(f):
                # Search for launch time
                if launch_time_str is None:
                    match = launch_time_regex.search(line)
                    if match:
                        launch_time_str = match.group(1)

                # **IMPROVED LOGIC**: The actual header row contains these specific column names.
                # This is much more reliable than just looking for 'time'.
                if 'time' in line and 'Height' in line and 'Pscl' in line:
                    data_start_line = i
                    # We can stop searching once we find the definitive header
                    if launch_time_str:
                        break
    except IOError as e:
        logging.error(f"Could not read file {filepath}: {e}")
        return None, -1

    if launch_time_str is None:
        logging.warning(f"Could not find 'Launch time:' in {filepath}. Skipping file.")
        return None, -1
        
    if data_start_line == -1:
        logging.warning(f"Could not find data header row (containing 'time', 'Height', 'Pscl') in {filepath}. Skipping file.")
        return None, -1

    # Convert string to datetime object
    launch_time_obj = datetime.strptime(launch_time_str, '%Y-%m-%d %H:%M:%S')
    
    return launch_time_obj, data_start_line

def process_and_load_file(filepath, db_session):
    """
    Processes a single .tsv file and loads its data into the database.
    """
    filename = os.path.basename(filepath)
    logging.info(f"Processing file: {filename}")

    # Step 1: Extract metadata from file header
    launch_date, header_row_index = find_file_metadata(filepath)
    if launch_date is None:
        return # Error already logged in find_file_metadata

    # Check if this launch already exists in the database
    existing_launch = db_session.query(Launch).filter_by(launch_date=launch_date).first()
    if existing_launch:
        logging.warning(f"Launch at {launch_date} from file {filename} already exists. Skipping.")
        return

    # Step 2: Read the tabular data using pandas (Robust Method)
    try:
        # First, manually read the header line to get the exact column names
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            all_lines = f.readlines()
        
        header_line = all_lines[header_row_index].strip()
        column_names = re.split(r'\s+', header_line)

        # **IMPROVED LOGIC**: Read the CSV data, telling pandas to treat -32768 as NaN (Not a Number)
        df = pd.read_csv(
            filepath,
            sep=r'\s+',
            skiprows=header_row_index + 1,
            engine='python',
            names=column_names,
            header=None,
            na_values=[-32768, '-32768.0'] # Handle missing data values
        )
        
        # **IMPROVED LOGIC**: Dynamically use all columns from the file that exist in our DB model
        all_model_columns = [c.name for c in Measurement.__table__.columns]
        
        # Filter dataframe to only include columns that are in our Measurement model
        # This prevents errors if a file has an unexpected extra column.
        cols_to_load = [col for col in df.columns if col in all_model_columns]
        df = df[cols_to_load]

    except Exception as e:
        logging.error(f"Failed to read or parse data for {filename}. Error: {e}. Skipping.")
        return

    if df.empty:
        logging.warning(f"No data found in {filename} after parsing. Skipping.")
        return

    # Step 3: Insert data into the database
    try:
        # Create the parent 'Launch' record
        new_launch = Launch(launch_date=launch_date, filename=filename)
        db_session.add(new_launch)
        db_session.flush() # Flush to get the new_launch.id for the foreign key

        # Prepare the measurement data for bulk insertion
        # Pandas to_dict will convert NaN to None, which SQLAlchemy stores as NULL
        measurements_data = df.to_dict(orient='records')
        for record in measurements_data:
            record['launch_id'] = new_launch.id

        # Use bulk_insert_mappings for high efficiency
        db_session.bulk_insert_mappings(Measurement, measurements_data)
        db_session.commit()
        logging.info(f"Successfully loaded {len(df)} measurements for launch {launch_date}.")

    except SQLAlchemyError as e:
        logging.error(f"Database error while processing {filename}: {e}")
        db_session.rollback()

# --- 4. Main Execution Block ---

def main():
    """
    Main function to set up the database and process all data files.
    """
    logging.info("--- Starting Data Ingestion Script ---")
    
    # Delete existing database file for a clean run
    if os.path.exists(DATABASE_FILE):
        os.remove(DATABASE_FILE)
        logging.info(f"Removed existing database file: {DATABASE_FILE}")

    # Create database tables
    Base.metadata.create_all(bind=engine)
    logging.info("Database tables created.")

    db_session = SessionLocal()

    # Walk through the directory structure to find all .tsv files
    file_paths_to_process = []
    for root, _, files in os.walk(DATA_ROOT_DIR):
        # This logic assumes folders are named like '2016', '2016_01', etc.
        if any(char.isdigit() for char in os.path.basename(root)):
            for file in files:
                if file.lower().endswith('.tsv'):
                    file_paths_to_process.append(os.path.join(root, file))
    
    logging.info(f"Found {len(file_paths_to_process)} .tsv files to process.")

    # Process each file
    for filepath in file_paths_to_process:
        process_and_load_file(filepath, db_session)

    db_session.close()
    logging.info("--- Data Ingestion Script Finished ---")


if __name__ == "__main__":
    main()
