import { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement as ChartJsLine,
  LineController,
  BarElement,
  CategoryScale,
  BarController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(LinearScale, PointElement, ChartJsLine, LineController, Title, Tooltip, Legend, BarElement, CategoryScale, BarController);
import { Chart } from 'react-chartjs-2';
import './App.css';


// --- TypeScript Type Definitions ---
type Launch = { id: number; launch_date: string; filename: string; };
type Measurement = { id: number; launch_id: number; time: number | null; Height: number | null; T: number | null; RH: number | null; P: number | null; u: number | null; v: number | null; Lon: number | null; Lat: number | null; DD: number | null; FF: number | null; MR: number | null; TD: number | null; };
type Language = 'en' | 'es';
type MonthlyPerformanceData = { day: number; max_altitude: number; ascent_time: number; launch_date: string; };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);

// --- Translation & Helper Functions ---
const translations = {
  en: { 
    platformTitle: "Atmospheric Sounding Explorer", 
    platformSubtitle: "Vaisala RS92-SGP Radiosonde Data - El Alto, La Paz, Bolivia", 
    selectLaunch: "Select a Launch", 
    summaryTitle: "Launch Summary", 
    selectedLaunch: "Selected Launch", 
    maxAltitude: "Max Altitude", 
    burstPressure: "Burst Point Pressure", 
    surfaceTemp: "Surface Temp.", 
    surfaceRH: "Surface RH", 
    ascentTime: "Total Ascent Time", 
    ascentSpeed: "Avg. Ascent Speed", 
    minTemp: "Min. Temperature", 
    maxWind: "Max Wind Speed", 
    at: "at", 
    loading: "Loading...", 
    noData: "No measurement data available for this launch.", 
    selectDay: "Select a day from the calendar to view a launch", 
    multiLaunchTitle: "Multiple launches on this day", 
    multiLaunchSub: "Please select one to view its data.", 
    close: "Close", 
    mainChartTitle: "Atmospheric Profiles vs Altitude", 
    tempChartTitle: "Temperature", 
    pressureChartTitle: "Pressure", 
    rhChartTitle: "Relative Humidity", 
    dewPointChartTitle: "Dew Point Temperature", 
    windComponentsChartTitle: "Wind Components", 
    mixingRatioChartTitle: "Mixing Ratio", 
    tempAxis: "Temperature (°C)", 
    pressureAxis: "Pressure (hPa)", 
    rhAxis: "Relative Humidity (%)", 
    altitudeAxis: "Altitude (km)", 
    dewPointAxis: "Dew Point (°C)", 
    windSpeedAxis: "Horizontal", 
    windAxis: "Wind Speed (m/s)",
    windDirection: "Direction", 
    zonalWindAxis: "Zonal", 
    meridionalWindAxis: "Meridional", 
    mixingRatioAxis: "Mixing Ratio (g/kg)", 
    monthlySummaryTitle: "Monthly Summary", 
    monthDayAxis: "Day of the month",
    copyrightText: "All available information is property of SENAMHI. Thanks for sharing with UPB for research purposes.",
    expandSummary: "Expand Summary", 
    collapseSummary: "Collapse Summary", 
    soundingStatistics: "Sounding Statistics", 
    min: "Min", // New
    max: "Max", // New
    stdDev: "Std. Dev.", // New
    temp: "Temperature", // New
    pressure: "Pressure", // New
    rh: "Relative Humidity", // New
    dewPoint: "Dew Point", // New
    wind: "Wind Speed", // New
    mixingRatio: "Mixing Ratio", // New
  },
  es: { 
    platformTitle: "Explorador de Sondeos Atmosféricos", 
    platformSubtitle: "Datos de Radiosonda Vaisala RS92-SGP - El Alto, La Paz, Bolivia", 
    selectLaunch: "Seleccionar Lanzamiento", 
    summaryTitle: "Resumen del Lanzamiento", 
    selectedLaunch: "Lanzamiento Seleccionado", 
    maxAltitude: "Altitud Máx", 
    burstPressure: "Presión de Ruptura", 
    surfaceTemp: "Temp. Superficie", 
    surfaceRH: "HR Superficie", 
    ascentTime: "Tiempo de Ascenso", 
    ascentSpeed: "Vel. Ascenso Prom.", 
    minTemp: "Temp. Mínima", 
    maxWind: "Vel. Viento Máx.", 
    at: "a", 
    loading: "Cargando...", 
    noData: "No hay datos de medición para este lanzamiento.", 
    selectDay: "Seleccione un día del calendario para ver un lanzamiento", 
    multiLaunchTitle: "Múltiples lanzamientos en este día", 
    multiLaunchSub: "Por favor, seleccione uno para ver sus datos.", 
    close: "Cerrar", 
    mainChartTitle: "Perfiles Atmosféricos vs Altitud", 
    tempChartTitle: "Temperatura", 
    pressureChartTitle: "Presión", 
    rhChartTitle: "Humedad Relativa", 
    dewPointChartTitle: "Temperatura de Punto de Rocío", 
    windComponentsChartTitle: "Componentes del Viento", 
    mixingRatioChartTitle: "Razón de Mezcla", 
    tempAxis: "Temperatura (°C)", 
    pressureAxis: "Presión (hPa)", 
    rhAxis: "Humedad Relativa (%)", 
    altitudeAxis: "Altitud (km)", 
    dewPointAxis: "Punto de Rocío (°C)", 
    windAxis: "Velocidad del Viento (m/s)",
    windSpeedAxis: "Horizontal", 
    windDirection: "Dirección", 
    zonalWindAxis: "Zonal", 
    meridionalWindAxis: "Meridional", 
    mixingRatioAxis: "Razón de Mezcla (g/kg)", 
    monthlySummaryTitle: "Resumen Mensual", 
    monthDayAxis: "Día del Mes",
    copyrightText: "Toda la información disponible es propiedad de SENAMHI. Agradecimientos por compartir con la UPB para fines de investigación.",
    expandSummary: "Expandir Resumen", 
    collapseSummary: "Colapsar Resumen", 
    soundingStatistics: "Estadísticas del Sondeo", 
    min: "Mín", 
    max: "Máx", 
    stdDev: "Desv. Est.", 
    temp: "Temperatura", 
    pressure: "Presión", 
    rh: "Humedad Relativa", 
    dewPoint: "Punto de Rocío", 
    wind: "Velocidad del Viento", 
    mixingRatio: "Razón de Mezcla", 
  }
};

