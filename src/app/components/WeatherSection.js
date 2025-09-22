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
  "Ilha Comprida - SP": { lat: -24.7302, lon: -47.5531 },
  Registro: { lat: -24.497, lon: -47.849 },
  // Adicione mais cidades conforme necessário
};

// Helpers no escopo de módulo (estáveis, sem impactar dependências do useEffect)
const cToF = (c) => (c * 9) / 5 + 32;
const fToC = (f) => ((f - 32) * 5) / 9;

// Heat Index (NOAA Rothfusz), retorna em °C
const heatIndexC = (tempC, rh) => {
  const T = cToF(tempC);
  const R = rh;
  let HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  if (R < 13 && T >= 80 && T <= 112) {
    const adj = ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    HI -= adj;
  }
  if (R > 85 && T >= 80 && T <= 87) {
    const adj = ((R - 85) / 10) * ((87 - T) / 5);
    HI += adj;
  }
  return fToC(HI);
};

// Wind Chill (válido para T<=10°C e vento > 4.8 km/h), retorna °C
const windChillC = (tempC, windKmH) => {
  if (tempC > 10 || windKmH <= 4.8) return tempC;
  return (
    13.12 +
    0.6215 * tempC -
    11.37 * Math.pow(windKmH, 0.16) +
    0.3965 * tempC * Math.pow(windKmH, 0.16)
  );
};

// Índice do horário mais próximo ao current_weather.time
const getNearestHourIndex = (times, currentIso) => {
  if (!Array.isArray(times) || times.length === 0 || !currentIso) return -1;
  const target = new Date(currentIso).getTime();
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]).getTime();
    const diff = Math.abs(t - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
};

