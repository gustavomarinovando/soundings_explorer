# Atmospheric Sounding Explorer

![Render Deploy](https://img.shields.io/badge/Deploy-Render-blue?logo=render) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A web-based scientific platform designed for analyzing atmospheric sounding data from El Alto, La Paz, Bolivia. It provides intuitive visualization and detailed analytical capabilities for radiosonde launch data.

![Main Dashboard](your-image-link-here)

---

### Table of Contents

1. [About the Project](#about-the-project)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)

   * [Prerequisites](#prerequisites)
   * [Backend Setup](#backend-setup)
   * [Frontend Setup](#frontend-setup)
5. [Deployment](#deployment)
6. [Contact](#contact)

---

## About the Project

The **Atmospheric Sounding Explorer** is built to efficiently browse, visualize, and analyze a comprehensive, multi-year dataset of atmospheric soundings from El Alto, La Paz, Bolivia.

**Key Features:**

* **Interactive Calendar:** Easily navigate launches by year and month.
* **Daily Profile Visualization:** Interactive charts displaying Temperature, Pressure, and Relative Humidity against Altitude.
* **Monthly Performance Summary:** Combination bar and line chart summarizing maximum altitude and ascent times.
* **Calculated Statistics:** Essential derived metrics per launch, such as max altitude, min temperature, and max wind speed.
* **Bilingual Interface:** Automatically supports English and Spanish based on browser language settings.

## Tech Stack

* **Backend:** ![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python\&logoColor=white), ![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi\&logoColor=white)
* **Frontend:** ![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react\&logoColor=black), ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript\&logoColor=white), ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite\&logoColor=white), ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css\&logoColor=white), ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?logo=chart.js\&logoColor=white)
* **Database:** ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql\&logoColor=white) (production), ![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite\&logoColor=white) (local development)
* **Deployment:** ![Render](https://img.shields.io/badge/Render-46E3B7?logo=render\&logoColor=white)

## Project Structure

```
/
|-- scientific-platform-frontend/  (React frontend application)
|-- data/                          (Root for local .tsv data folders, e.g., 2016/)
|-- ingest.py                      (Script to parse .tsv files and load into database)
|-- main.py                        (FastAPI backend application)
|-- requirements.txt               (Python dependencies)
|-- build.sh                       (Build script for Render)
|-- .gitignore
|-- README.md
```

## Getting Started

Follow these steps to set up the project locally for development and testing.

### Prerequisites

Ensure the following are installed:

* **Python 3.9+**
* **Node.js and npm**
* **Deno**

Check installations:

```sh
python --version
node --version
deno --version
```

### Backend Setup

1. **Clone the repository**

```sh
git clone https://github.com/gustavomarinovando/soundings_explorer/
cd soundings_explorer
```

2. **Create and activate a virtual environment**

```sh
# macOS / Linux
python3 -m venv myenv
source myenv/bin/activate

# Windows
python -m venv myenv
myenv\Scripts\activate
```

3. **Install Python dependencies**

```sh
pip install -r requirements.txt
```

4. **Create a `.env` file for database configuration**

```sh
echo "DATABASE_URL=sqlite:///./database.db" > .env
```

5. **Run data ingestion script** (assuming data is in the `data/` folder)

```sh
python ingest.py
```

6. **Start backend**
```sh
uvicorn main:app --reload
```
### Frontend Setup

1. **Navigate to the frontend directory and install dependencies:**

```sh
cd scientific-platform-frontend
deno install
```

2. **Start the frontend server:**

```sh
deno task dev
```

### Check the running app

The application should now be running:

* **Frontend:** `http://localhost:5173`
* **Backend API:** `http://127.0.0.1:8000`

## Deployment

Deployment is configured through **Render**. Ensure you:

* Connect your Git repository to Render.
* Configure the environment variables (`DATABASE_URL`, etc.) in Render's dashboard.
* Render uses the provided `build.sh` script for automatic deployment.

## Contact

Gustavo Marin Ovando - gustavomarinovando@gmail.com

Repository Link: [Atmospheric Sounding Explorer](https://github.com/gustavomarinovando/soundings_explorer/)

Deployed App: [Atmospheric Sounding Explorer](https://soundings-explorer.onrender.com/)