const monthNames = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'] };
const weekdays = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] };
const kelvinToCelsius = (k: number | null) => (k ? k - 273.15 : null);
const metersToKilometers = (m: number | null) => (m ? m / 1000 : null);
const formatLaunchDate = (dateString: string, lang: Language): string => { 
  const date = new Date(dateString); 
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, }; 
  return new Intl.DateTimeFormat(lang, options).format(date).replace(/,/g, ''); 
}


// --- React Components for individual charts ---

const TemperatureChart = ({ measurements, lang }: { measurements: Measurement[], lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  const chartData = {
    datasets: [
      {
        label: t('tempAxis'),
        data: measurements.filter(m => m.Height != null && m.T != null).map(m => ({ x: kelvinToCelsius(m.T), y: metersToKilometers(m.Height) })),
        borderColor: 'red',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        pointRadius: 0,
        borderWidth: 2,
        showLine: true,
      },
    ],
  };

  const options = {
    type: 'line',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false, },
    plugins: {
      legend: { display: false }, // Hide legend, as title is simplified
      title: { display: true, text: t('tempChartTitle'), color: '#1E215B', font: { size: 18 } },
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const m = measurements[items[0].dataIndex];
            const time = m.time ? (m.time / 60).toFixed(1) : 'N/A';
            return `${t('altitudeAxis')}: ${metersToKilometers(m.Height)?.toFixed(2)} km (${t('at')} ${time} min)`;
          },
          label: (item: any) => `${item.dataset.label}: ${item.parsed.x.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: { display: true, text: t('tempAxis'), color: 'red', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: t('altitudeAxis'), color: '#1E215B', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }
    },
  };

  return <Chart type='line' options={options} data={chartData} />;
};

const PressureChart = ({ measurements, lang }: { measurements: Measurement[], lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  const chartData = {
    datasets: [
      {
        label: t('pressureAxis'),
        data: measurements.filter(m => m.Height != null && m.P != null).map(m => ({ x: m.P, y: metersToKilometers(m.Height) })),
        borderColor: 'green',
        backgroundColor: 'rgba(0, 128, 0, 0.5)',
        pointRadius: 0,
        borderWidth: 2,
        showLine: true,
      },
    ],
  };

  const options = {
    type: 'line',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false, },
    plugins: {
      legend: { display: false },
      title: { display: true, text: t('pressureChartTitle'), color: '#1E215B', font: { size: 18 } },
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const m = measurements[items[0].dataIndex];
            const time = m.time ? (m.time / 60).toFixed(1) : 'N/A';
            return `${t('altitudeAxis')}: ${metersToKilometers(m.Height)?.toFixed(2)} km (${t('at')} ${time} min)`;
          },
          label: (item: any) => `${item.dataset.label}: ${item.parsed.x.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: { display: true, text: t('pressureAxis'), color: 'green', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: t('altitudeAxis'), color: '#1E215B', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }
    },
  };

  return <Chart type='line' options={options} data={chartData} />;
};