export default function WeatherSection({ cidade }) {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [apparent, setApparent] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [precip, setPrecip] = useState(null);
  const [precipProb, setPrecipProb] = useState(null);
  const [stormAlert, setStormAlert] = useState(false);
  const [resolvedCity, setResolvedCity] = useState(null);
  const [resolvedCoords, setResolvedCoords] = useState({
    lat: null,
    lon: null,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    let lat, lon;
    // Normaliza nome recebido para mapear corretamente
    const sanitizeCityName = (s) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z ]/g, " ")
        .replace(/\bsp\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const cidadesLookup = Object.keys(cidadesSP).reduce((acc, key) => {
      acc[sanitizeCityName(key)] = key;
      return acc;
    }, {});
    if (cidade) {
      const key = cidadesLookup[sanitizeCityName(cidade)] || "Ilha Comprida";
      const info = cidadesSP[key] || cidadesSP["Ilha Comprida"];
      if (!info) {
        setError("Cidade não suportada.");
        setLoading(false);
        return;
      }
      lat = info.lat;
      lon = info.lon;
      setResolvedCity(key);
      setResolvedCoords({ lat, lon });
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=apparent_temperature,relativehumidity_2m,precipitation,precipitation_probability,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=America/Sao_Paulo&windspeed_unit=kmh`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.current_weather) {
            setWeather(data.current_weather);
            // Deriva dados horários para o horário atual
            const curTime = data.current_weather.time;
            const times = data.hourly?.time || [];
            let idx = getNearestHourIndex(times, curTime);
            if (idx === -1) idx = 0;
            if (data.hourly) {
              const rh =
                typeof data.hourly.relativehumidity_2m?.[idx] === "number"
                  ? data.hourly.relativehumidity_2m[idx]
                  : null;
              setHumidity(rh);
              setPrecip(
                typeof data.hourly.precipitation?.[idx] === "number"
                  ? data.hourly.precipitation[idx]
                  : null
              );
              setPrecipProb(
                typeof data.hourly.precipitation_probability?.[idx] === "number"
                  ? data.hourly.precipitation_probability[idx]
                  : null
              );
              const codeNow =
                typeof data.hourly.weathercode?.[idx] === "number"
                  ? data.hourly.weathercode[idx]
                  : data.current_weather.weathercode;
              setStormAlert([95, 96, 99].includes(codeNow));

              // Calcula sensação térmica ajustada
              const t = data.current_weather.temperature;
              const v = data.current_weather.windspeed; // km/h
              let feels = null;
              if (typeof t === "number" && typeof rh === "number") {
                if (t >= 27) {
                  feels = heatIndexC(t, rh);
                } else if (t <= 10) {
                  feels = windChillC(t, v);
                } else {
                  // Faixa intermediária: aproxima da temp. atual
                  feels = t;
                }
              }
              if (
                feels === null &&
                typeof data.hourly.apparent_temperature?.[idx] === "number"
              ) {
                feels = data.hourly.apparent_temperature[idx];
              }
              setApparent(typeof feels === "number" ? feels : null);
            }
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
        setResolvedCity(null);
        setResolvedCoords({ lat, lon });
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=apparent_temperature,relativehumidity_2m,precipitation,precipitation_probability,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=America/Sao_Paulo&windspeed_unit=kmh`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data.current_weather) {
              setWeather(data.current_weather);
              const curTime = data.current_weather.time;
              const times = data.hourly?.time || [];
              let idx = getNearestHourIndex(times, curTime);
              if (idx === -1) idx = 0;
              if (data.hourly) {
                const rh =
                  typeof data.hourly.relativehumidity_2m?.[idx] === "number"
                    ? data.hourly.relativehumidity_2m[idx]
                    : null;
                setHumidity(rh);
                setPrecip(
                  typeof data.hourly.precipitation?.[idx] === "number"
                    ? data.hourly.precipitation[idx]
                    : null
                );
                setPrecipProb(
                  typeof data.hourly.precipitation_probability?.[idx] ===
                    "number"
                    ? data.hourly.precipitation_probability[idx]
                    : null
                );
                const codeNow =
                  typeof data.hourly.weathercode?.[idx] === "number"
                    ? data.hourly.weathercode[idx]
                    : data.current_weather.weathercode;
                setStormAlert([95, 96, 99].includes(codeNow));

                // Calcula sensação térmica ajustada
                const t = data.current_weather.temperature;
                const v = data.current_weather.windspeed; // km/h
                let feels = null;
                if (typeof t === "number" && typeof rh === "number") {
                  if (t >= 27) {
                    feels = heatIndexC(t, rh);
                  } else if (t <= 10) {
                    feels = windChillC(t, v);
                  } else {
                    feels = t;
                  }
                }
                if (
                  feels === null &&
                  typeof data.hourly.apparent_temperature?.[idx] === "number"
                ) {
                  feels = data.hourly.apparent_temperature[idx];
                }
                setApparent(typeof feels === "number" ? feels : null);
              }
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
          Clima em {cidade || "Ilha Comprida"}
        </h2>
        {(resolvedCity || (resolvedCoords.lat && resolvedCoords.lon)) && (
          <span className="text-xs text-gray-400 mb-2">
            Fonte: Open‑Meteo • Local: {resolvedCity || "GPS"}
            {resolvedCoords.lat &&
              ` (${resolvedCoords.lat.toFixed(4)}, ${resolvedCoords.lon.toFixed(
                4
              )})`}
          </span>
        )}
        {stormAlert && (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-sm font-semibold">
            <WiThunderstorm size={20} className="text-red-600" />
            Alerta de tempestade
          </div>
        )}
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
              {typeof apparent === "number" && (
                <span className="text-base text-gray-700">
                  Sensação térmica: {Math.round(apparent)}°C
                </span>
              )}
              <span className="text-base text-gray-700">
                Vento: {Math.round(weather.windspeed)} km/h
              </span>
              {(typeof precip === "number" ||
                typeof precipProb === "number") && (
                <span className="text-sm text-gray-600">
                  {typeof precip === "number" &&
                    `Precipitação: ${precip.toFixed(1)} mm`}
                  {typeof precip === "number" &&
                    typeof precipProb === "number" &&
                    " • "}
                  {typeof precipProb === "number" &&
                    `Prob. de chuva: ${Math.round(precipProb)}%`}
                </span>
              )}
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
