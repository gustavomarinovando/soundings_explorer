import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement as ChartJsLine,
  BarElement,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import './App.css';

// Register the components we need for Chart.js
ChartJS.register(LinearScale, PointElement, ChartJsLine, Title, Tooltip, Legend, BarElement, CategoryScale);

// --- TypeScript Type Definitions ---
type Launch = { id: number; launch_date: string; filename: string; };
type Measurement = { id: number; launch_id: number; time: number | null; Height: number | null; T: number | null; RH: number | null; P: number | null; u: number | null; v: number | null; Lon: number | null; Lat: number | null; };
type Language = 'en' | 'es';
type MonthlyPerformanceData = { day: number; max_altitude: number; ascent_time: number; };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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
    chartTitle: "Atmospheric Profile vs. Altitude", 
    tempAxis: "Temperature (°C)", 
    pressureAxis: "Pressure (hPa)", 
    rhAxis: "Relative Humidity (%)", 
    altitudeAxis: "Altitude (m)", 
    monthlySummaryTitle: "Monthly Summary", // Renamed
    monthDayAxis: "Day of the month"
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
    chartTitle: "Perfil Atmosférico vs. Altitud", 
    tempAxis: "Temperatura (°C)", 
    pressureAxis: "Presión (hPa)", 
    rhAxis: "Humedad Relativa (%)", 
    altitudeAxis: "Altitud (m)", 
    monthlySummaryTitle: "Resumen Mensual", // Renamed
    monthDayAxis: "Día del Mes"
  }
};

const monthNames = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'] };
const weekdays = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] };
const kelvinToCelsius = (k: number | null) => (k ? k - 273.15 : null);
const formatLaunchDate = (dateString: string, lang: Language): string => { 
  const date = new Date(dateString); 
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, }; 
  return new Intl.DateTimeFormat(lang, options).format(date).replace(/,/g, ''); 
}

// --- React Components ---