const HumidityChart = ({ measurements, lang }: { measurements: Measurement[], lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  const chartData = {
    datasets: [
      {
        label: t('rhAxis'),
        data: measurements.filter(m => m.Height != null && m.RH != null).map(m => ({ x: m.RH, y: metersToKilometers(m.Height) })),
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.5)',
        pointRadius: 0,
        borderWidth: 2,
        showLine: true,
      },
    ],
  };

  const options = {
    type: 'line',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false, },
    plugins: {
      legend: { display: false },
      title: { display: true, text: t('rhChartTitle'), color: '#1E215B', font: { size: 18 } },
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const m = measurements[items[0].dataIndex];
            const time = m.time ? (m.time / 60).toFixed(1) : 'N/A';
            return `${t('altitudeAxis')}: ${metersToKilometers(m.Height)?.toFixed(2)} km (${t('at')} ${time} min)`;
          },
          label: (item: any) => `${item.dataset.label}: ${item.parsed.x.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: { display: true, text: t('rhAxis'), color: 'blue', font: {size: 14} },
        min: 0,
        max: 100,
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: t('altitudeAxis'), color: '#1E215B', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }
    },
  };

  return <Chart type='line' options={options} data={chartData} />;
};

const DewPointTemperatureChart = ({ measurements, lang }: { measurements: Measurement[], lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  const chartData = {
    datasets: [
      {
        label: t('dewPointAxis'),
        data: measurements.filter(m => m.Height != null && m.TD != null).map(m => ({ x: kelvinToCelsius(m.TD), y: metersToKilometers(m.Height) })),
        borderColor: '#4B0082', // Indigo
        backgroundColor: 'rgba(75, 0, 130, 0.5)',
        pointRadius: 0,
        borderWidth: 2,
        showLine: true,
      },
    ],
  };

  const options = {
    type: 'line',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false, },
    plugins: {
      legend: { display: false },
      title: { display: true, text: t('dewPointChartTitle'), color: '#1E215B', font: { size: 18 } },
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const m = measurements[items[0].dataIndex];
            const time = m.time ? (m.time / 60).toFixed(1) : 'N/A';
            return `${t('altitudeAxis')}: ${metersToKilometers(m.Height)?.toFixed(2)} km (${t('at')} ${time} min)`;
          },
          label: (item: any) => `${item.dataset.label}: ${item.parsed.x.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: { display: true, text: t('dewPointAxis'), color: '#4B0082', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: t('altitudeAxis'), color: '#1E215B', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }
    },
  };

  return <Chart type='line' options={options} data={chartData} />;
};


const WindComponentsChart = ({ measurements, lang }: { measurements: Measurement[], lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  const chartData = {
    datasets: [
      {
        label: t('zonalWindAxis'),
        data: measurements.filter(m => m.Height != null && m.u != null).map(m => ({ x: m.u, y: metersToKilometers(m.Height) })),
        borderColor: '#FF4500', // OrangeRed
        backgroundColor: 'rgba(255, 69, 0, 0.5)',
        pointRadius: 0,
        borderWidth: 2,
        showLine: true,
      },
      {
        label: t('meridionalWindAxis'),
        data: measurements.filter(m => m.Height != null && m.v != null).map(m => ({ x: m.v, y: metersToKilometers(m.Height) })),
        borderColor: '#DAA520', // Goldenrod
        backgroundColor: 'rgba(218, 165, 32, 0.5)',
        pointRadius: 0,
        borderWidth: 2,
        showLine: true,
      },
      {
        label: t('windSpeedAxis'), // Add Wind Speed (FF) to this chart
        data: measurements.filter(m => m.Height != null && m.FF != null).map(m => ({ x: m.FF, y: metersToKilometers(m.Height) })),
        borderColor: '#1E215B', // Dark blue for wind speed
        backgroundColor: 'rgba(30, 33, 91, 0.5)',
        pointRadius: 0,
        borderWidth: 2,
        showLine: true,
      },
    ],
  };

  const options = {
    type: 'line',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false, },
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#1E215B' } }, // Keep legend for u, v, FF
      title: { display: true, text: t('windComponentsChartTitle'), color: '#1E215B', font: { size: 18 } },
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const m = measurements[items[0].dataIndex];
            const time = m.time ? (m.time / 60).toFixed(1) : 'N/A';
            return `${t('altitudeAxis')}: ${metersToKilometers(m.Height)?.toFixed(2)} km (${t('at')} ${time} min)`;
          },
          label: (item: any) => {
            const m = measurements[item.dataIndex];
            let label = `${item.dataset.label}: ${item.parsed.x.toFixed(2)} m/s`;
            // Add Wind Direction (DD) to tooltip
            if (m.DD != null) {
              label += ` | ${t('windDirection')}: ${m.DD.toFixed(1)}°`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: { display: true, text: `${t('windAxis')}`, color: '#1E215B', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: t('altitudeAxis'), color: '#1E215B', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }
    },
  };

  return <Chart type='line' options={options} data={chartData} />;
};

