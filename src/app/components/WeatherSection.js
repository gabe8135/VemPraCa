import React, { useEffect, useState } from "react";
import { Fade } from "react-awesome-reveal";
import {
  WiDaySunny,
  WiNightClear,
  WiCloudy,
  WiRain,
  WiThunderstorm,
  WiFog,
  WiDayCloudy,
  WiNightCloudy,
} from "react-icons/wi";

// Função simples para obter lat/lon de cidades de SP (pode expandir depois)
const cidadesSP = {
  "São Paulo": { lat: -23.5505, lon: -46.6333 },
  Campinas: { lat: -22.9056, lon: -47.0608 },
  Santos: { lat: -23.9608, lon: -46.3336 },
  "Ribeirão Preto": { lat: -21.1699, lon: -47.8103 },
  Sorocaba: { lat: -23.5015, lon: -47.4526 },
  "Ilha Comprida": { lat: -24.7302, lon: -47.5531 },
  // Adicione mais cidades conforme necessário
};

export default function WeatherSection({ cidade }) {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let lat, lon;
    if (cidade) {
      const info = cidadesSP[cidade] || cidadesSP["São Paulo"];
      if (!info) {
        setError("Cidade não suportada.");
        setLoading(false);
        return;
      }
      lat = info.lat;
      lon = info.lon;
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=America/Sao_Paulo`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.current_weather) {
            setWeather(data.current_weather);
          } else {
            setError("Não foi possível obter o clima.");
          }
          // Previsão para amanhã (índice 1)
          if (
            data.daily &&
            data.daily.weathercode &&
            data.daily.weathercode.length > 1
          ) {
            setForecast({
              weathercode: data.daily.weathercode[1],
              temp_max: data.daily.temperature_2m_max[1],
              temp_min: data.daily.temperature_2m_min[1],
              date: data.daily.time[1],
            });
          } else {
            setForecast(null);
          }
          setLoading(false);
        })
        .catch(() => {
          setError("Erro ao buscar dados do clima.");
          setLoading(false);
        });
    } else {
      // Tenta capturar localização do usuário
      if (userLocation) {
        lat = userLocation.lat;
        lon = userLocation.lon;
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=America/Sao_Paulo`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data.current_weather) {
              setWeather(data.current_weather);
            } else {
              setError("Não foi possível obter o clima.");
            }
            if (
              data.daily &&
              data.daily.weathercode &&
              data.daily.weathercode.length > 1
            ) {
              setForecast({
                weathercode: data.daily.weathercode[1],
                temp_max: data.daily.temperature_2m_max[1],
                temp_min: data.daily.temperature_2m_min[1],
                date: data.daily.time[1],
              });
            } else {
              setForecast(null);
            }
            setLoading(false);
          })
          .catch(() => {
            setError("Erro ao buscar dados do clima.");
            setLoading(false);
          });
      } else {
        // Solicita localização ao navegador
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
              });
            },
            () => {
              setError("Não foi possível obter sua localização.");
              setLoading(false);
            }
          );
        } else {
          setError("Geolocalização não suportada.");
          setLoading(false);
        }
      }
    }
  }, [cidade, userLocation]);

  if (!cidade && !userLocation)
    return (
      <section className="w-full py-8 px-4 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg mb-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-emerald-700 mb-2 tracking-tight">
          Clima local
        </h2>
        <p className="text-emerald-600">Capturando localização...</p>
      </section>
    );

  // Função para escolher ícone e cor de acordo com o código do tempo
  function getWeatherIcon(code, isDay) {
    // Códigos Open-Meteo: https://open-meteo.com/en/docs#api_form
    if ([0].includes(code))
      return isDay ? (
        <WiDaySunny className="text-yellow-400 drop-shadow-lg" size={64} />
      ) : (
        <WiNightClear className="text-indigo-600 drop-shadow-lg" size={64} />
      );
    if ([1, 2, 3].includes(code))
      return isDay ? (
        <WiDayCloudy className="text-blue-400 drop-shadow-lg" size={64} />
      ) : (
        <WiNightCloudy className="text-indigo-400 drop-shadow-lg" size={64} />
      );
    if ([45, 48].includes(code))
      return <WiFog className="text-gray-500 drop-shadow-lg" size={64} />;
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
      return <WiRain className="text-cyan-500 drop-shadow-lg" size={64} />;
    if ([71, 73, 75, 77, 85, 86].includes(code))
      return <WiCloudy className="text-sky-400 drop-shadow-lg" size={64} />;
    if ([95, 96, 99].includes(code))
      return (
        <WiThunderstorm className="text-purple-600 drop-shadow-lg" size={64} />
      );
    return <WiCloudy className="text-blue-300 drop-shadow-lg" size={64} />;
  }

  // Detecta se é dia ou noite pelo horário local
  const isDay = (() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
  })();

  return (
    <Fade triggerOnce>
      <section className="w-full py-8 px-4 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg mb-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-emerald-700 mb-2 tracking-tight">
          Clima em {cidade}
        </h2>
        {loading && <p className="text-emerald-600">Carregando clima...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {weather && (
          <Fade direction="up" triggerOnce>
            <div className="flex flex-col items-center gap-2">
              <div className="mb-2">
                {getWeatherIcon(weather.weathercode, isDay)}
              </div>
              <span className="text-3xl font-bold text-emerald-700">
                {Math.round(weather.temperature)}°C
              </span>
              <span className="text-base text-gray-700">
                Vento: {Math.round(weather.windspeed)} km/h
              </span>
              <span className="text-sm text-gray-500">
                {isDay ? "Dia" : "Noite"}
              </span>
            </div>
          </Fade>
        )}
        {/* Previsão para amanhã */}
        {forecast && (
          <Fade direction="up" delay={200} triggerOnce>
            <div className="flex flex-col items-center gap-2 mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 shadow">
              <span className="text-lg font-semibold text-emerald-700 mb-1">
                Previsão para amanhã
              </span>
              <div className="mb-2">
                {getWeatherIcon(forecast.weathercode, true)}
              </div>
              <span className="text-xl font-bold text-emerald-700">
                {Math.round(forecast.temp_max)}°C{" "}
                <span className="text-gray-500">máx</span>
              </span>
              <span className="text-xl font-bold text-blue-700">
                {Math.round(forecast.temp_min)}°C{" "}
                <span className="text-gray-500">mín</span>
              </span>
              <span className="text-sm text-gray-500">
                {new Date(forecast.date).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
          </Fade>
        )}
      </section>
    </Fade>
  );
}