const ProfileChart = ({ measurements, lang }: { measurements: Measurement[], lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  const chartData = { 
    datasets: [ 
      { 
        label: t('tempAxis'), 
        data: measurements.filter(m => m.Height != null && m.T != null).map(m => ({ x: m.Height, y: kelvinToCelsius(m.T) })), 
        borderColor: '#FDB813', 
        backgroundColor: 'rgba(253, 184, 19, 0.5)', 
        pointRadius: 0, 
        borderWidth: 2, 
        yAxisID: 'y_temp', 
        showLine: true, 
      }, 
      { 
        label: t('pressureAxis'), 
        data: measurements.filter(m => m.Height != null && m.P != null).map(m => ({ x: m.Height, y: m.P })), 
        borderColor: '#6D6E71', 
        backgroundColor: 'rgba(109, 110, 113, 0.5)', 
        pointRadius: 0, 
        borderWidth: 2, 
        yAxisID: 'y_pressure', 
        showLine: true, 
      }, 
      { 
        label: t('rhAxis'), 
        data: measurements.filter(m => m.Height != null && m.RH != null).map(m => ({ x: m.Height, y: m.RH })), 
        borderColor: '#1E215B', // Changed to match bar color
        backgroundColor: 'rgba(30, 33, 91, 0.5)', // Changed to match bar color
        pointRadius: 0, 
        borderWidth: 2, 
        yAxisID: 'y_rh', 
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
      legend: { position: 'top' as const, labels: { color: '#1E215B' } }, 
      title: { display: true, text: t('chartTitle'), color: '#1E215B', font: { size: 18 } }, 
      tooltip: { 
        callbacks: { 
          title: (items: any) => { 
            const m = measurements[items[0].dataIndex]; 
            const time = m.time ? (m.time / 60).toFixed(1) : 'N/A'; 
            return `${t('altitudeAxis')}: ${m.Height?.toFixed(0)} m (${t('at')} ${time} min)`; 
          }, 
          label: (item: any) => `${item.dataset.label}: ${item.parsed.y.toFixed(2)}` 
        } 
      } 
    }, 
    scales: { 
      x: { 
        type: 'linear' as const, 
        title: { display: true, text: t('altitudeAxis'), color: '#1E215B', font: {size: 14} }, 
        ticks: { color: '#1E215B' }, 
        grid: { color: 'rgba(0, 0, 0, 0.1)' } 
      }, 
      y_temp: { 
        type: 'linear' as const, 
        position: 'left' as const, 
        title: { display: true, text: t('tempAxis'), color: '#FDB813', font: {size: 14} }, 
        ticks: { color: '#FDB813' }, 
        grid: { drawOnChartArea: false } 
      }, 
      y_pressure: { 
        type: 'linear' as const, 
        position: 'right' as const, 
        title: { display: true, text: t('pressureAxis'), color: '#6D6E71', font: {size: 14} }, 
        ticks: { color: '#6D6E71' }, 
        grid: { drawOnChartArea: false } 
      }, 
      y_rh: { 
        type: 'linear' as const, 
        position: 'right' as const,
        title: { display: true, text: t('rhAxis'), color: '#1E215B', font: {size: 14} }, 
        ticks: { color: '#1E215B' }, 
        grid: { drawOnChartArea: false } 
      } 
    }, 
  };

  return <Chart type='line' options={options} data={chartData} />;
};

const LaunchSummary = ({ measurements, selectedLaunch, lang }: { measurements: Measurement[], selectedLaunch: Launch | null, lang: Language }) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key];

  if (measurements.length < 2 || !selectedLaunch) return null;

  const surface = measurements[1];
  const maxAlt = measurements.reduce((max, c) => (c.Height && (!max.Height || c.Height > max.Height)) ? c : max, measurements[0]);
  const minTempRecord = measurements.filter(m => m.T).reduce((min, c) => (c.T && (!min.T || c.T < min.T)) ? c : min, measurements[0]);
  const validWindMeasurements = measurements.filter(m => m.u != null && m.v != null);
  const maxWindRecord = validWindMeasurements.length > 0 ? validWindMeasurements.reduce((max, c) => (Math.sqrt((c.u ?? 0) ** 2 + (c.v ?? 0) ** 2) > Math.sqrt((max.u ?? 0) ** 2 + (max.v ?? 0) ** 2) ? c : max)) : { u: 0, v: 0 };
  const maxTime = measurements.reduce((max, c) => (c.time && (!max || c.time > max)) ? c.time : max, 0);

  const ascentTime = maxTime ? (maxTime / 60).toFixed(1) : 'N/A';
  const ascentSpeed = (maxTime && maxAlt.Height) ? (maxAlt.Height / maxTime).toFixed(2) : 'N/A';
  const maxWindSpeed = Math.sqrt((maxWindRecord.u ?? 0)**2 + (maxWindRecord.v ?? 0)**2).toFixed(2);

  return (
    <div className="bg-gray-50 text-gray-800 p-4 rounded-lg border border-gray-200">
      <h3 className="text-xl font-bold mb-4 text-[#1E215B]">{t('summaryTitle')}</h3>
      <div className="mb-4 bg-white p-3 rounded-md">
        <p className="text-sm text-gray-500">{t('selectedLaunch')}</p>
        <p className="text-lg font-semibold text-[#1E215B]">{formatLaunchDate(selectedLaunch.launch_date, lang)}</p>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div><p className="text-gray-500">{t('maxAltitude')}</p><p className="text-lg font-semibold">{maxAlt.Height?.toFixed(0) ?? 'N/A'} m</p></div>
        <div><p className="text-gray-500">{t('minTemp')}</p><p className="text-lg font-semibold">{kelvinToCelsius(minTempRecord.T)?.toFixed(2) ?? 'N/A'} °C</p></div>
        <div><p className="text-gray-500">{t('at')}</p><p className="text-lg font-semibold">{minTempRecord.Height?.toFixed(0) ?? 'N/A'} m</p></div>
        <div><p className="text-gray-500">{t('surfaceTemp')}</p><p className="text-lg font-semibold">{kelvinToCelsius(surface.T)?.toFixed(2) ?? 'N/A'} °C</p></div>
        <div><p className="text-gray-500">{t('surfaceRH')}</p><p className="text-lg font-semibold">{surface.RH?.toFixed(1) ?? 'N/A'} %</p></div>
        <div><p className="text-gray-500">{t('burstPressure')}</p><p className="text-lg font-semibold">{maxAlt.P?.toFixed(2) ?? 'N/A'} hPa</p></div>
        <div><p className="text-gray-500">{t('ascentTime')}</p><p className="text-lg font-semibold">{ascentTime} min</p></div>
        <div><p className="text-gray-500">{t('ascentSpeed')}</p><p className="text-lg font-semibold">{ascentSpeed} m/s</p></div>
        <div><p className="text-gray-500">{t('maxWind')}</p><p className="text-lg font-semibold">{maxWindSpeed} m/s</p></div>
      </div>
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
        data: data.map(d => d.max_altitude), 
        backgroundColor: '#1E215B', 
        yAxisID: 'y_alt',
        order: 2, // Draw bars first (bottom) - Adjusted order
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
        order: 1, // Draw lines second (top) - Adjusted order
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
        display: true, // Display title
        text: t('monthlySummaryTitle'), // Use new title
        color: '#1E215B', 
        font: { size: 18 } 
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
        title: { display: true, text: t('maxAltitude') + ' (m)', color: '#1E215B', font: {size: 14} },
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
  const [, setAllLaunches] = useState<Launch[]>([]);
  const [launchesByDay, setLaunchesByDay] = useState<{ [key: string]: Launch[] }>({});
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [launchesForModal, setLaunchesForModal] = useState<Launch[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [downsampled, setDownsampled] = useState<Measurement[]>([]);
  const [monthlyPerformance, setMonthlyPerformance] = useState<MonthlyPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = (key: keyof typeof translations.en) => translations[language][key];

  useEffect(() => {
    const fetchAndProcessLaunches = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/launches`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data: Launch[] = await res.json();
        setAllLaunches(data);
        const grouped = data.reduce((acc, l) => { const key = new Date(l.launch_date).toISOString().split('T')[0]; if (!acc[key]) acc[key] = []; acc[key].push(l); return acc; }, {} as { [key: string]: Launch[] });
        setLaunchesByDay(grouped);
        const years = [...new Set(data.map(l => new Date(l.launch_date).getFullYear().toString()))];
        setAvailableYears(years.sort().reverse());
        if (data.length > 0) { const latest = new Date(data[0].launch_date); setSelectedDate(latest); setSelectedLaunch(data[0]); }
      } catch (e) { if (e instanceof Error) setError(`Failed to connect to API. Is it running?`); }
    };
    fetchAndProcessLaunches();
  }, []);

  useEffect(() => {
    if (!selectedLaunch) return;
    const fetchMeasurements = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/launches/${selectedLaunch.id}`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data: Measurement[] = await res.json();
        setMeasurements(data);
        const factor = Math.max(1, Math.floor(data.length / 500));
        setDownsampled(data.filter((_, i) => i % factor === 0));
      } catch (e) { if (e instanceof Error) setError(`Failed to fetch measurements for launch ${selectedLaunch.id}.`); } 
      finally { setIsLoading(false); }
    };
    fetchMeasurements();
  }, [selectedLaunch]);

  useEffect(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const fetchMonthlyData = async () => {
      setIsLoading(true); // Set loading true when fetching monthly data
      try {
        const perfRes = await fetch(`${API_BASE_URL}/performance/monthly/${year}/${month}`);
        if (!perfRes.ok) throw new Error("Failed to fetch monthly data");
        const perfData = await perfRes.json();
        setMonthlyPerformance(perfData);
      } catch (e) { console.error(e); setError("Failed to load monthly performance data."); }
      finally { setIsLoading(false); } // Set loading false after fetch
    };
    // Only fetch monthly data if the month or year changes, not just the day
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    if (selectedDate.getMonth() !== currentMonth || selectedDate.getFullYear() !== currentYear) {
      fetchMonthlyData();
    } else if (monthlyPerformance.length === 0) { // Fetch initially if no data
      fetchMonthlyData();
    }
  }, [selectedDate.getMonth(), selectedDate.getFullYear()]); // Dependency array changed

  const { year, month } = { year: selectedDate.getFullYear(), month: selectedDate.getMonth() };
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth });

  const handleDayClick = (day: number) => {
    const dayKey = new Date(year, month, day).toISOString().split('T')[0];
    const dayLaunches = launchesByDay[dayKey];
    if (!dayLaunches) return;
    setSelectedDate(new Date(year, month, day));
    if (dayLaunches.length === 1) { setSelectedLaunch(dayLaunches[0]); } 
    else { dayLaunches.sort((a, b) => new Date(a.launch_date).getTime() - new Date(b.launch_date).getTime()); setLaunchesForModal(dayLaunches); }
  };

  return (
    <div className="bg-gray-100 text-gray-800 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      {launchesForModal.length > 0 && <LaunchSelectorModal launches={launchesForModal} onSelect={(l) => {setSelectedLaunch(l); setLaunchesForModal([]);}} onClose={() => setLaunchesForModal([])} lang={language} />}
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b-2 border-[#FDB813] pb-4">
          <div>
            <h1 className="text-4xl font-bold text-[#1E215B]">{t('platformTitle')}</h1>
            <p className="text-lg text-[#6D6E71] mt-2">{t('platformSubtitle')}</p>
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
            <div className="bg-white border rounded-lg shadow-lg p-4 flex flex-col h-96">
              {/* Removed the redundant h2 tag here, as the title is now part of the chart options */}
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
          </div>
          
          <div className={`lg:col-span-2 bg-white border rounded-lg shadow-lg p-6 flex flex-col gap-6 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {selectedLaunch ? (
              <>
                <LaunchSummary measurements={measurements} selectedLaunch={selectedLaunch} lang={language}/>
                <div className="flex-grow relative min-h-[400px]">
                  {measurements.length > 0 ? <ProfileChart measurements={downsampled} lang={language}/>
                  : isLoading ? <div className="flex items-center justify-center h-full"><p>{t('loading')}</p></div>
                  : <div className="flex items-center justify-center h-full"><p>{t('noData')}</p></div>}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]"><p className="text-xl text-gray-400">{t('selectDay')}</p></div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