const MixingRatioChart = ({ measurements, lang }: { measurements: Measurement[], lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  const chartData = {
    datasets: [
      {
        label: t('mixingRatioAxis'),
        data: measurements.filter(m => m.Height != null && m.MR != null).map(m => ({ x: m.MR, y: metersToKilometers(m.Height) })),
        borderColor: '#800080', // Purple
        backgroundColor: 'rgba(128, 0, 128, 0.5)',
        pointRadius: 0,
        borderWidth: 2,
        showLine: true,
      },
    ],
  };

  const options = {
    type: 'line',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false, },
    plugins: {
      legend: { display: false },
      title: { display: true, text: t('mixingRatioChartTitle'), color: '#1E215B', font: { size: 18 } },
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const m = measurements[items[0].dataIndex];
            const time = m.time ? (m.time / 60).toFixed(1) : 'N/A';
            return `${t('altitudeAxis')}: ${metersToKilometers(m.Height)?.toFixed(2)} km (${t('at')} ${time} min)`;
          },
          label: (item: any) => `${item.dataset.label}: ${item.parsed.x.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: { display: true, text: t('mixingRatioAxis'), color: '#800080', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: t('altitudeAxis'), color: '#1E215B', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }
    },
  };

  return <Chart type='line' options={options} data={chartData} />;
};

// New component for Sounding Statistics Table
const SoundingStatisticsTable = ({ measurements, lang }: { measurements: Measurement[], lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  const stats = useMemo(() => {
    if (measurements.length === 0) return null;

    const calculateStats = (data: number[]) => {
      if (data.length === 0) return { min: null, max: null, stdDev: null };
      const min = Math.min(...data);
      const max = Math.max(...data);
      const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
      const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
      const stdDev = Math.sqrt(variance);
      return { min, max, stdDev };
    };

    const temps = measurements.filter(m => m.T != null).map(m => kelvinToCelsius(m.T!));
    const pressures = measurements.filter(m => m.P != null).map(m => m.P!);
    const rhs = measurements.filter(m => m.RH != null).map(m => m.RH!);
    const ffs = measurements.filter(m => m.FF != null).map(m => m.FF!);
    const mrs = measurements.filter(m => m.MR != null).map(m => m.MR!);
    const tds = measurements.filter(m => m.TD != null).map(m => kelvinToCelsius(m.TD!));

    return {
      temp: calculateStats(temps),
      pressure: calculateStats(pressures),
      rh: calculateStats(rhs),
      wind: calculateStats(ffs),
      mixingRatio: calculateStats(mrs),
      dewPoint: calculateStats(tds),
    };
  }, [measurements]);

  if (!stats) return null;

  return (
    <div className="bg-white border rounded-lg shadow-lg p-4"> {/* Added bg-white, border, rounded-lg, shadow-lg */}
      <h3 className="text-xl font-bold mb-4 text-[#1E215B]">{t('soundingStatistics')}</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('min')}</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('max')}</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('stdDev')}</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <tr>
            <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-900">{t('temp')} (°C)</td>
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.temp.min?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.temp.max?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.temp.stdDev?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
          </tr>
          <tr>
            <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-900">{t('pressure')} (hPa)</td>
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.pressure.min?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.pressure.max?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.pressure.stdDev?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
          </tr>
          <tr>
            <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-900">{t('rh')} (%)</td>
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.rh.min?.toFixed(1) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.rh.max?.toFixed(1) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.rh.stdDev?.toFixed(1) ?? 'N/A'}</td> {/* Reduced font size */}
          </tr>
          <tr>
            <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-900">{t('dewPoint')} (°C)</td>
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.dewPoint.min?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.dewPoint.max?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.dewPoint.stdDev?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
          </tr>
          <tr>
            <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-900">{t('wind')} (m/s)</td>
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.wind.min?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.wind.max?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.wind.stdDev?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
          </tr>
          <tr>
            <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-900">{t('mixingRatio')} (g/kg)</td>
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.mixingRatio.min?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.mixingRatio.max?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{stats.mixingRatio.stdDev?.toFixed(2) ?? 'N/A'}</td> {/* Reduced font size */}
          </tr>
        </tbody>
      </table>
    </div>
  );
};


const LaunchSummary = ({ measurements, selectedLaunch, lang }: { measurements: Measurement[], selectedLaunch: Launch | null, lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default

  const summary = useMemo(() => {
    if (measurements.length < 2 || !selectedLaunch) return null;

    const surface = measurements[1];

    const validHeightMeasurements = measurements.filter(m => m.Height != null);
    const maxAlt = validHeightMeasurements.length > 0
      ? validHeightMeasurements.reduce((max, c) => c.Height! > max.Height! ? c : max)
      : { Height: null, P: null };

    const validTempMeasurements = measurements.filter(m => m.T != null);
    const minTempRecord = validTempMeasurements.length > 0
      ? validTempMeasurements.reduce((min, c) => c.T! < min.T! ? c : min)
      : { T: null, Height: null };

    const validWindMeasurements = measurements.filter(m => m.u != null && m.v != null);
    const maxWindRecord = validWindMeasurements.length > 0
      ? validWindMeasurements.reduce((max, c) => {
          const cSpeed = Math.sqrt(c.u!**2 + c.v!**2);
          const maxSpeed = Math.sqrt(max.u!**2 + max.v!**2);
          return cSpeed > maxSpeed ? c : max;
        })
      : null;
    const maxWindSpeed = maxWindRecord ? Math.sqrt(maxWindRecord.u!**2 + maxWindRecord.v!**2).toFixed(2) : 'N/A';

    const validTimeMeasurements = measurements.filter(m => m.time != null);
    const maxTime = validTimeMeasurements.length > 0
      ? validTimeMeasurements.reduce((max, c) => c.time! > max.time! ? c : max).time
      : null;

    const ascentTime = maxTime ? (maxTime / 60).toFixed(0) : 'N/A'; // No decimals
    const ascentSpeed = (maxTime && maxAlt.Height) ? (maxAlt.Height / maxTime).toFixed(2) : 'N/A';

    return {
      surface,
      maxAlt,
      minTempRecord,
      maxWindSpeed,
      ascentTime,
      ascentSpeed,
    };
  }, [measurements, selectedLaunch]);

  if (!summary || !selectedLaunch) return null;

  const { surface, maxAlt, minTempRecord, maxWindSpeed, ascentTime, ascentSpeed } = summary;

  return (
    <div className="bg-white border rounded-lg shadow-lg p-4"> {/* Changed from bg-gray-50 to bg-white */}
      <div className="flex justify-between items-center">
        {isCollapsed ? (
          <div className="flex-grow text-center"> {/* Centered content for collapsed state */}
            <p className="text-lg font-semibold text-[#1E215B]">{formatLaunchDate(selectedLaunch.launch_date, lang)}</p>
            <div className="grid grid-cols-3 gap-2 mt-1 text-sm"> {/* Compact grid for collapsed info */}
              <div>
                <p className="text-gray-500">{t('maxAltitude')}</p>
                <p className="font-semibold text-gray-800">{metersToKilometers(maxAlt.Height)?.toFixed(2) ?? 'N/A'} km</p>
              </div>
              <div>
                <p className="text-gray-500">{t('ascentTime')}</p>
                <p className="font-semibold text-gray-800">{ascentTime} min</p>
              </div>
              <div>
                <p className="text-gray-500">{t('ascentSpeed')}</p>
                <p className="font-semibold text-gray-800">{ascentSpeed} m/s</p>
              </div>
            </div>
          </div>
        ) : (
          <h3 className="text-xl font-bold text-[#1E215B]">{t('summaryTitle')}</h3>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-800 transition-colors ml-auto flex-shrink-0" // flex-shrink-0 to prevent shrinking
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
      
      {!isCollapsed && (
        <>
          <div className="mb-4 bg-white p-3 rounded-md">
            <p className="text-sm text-gray-500">{t('selectedLaunch')}</p>
            <p className="text-lg font-semibold text-[#1E215B]">{formatLaunchDate(selectedLaunch.launch_date, lang)}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-500">{t('maxAltitude')}</p><p className="text-lg font-semibold">{metersToKilometers(maxAlt.Height)?.toFixed(2) ?? 'N/A'} km</p></div>
            <div><p className="text-gray-500">{t('minTemp')}</p><p className="text-lg font-semibold">{kelvinToCelsius(minTempRecord.T)?.toFixed(2) ?? 'N/A'} °C</p></div>
            <div><p className="text-gray-500">{t('at')}</p><p className="text-lg font-semibold">{metersToKilometers(minTempRecord.Height)?.toFixed(2) ?? 'N/A'} km</p></div>
            <div><p className="text-gray-500">{t('surfaceTemp')}</p><p className="text-lg font-semibold">{kelvinToCelsius(surface.T)?.toFixed(2) ?? 'N/A'} °C</p></div>
            <div><p className="text-gray-500">{t('surfaceRH')}</p><p className="text-lg font-semibold">{surface.RH?.toFixed(1) ?? 'N/A'} %</p></div>
            <div><p className="text-gray-500">{t('burstPressure')}</p><p className="text-lg font-semibold">{maxAlt.P?.toFixed(2) ?? 'N/A'} hPa</p></div>
            <div><p className="text-gray-500">{t('ascentTime')}</p><p className="text-lg font-semibold">{ascentTime} min</p></div>
            <div><p className="text-gray-500">{t('ascentSpeed')}</p><p className="text-lg font-semibold">{ascentSpeed} m/s</p></div>
            <div><p className="text-gray-500">{t('maxWind')}</p><p className="text-lg font-semibold">{maxWindSpeed} m/s</p></div>
          </div>
        </>
      )}
    </div>
  );
};

const LaunchSelectorModal = ({ launches, onSelect, onClose, lang }: { launches: Launch[], onSelect: (launch: Launch) => void, onClose: () => void, lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  return ( 
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"> 
      <div className="bg-white text-gray-800 border rounded-lg p-6 max-w-sm w-full"> 
        <h3 className="text-lg font-bold mb-4 text-[#1E215B]">{t('multiLaunchTitle')}</h3> 
        <p className="text-sm text-gray-600 mb-4">{t('multiLaunchSub')}</p> 
        <ul className="divide-y divide-gray-200"> 
          {launches.map(launch => (
            <li key={launch.id} onClick={() => onSelect(launch)} className="p-3 cursor-pointer hover:bg-gray-100 rounded">
              {new Date(launch.launch_date).toLocaleTimeString(lang)}
            </li>
          ))} 
        </ul> 
        <button onClick={onClose} className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">{t('close')}</button> 
      </div> 
    </div> 
  );
};

const MonthlyPerformanceChart = ({ data, lang }: { data: MonthlyPerformanceData[], lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  const chartData = {
    labels: data.map(d => d.day),
    datasets: [
      { 
        type: 'bar' as const, 
        label: t('maxAltitude'), 
        data: data.map(d => metersToKilometers(d.max_altitude)), 
        backgroundColor: '#1E215B', 
        yAxisID: 'y_alt',
        order: 2, 
      },
      { 
        type: 'line' as const, 
        label: t('ascentTime'), 
        data: data.map(d => d.ascent_time), 
        borderColor: '#FDB813', 
        backgroundColor: 'rgba(253, 184, 19, 0.5)', 
        yAxisID: 'y_time', 
        borderWidth: 2, 
        pointRadius: 3,
        order: 1, 
      },
    ]
  };

  const options = { 
    responsive: true, 
    maintainAspectRatio: false, 
    interaction: { mode: 'index' as const, intersect: false }, 
    plugins: { 
      legend: { position: 'top' as const }, 
      title: { 
        display: true, 
        text: t('monthlySummaryTitle'), 
        color: '#1E215B', 
        font: { size: 18 } 
      },
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const dataIndex = items[0].dataIndex;
            const record = data[dataIndex];
            if (record && record.launch_date) {
              return formatLaunchDate(record.launch_date, lang); // Display full date and time
            }
            return `${t('monthDayAxis')}: ${items[0].label}`;
          },
          label: (item: any) => {
            let label = item.dataset.label;
            if (item.dataset.label === t('maxAltitude')) {
              label += `: ${item.parsed.y.toFixed(2)} km`; // Add km unit
            } else if (item.dataset.label === t('ascentTime')) {
              label += `: ${item.parsed.y.toFixed(0)} min`; // No decimals, add min unit
            } else {
              label += `: ${item.parsed.y}`;
            }
            return label;
          }
        }
      }
    }, 
    scales: { 
      x: { 
        title: { display: true, text: t('monthDayAxis'), color: '#1E215B', font: {size: 14} },
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }, 
      y_alt: { 
        type: 'linear' as const, 
        position: 'left' as const, 
        title: { display: true, text: t('maxAltitude') + ' (km)', color: '#1E215B', font: {size: 14} }, 
        ticks: { color: '#1E215B' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }, 
      y_time: { 
        type: 'linear' as const, 
        position: 'right' as const, 
        title: { display: true, text: t('ascentTime') + ' (min)', color: '#FDB813', font: {size: 14} }, 
        grid: { drawOnChartArea: false },
        ticks: { color: '#FDB813' }
      } 
    } 
  };

  return <Chart type='bar' options={options} data={chartData} />;
};

// --- Main App Component ---
export default function App() {
  const [language] = useState<Language>(navigator.language.startsWith('es') ? 'es' : 'en');
  const [launchesByDay, setLaunchesByDay] = useState<{ [key: string]: Launch[] }>({});
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [launchesForModal, setLaunchesForModal] = useState<Launch[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [downsampled, setDownsampled] = useState<Measurement[]>([]);
  const [monthlyPerformance, setMonthlyPerformance] = useState<MonthlyPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = (key: keyof typeof translations.en) => translations[language][key];

  useEffect(() => {
    const fetchAndProcessLaunches = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/launches`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data: Launch[] = await res.json();
        const grouped = data.reduce((acc, l) => { const key = new Date(l.launch_date).toISOString().split('T')[0]; if (!acc[key]) acc[key] = []; acc[key].push(l); return acc; }, {} as { [key: string]: Launch[] });
        setLaunchesByDay(grouped);
        const years = [...new Set(data.map(l => new Date(l.launch_date).getFullYear().toString()))];
        setAvailableYears(years.sort().reverse());

        if (data.length > 0) {
          const latestLaunch = data.reduce((latest, current) => 
            new Date(current.launch_date) > new Date(latest.launch_date) ? current : latest
          );
          setSelectedDate(new Date(latestLaunch.launch_date));
          setSelectedLaunch(latestLaunch);
        }
      } catch (e) { 
        if (e instanceof Error) setError(`Failed to connect to API. Is it running? Details: ${e.message}`); 
      }
    };
    fetchAndProcessLaunches();
  }, []);

  useEffect(() => {
    if (!selectedLaunch) return;
    const fetchMeasurements = async () => {
      setIsProfileLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/launches/${selectedLaunch.id}`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data: Measurement[] = await res.json();
        setMeasurements(data);
        const factor = Math.max(1, Math.floor(data.length / 500));
        setDownsampled(data.filter((_, i) => i % factor === 0));
      } catch (e) { if (e instanceof Error) setError(`Failed to fetch measurements for launch ${selectedLaunch.id}.`); 
        setMeasurements([]); 
        setDownsampled([]);
      } 
      finally { setIsProfileLoading(false); }
    };
    fetchMeasurements();
  }, [selectedLaunch]);

  const { year, month } = useMemo(() => ({
      year: selectedDate.getFullYear(),
      month: selectedDate.getMonth(), 
  }), [selectedDate]);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      setIsLoading(true); 
      try {
        const perfRes = await fetch(`${API_BASE_URL}/performance/monthly/${year}/${month + 1}`);
        if (!perfRes.ok) throw new Error("Failed to fetch monthly data");
        const perfData = await perfRes.json();
        // Enrich monthly performance data with launch_date for tooltip
        const enrichedPerfData = perfData.map((d: MonthlyPerformanceData) => {
          const dayKey = new Date(year, month, d.day).toISOString().split('T')[0];
          const launchesOnDay = launchesByDay[dayKey];
          // Find the launch that corresponds to this monthly summary entry (e.g., the one with max altitude)
          // This part might need adjustment if your backend's monthly performance data doesn't directly link to a single launch_date.
          // For now, it will pick the first launch of the day if multiple exist.
          const correspondingLaunch = launchesOnDay && launchesOnDay.length > 0 ? launchesOnDay[0] : null;
          return { ...d, launch_date: correspondingLaunch ? correspondingLaunch.launch_date : null };
        });

        setMonthlyPerformance(enrichedPerfData);
      } catch (e) { 
        console.error(e); 
        setError("Failed to load monthly performance data."); 
        setMonthlyPerformance([]);
      }
      finally { setIsLoading(false); } 
    };
    fetchMonthlyData();
  }, [year, month, launchesByDay]); // Added launchesByDay as dependency for enrichment

  const handleDayClick = (day: number) => {
    const dayKey = new Date(year, month, day).toISOString().split('T')[0];
    const dayLaunches = launchesByDay[dayKey];
    if (!dayLaunches) return;
    setSelectedDate(new Date(year, month, day));
    if (dayLaunches.length === 1) { setSelectedLaunch(dayLaunches[0]); } 
    else { dayLaunches.sort((a, b) => new Date(a.launch_date).getTime() - new Date(b.launch_date).getTime()); setLaunchesForModal(dayLaunches); }
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth });

  return (
    <div className="bg-gray-100 text-gray-800 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      {launchesForModal.length > 0 && <LaunchSelectorModal launches={launchesForModal} onSelect={(l) => {setSelectedLaunch(l); setLaunchesForModal([]);}} onClose={() => setLaunchesForModal([])} lang={language} />}
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b-2 border-[#FDB813] pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#1E215B]">{t('platformTitle')}</h1>
            <p className="text-lg text-[#6D6E71] mt-2">{t('platformSubtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* SENAMHI Logo */}
            <img src="/senamhi.png" alt="SENAMHI Logo" className="h-10 rounded-md" onError={(e) => { e.currentTarget.src='https://placehold.co/80x40/e0e0e0/1E215B?text=SENAMHI' }} />
            {/* UPB Logo */}
            <img src="/upb.png" alt="UPB Logo" className="h-10 rounded-md" onError={(e) => { e.currentTarget.src='https://placehold.co/80x40/e0e0e0/1E215B?text=UPB' }} />
            {/* LRC Logo */}
            <img src="/lrc.png" alt="LRC Logo" className="h-10 rounded-md" onError={(e) => { e.currentTarget.src='https://placehold.co/80x40/e0e0e0/1E215B?text=LRC' }} />
          </div>
        </header>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6"><p>{error}</p></div>}

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 lg:sticky lg:top-8 flex flex-col gap-8">
            <div className="bg-white border rounded-lg shadow-lg p-4">
              <h2 className="text-2xl font-semibold mb-4 text-[#1E215B]">{t('selectLaunch')}</h2>
              <div className="flex items-center justify-between mb-4">
                <select value={year} onChange={e => setSelectedDate(new Date(Number(e.target.value), month))} className="bg-gray-50 border-gray-300 p-2 rounded w-1/2 mr-2">
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={month} onChange={e => setSelectedDate(new Date(year, Number(e.target.value)))} className="bg-gray-50 border-gray-300 p-2 rounded w-1/2 ml-2">
                  {monthNames[language].map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {weekdays[language].map(wd => <div key={wd} className="font-bold text-gray-500 py-2">{wd}</div>)}
                {paddingDays.map((_, i) => <div key={`pad-${i}`}></div>)}
                {calendarDays.map(day => {
                  const dayKey = new Date(year, month, day).toISOString().split('T')[0];
                  const hasLaunch = launchesByDay[dayKey];
                  const isSelected = selectedLaunch && new Date(selectedLaunch.launch_date).getDate() === day && new Date(selectedLaunch.launch_date).getMonth() === month && new Date(selectedLaunch.launch_date).getFullYear() === year;
                  return (
                    <div 
                      key={day} 
                      onClick={() => handleDayClick(day)} 
                      className={`aspect-square p-2 rounded-full flex items-center justify-center transition-all duration-200 ${hasLaunch ? 'bg-gray-200 hover:bg-[#FDB813] hover:text-[#1E215B] cursor-pointer' : 'text-gray-400'} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-white ring-[#1E215B] font-bold' : ''}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Monthly Summary Chart on the left side */}
            <div className="bg-white border rounded-lg shadow-lg p-4 flex flex-col h-96"> {/* Reduced height from h-96 to h-80 */}
              <div className="flex-grow relative">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">{t('loading')}</p>
                  </div>
                ) : (
                  <MonthlyPerformanceChart data={monthlyPerformance} lang={language} />
                )}
              </div>
            </div>
            {/* New Sounding Statistics Table */}
            <SoundingStatisticsTable measurements={measurements} lang={language} />
          </div>
          
          <div className={`lg:col-span-2 bg-white border rounded-lg shadow-lg p-6 flex flex-col gap-6 transition-opacity duration-300 ${isProfileLoading ? 'opacity-50' : 'opacity-100'}`}>
            {selectedLaunch ? (
              <>
                {/* Launch Summary moved here */}
                <LaunchSummary measurements={measurements} selectedLaunch={selectedLaunch} lang={language}/>
                <h2 className="text-3xl font-bold mb-4 text-[#1E215B] text-center">{t('mainChartTitle')}</h2> {/* Main title for all plots */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Grid for three charts */}
                  <div className="flex-grow relative min-h-[300px]">
                    {isProfileLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('loading')}</p>
                      </div>
                    ) : measurements.length > 0 ? (
                      <TemperatureChart measurements={downsampled} lang={language}/>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('noData')}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow relative min-h-[300px]">
                    {isProfileLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('loading')}</p>
                      </div>
                    ) : measurements.length > 0 ? (
                      <PressureChart measurements={downsampled} lang={language}/>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('noData')}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow relative min-h-[300px]">
                    {isProfileLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('loading')}</p>
                      </div>
                    ) : measurements.length > 0 ? (
                      <HumidityChart measurements={downsampled} lang={language}/>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('noData')}</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* New row for additional plots */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"> 
                  <div className="flex-grow relative min-h-[300px]">
                    {isProfileLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('loading')}</p>
                      </div>
                    ) : measurements.length > 0 ? (
                      <DewPointTemperatureChart measurements={downsampled} lang={language}/>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('noData')}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow relative min-h-[300px]">
                    {isProfileLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('loading')}</p>
                      </div>
                    ) : measurements.length > 0 ? (
                      <WindComponentsChart measurements={downsampled} lang={language}/>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('noData')}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow relative min-h-[300px]">
                    {isProfileLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('loading')}</p>
                      </div>
                    ) : measurements.length > 0 ? (
                      <MixingRatioChart measurements={downsampled} lang={language}/>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p>{t('noData')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <p className="text-xl text-gray-400">{t('selectDay')}</p>
              </div>
            )}
          </div>
        </main>
        <footer className="mt-8 pt-4 border-t-2 border-[#FDB813] text-center text-sm text-gray-600">
          <p>{t('copyrightText')}</p>
        </footer>
      </div>
    </div>
  );
}
