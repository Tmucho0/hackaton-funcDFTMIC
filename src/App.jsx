import { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [userCity, setUserCity] = useState("");
  const [cityToSearch, setCityToSearch] = useState("");
  const [airQualityHistory, setAirQualityHistory] = useState([]);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  useEffect(() => {
    const fetchWeatherAndAirQuality = async (lat, lon) => {
      try {
        let weatherResponse;
        if (lat && lon) {
          weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=d001c75c49c087df4a01e98f695efaf0&units=metric`
          );
        } else {
          weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${cityToSearch}&appid=d001c75c49c087df4a01e98f695efaf0&units=metric`
          );
        }

        const weather = weatherResponse.data;
        setWeatherData(weather);

        const { lat: latitude, lon: longitude } = weather.coord;

        const historicalAirQualityPromises = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const timestamp = Math.floor(date.getTime() / 1000);

          const airQualityResponse = axios.get(
            `https://api.openweathermap.org/data/2.5/air_pollution/history?lat=${latitude}&lon=${longitude}&start=${timestamp}&end=${timestamp + 86400}&appid=d001c75c49c087df4a01e98f695efaf0`
          );

          historicalAirQualityPromises.push(airQualityResponse);
        }

        const historicalData = await Promise.all(historicalAirQualityPromises);

        const airQualityHistoryData = historicalData.map((response, index) => {
          const aqi = response.data.list[0]?.main.aqi || 0;
          const date = new Date();
          date.setDate(date.getDate() - index);
          return { time: date.toLocaleDateString(), aqi };
        });

        setAirQualityHistory(airQualityHistoryData);

        const currentAirQuality = airQualityHistoryData[0].aqi;
        setAirQuality(currentAirQuality);

        // Sistema de alertas basado en la calidad del aire
        if (currentAirQuality >= 4) {
          alert("¡Alerta! La calidad del aire es peligrosa.");
        }
      } catch (error) {
        console.error("Error fetching weather or air quality data:", error);
      }
    };

    if (useCurrentLocation) {
      // Si se permite el uso de la ubicación actual, obtener las coordenadas
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherAndAirQuality(latitude, longitude);
          setUseCurrentLocation(false); // Resetear para permitir nuevas búsquedas
        },
        (error) => {
          console.error("Error obtaining location:", error);
          setUseCurrentLocation(false); // Asegurarse de que el estado se reinicie incluso si hay un error
        }
      );
    } else if (cityToSearch) {
      // Si se ingresa una ciudad, buscar por nombre de ciudad
      fetchWeatherAndAirQuality(null, null);
    }
  }, [cityToSearch, useCurrentLocation]);

  const handleChange = (event) => {
    setUserCity(event.target.value);
  };

  const handleSearch = () => {
    setCityToSearch(userCity);
  };

  const handleUseCurrentLocation = () => {
    setUseCurrentLocation(true);
    setCityToSearch(""); // Limpiar búsqueda previa
  };

  const data = {
    labels: airQualityHistory.map((entry) => entry.time),
    datasets: [
      {
        label: "Índice de Calidad del Aire (AQI)",
        data: airQualityHistory.map((entry) => entry.aqi),
        fill: false,
        borderColor: "rgba(75,192,192,1)",
        tension: 0.1,
      },
    ],
  };

  return (
    <div>
      <input
        type="text"
        value={userCity}
        onChange={handleChange}
        placeholder="Ingrese el nombre de la ciudad"
      />
      <button onClick={handleSearch}>Buscar Ciudad</button>
      <button onClick={handleUseCurrentLocation}>Usar Ubicación Actual</button>

      {weatherData ? (
        <div>
          <h1>Ciudad: {weatherData.name}</h1>
          <p>Latitud: {weatherData.coord.lat}</p>
          <p>Longitud: {weatherData.coord.lon}</p>
          <p>Temperatura: {weatherData.main.temp}°C</p>
          <p>Humedad: {weatherData.main.humidity}%</p>

          {airQuality ? (
            <>
              <p>Calidad del aire (Índice de calidad del aire - AQI): {airQuality}</p>
              <Line data={data} />
            </>
          ) : (
            <p>Cargando calidad del aire...</p>
          )}
        </div>
      ) : (
        <p>Cargando...</p>
      )}
    </div>
  );
}

export default App;
