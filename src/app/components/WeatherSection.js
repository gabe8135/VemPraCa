// Mock de cidadesSP para garantir funcionamento do card
const cidadesSP = {
  "Ilha Comprida": { lat: -24.7302, lon: -47.5383 },
  "São Paulo": { lat: -23.5505, lon: -46.6333 },
  Campinas: { lat: -22.9056, lon: -47.0608 },
  Santos: { lat: -23.9608, lon: -46.3336 },
  "Ribeirão Preto": { lat: -21.1775, lon: -47.8103 },
  Sorocaba: { lat: -23.5015, lon: -47.4526 },
  Registro: { lat: -24.4971, lon: -47.8449 },
};
// Função para extrair cidade e UF de uma string
function getCidadeUF(nome) {
  if (!nome) return { cidade: "Ilha Comprida", uf: "SP" };
  const match = nome.match(/(.+)[,\-\s]+([A-Z]{2})$/i);
  if (match) {
    return { cidade: match[1].trim(), uf: match[2].toUpperCase() };
  }
  // fallback para cidades conhecidas
  const lower = nome.toLowerCase();
  if (lower.includes("ilha comprida"))
    return { cidade: "Ilha Comprida", uf: "SP" };
  if (lower.includes("são paulo")) return { cidade: "São Paulo", uf: "SP" };
  if (lower.includes("campinas")) return { cidade: "Campinas", uf: "SP" };
  if (lower.includes("santos")) return { cidade: "Santos", uf: "SP" };
  if (lower.includes("ribeirão preto"))
    return { cidade: "Ribeirão Preto", uf: "SP" };
  if (lower.includes("sorocaba")) return { cidade: "Sorocaba", uf: "SP" };
  if (lower.includes("registro")) return { cidade: "Registro", uf: "SP" };
  return { cidade: nome, uf: "" };
}
// Mapeia o código do tempo para descrição textual
function weatherCodeDescription(code) {
  const map = {
    0: "Céu limpo",
    1: "Principalmente limpo",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Névoa",
    48: "Névoa gelada",
    51: "Garoa leve",
    53: "Garoa moderada",
    55: "Garoa densa",
    61: "Chuva leve",
    63: "Chuva moderada",
    65: "Chuva forte",
    71: "Neve leve",
    73: "Neve moderada",
    75: "Neve forte",
    77: "Grãos de neve",
    80: "Aguaceiros leves",
    81: "Aguaceiros moderados",
    82: "Aguaceiros violentos",
    85: "Aguaceiros de neve leves",
    86: "Aguaceiros de neve fortes",
    95: "Trovoada",
    96: "Trovoada com granizo leve",
    99: "Trovoada com granizo forte",
  };
  return map[code] || "Tempo desconhecido";
}
import {
  WiDaySunny,
  WiNightClear,
  WiDayCloudy,
  WiNightCloudy,
  WiFog,
  WiRain,
  WiCloudy,
  WiThunderstorm,
} from "react-icons/wi";

import React, { useState, useEffect } from "react";

// Removido bloco duplicado do componente WeatherSection

// Funções utilitárias e constantes abaixo:
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

// Humidex (Environment Canada) => mede desconforto por calor + umidade
const humidexC = (tempC, dewPointC) => {
  if (typeof tempC !== "number" || typeof dewPointC !== "number") return tempC;
  const e = 6.11 * Math.exp(5417.753 * (1 / 273.16 - 1 / (dewPointC + 273.15)));
  return tempC + 0.5555 * (e - 10);
};

// Ponto de orvalho (Magnus-Tetens) - entrada tempC, RH (%)
const dewPointMagnus = (tempC, rh) => {
  if (typeof tempC !== "number" || typeof rh !== "number" || rh <= 0)
    return null;
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  return (b * alpha) / (a - alpha);
};

// Australian Apparent Temperature (Steadman) simplificada
// AT = T + 0.33*e - 0.70*ws - 4.00  (e em hPa, ws em m/s)
const australianAT = (tempC, rh, windKmh) => {
  if (
    typeof tempC !== "number" ||
    typeof rh !== "number" ||
    typeof windKmh !== "number"
  )
    return tempC;
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  const ws = windKmh / 3.6; // m/s
  return tempC + 0.33 * e - 0.7 * ws - 4.0;
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

// Componente principal
export default function WeatherSection({ cidade }) {
  // Estados
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
  const [todayRange, setTodayRange] = useState(null);
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
    const cidadesLookup =
      typeof cidadesSP !== "undefined"
        ? Object.keys(cidadesSP).reduce((acc, key) => {
            acc[sanitizeCityName(key)] = key;
            return acc;
          }, {})
        : {};
    if (cidade && typeof cidadesSP !== "undefined") {
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
                const dewPoint = dewPointMagnus(t, rh);
                if (t >= 27 && rh >= 40) {
                  feels = heatIndexC(t, rh);
                } else if (t >= 24 && t < 27 && rh >= 50 && dewPoint !== null) {
                  feels = humidexC(t, dewPoint);
                } else if (t <= 10) {
                  feels = windChillC(t, v);
                } else {
                  // fallback australian apparent temperature para faixa temperada
                  feels = australianAT(t, rh, v);
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
          // Mín/Máx de hoje (índice 0)
          if (
            data.daily &&
            Array.isArray(data.daily.temperature_2m_max) &&
            data.daily.temperature_2m_max.length > 0 &&
            Array.isArray(data.daily.temperature_2m_min) &&
            data.daily.temperature_2m_min.length > 0
          ) {
            setTodayRange({
              temp_max: data.daily.temperature_2m_max[0],
              temp_min: data.daily.temperature_2m_min[0],
            });
          } else {
            setTodayRange(null);
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
                  const dewPoint = dewPointMagnus(t, rh);
                  if (t >= 27 && rh >= 40) {
                    feels = heatIndexC(t, rh);
                  } else if (
                    t >= 24 &&
                    t < 27 &&
                    rh >= 50 &&
                    dewPoint !== null
                  ) {
                    feels = humidexC(t, dewPoint);
                  } else if (t <= 10) {
                    feels = windChillC(t, v);
                  } else {
                    feels = australianAT(t, rh, v);
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
            // Mín/Máx de hoje (índice 0)
            if (
              data.daily &&
              Array.isArray(data.daily.temperature_2m_max) &&
              data.daily.temperature_2m_max.length > 0 &&
              Array.isArray(data.daily.temperature_2m_min) &&
              data.daily.temperature_2m_min.length > 0
            ) {
              setTodayRange({
                temp_max: data.daily.temperature_2m_max[0],
                temp_min: data.daily.temperature_2m_min[0],
              });
            } else {
              setTodayRange(null);
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
    // eslint-disable-next-line
  }, [cidade, userLocation]);

  if (!cidade && !userLocation)
    return (
      <section className="w-full py-8 px-4 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg mb-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
          Clima local
        </h2>
        <p className="text-slate-600">Capturando localização...</p>
      </section>
    );

  // Exibe mensagem de erro se houver
  if (error) {
    return (
      <section className="w-full py-8 px-4 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg mb-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-red-700 mb-2 tracking-tight">
          Erro ao carregar clima
        </h2>
        <p className="text-slate-600">{error}</p>
      </section>
    );
  }

  // Debug: log dos dados carregados
  if (typeof window !== "undefined") {
    console.log(
      "weather:",
      weather,
      "todayRange:",
      todayRange,
      "resolvedCity:",
      resolvedCity,
      "cidade:",
      cidade
    );
  }

  // Função para escolher ícone e cor de acordo com o código do tempo
  function getWeatherIcon(code, isDay, size = 64) {
    // Códigos Open-Meteo: https://open-meteo.com/en/docs#api_form
    if ([0].includes(code))
      return isDay ? (
        <WiDaySunny className="text-yellow-400 drop-shadow-lg" size={size} />
      ) : (
        <WiNightClear className="text-indigo-600 drop-shadow-lg" size={size} />
      );
    if ([1, 2, 3].includes(code))
      return isDay ? (
        <WiDayCloudy className="text-blue-400 drop-shadow-lg" size={size} />
      ) : (
        <WiNightCloudy className="text-indigo-400 drop-shadow-lg" size={size} />
      );
    if ([45, 48].includes(code))
      return <WiFog className="text-gray-500 drop-shadow-lg" size={size} />;
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
      return <WiRain className="text-cyan-500 drop-shadow-lg" size={size} />;
    if ([71, 73, 75, 77, 85, 86].includes(code))
      return <WiCloudy className="text-sky-400 drop-shadow-lg" size={size} />;
    if ([95, 96, 99].includes(code))
      return (
        <WiThunderstorm
          className="text-purple-600 drop-shadow-lg"
          size={size}
        />
      );
    return <WiCloudy className="text-blue-300 drop-shadow-lg" size={size} />;
  }

  // Detecta se é dia ou noite pelo horário local
  const isDay = (() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
  })();

  // (Descrição movida para escopo de módulo)

  const lastUpdate = weather
    ? new Date(weather.time).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Tema dinâmico (azul/céu) de acordo com condição e dia/noite
  const getTheme = (code, isDay) => {
    const isClear = [0, 1].includes(code);
    const isCloud = [2, 3].includes(code);
    const isFog = [45, 48].includes(code);
    const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
    const isSnow = [71, 73, 75, 77, 85, 86].includes(code);
    const isStorm = [95, 96, 99].includes(code);

    // Defaults (céu limpo diurno)
    let theme = {
      wrapperBg: "from-sky-50 via-white to-blue-50",
      ring: "ring-sky-100/60",
      overlay:
        "bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,248,0.10),transparent_80%)]",
      overlayAnim: "",
      textMain: "text-slate-900",
      headerPill: "bg-sky-500/15 border-sky-300 text-sky-800",
      subtitleText: "text-slate-600",
      nowCardBg: "bg-gradient-to-b from-white/85 to-white/70 border-sky-200",
      tomorrowCardBg:
        "bg-gradient-to-b from-white/85 to-white/70 border-sky-200",
      sensationPill: "bg-blue-200 text-blue-800 border-blue-300",
      tempMaxPill: "bg-blue-200 border-blue-300 text-blue-800",
      tempMinPill: "bg-sky-100 border-sky-200 text-sky-800",
      footerLocalPill: "bg-blue-200/60 border-blue-300 text-blue-900",
      footerCoordPill: "bg-sky-100 border-sky-200 text-sky-700",
    };

    if (isClear && !isDay) {
      theme = {
        ...theme,
        wrapperBg: "from-indigo-50 via-white to-slate-50",
        ring: "ring-indigo-100/60",
        overlay:
          "bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.10),transparent_80%)]",
        headerPill: "bg-indigo-500/15 border-indigo-300 text-indigo-800",
        nowCardBg:
          "bg-gradient-to-b from-white/85 to-white/70 border-indigo-200",
        tomorrowCardBg:
          "bg-gradient-to-b from-white/85 to-white/70 border-indigo-200",
        sensationPill: "bg-indigo-200 text-indigo-800 border-indigo-300",
        tempMaxPill: "bg-indigo-200 border-indigo-300 text-indigo-800",
        tempMinPill: "bg-indigo-100 border-indigo-200 text-indigo-800",
        footerLocalPill: "bg-indigo-200/60 border-indigo-300 text-indigo-900",
      };
    } else if (isCloud) {
      theme = {
        ...theme,
        wrapperBg: "from-slate-100 via-white to-slate-50",
        ring: "ring-slate-300/60",
        overlay:
          "bg-[radial-gradient(circle_at_25%_20%,rgba(100,116,139,0.08),transparent_80%)]",
        headerPill: "bg-slate-500/15 border-slate-300 text-slate-800",
        nowCardBg:
          "bg-gradient-to-b from-white/85 to-white/70 border-slate-200",
        tomorrowCardBg:
          "bg-gradient-to-b from-white/85 to-white/70 border-slate-200",
        sensationPill: "bg-slate-200 text-slate-800 border-slate-300",
        tempMaxPill: "bg-slate-200 border-slate-300 text-slate-800",
        tempMinPill: "bg-slate-100 border-slate-200 text-slate-800",
        footerLocalPill: "bg-slate-200/60 border-slate-300 text-slate-900",
      };
    } else if (isFog) {
      theme = {
        ...theme,
        wrapperBg: "from-gray-100 via-white to-slate-50",
        ring: "ring-gray-300/60",
        overlay:
          "bg-[radial-gradient(circle_at_25%_20%,rgba(107,114,128,0.08),transparent_80%)]",
        headerPill: "bg-gray-500/15 border-gray-300 text-gray-800",
        nowCardBg: "bg-gradient-to-b from-white/85 to-white/70 border-gray-200",
        tomorrowCardBg:
          "bg-gradient-to-b from-white/85 to-white/70 border-gray-200",
        sensationPill: "bg-gray-200 text-gray-800 border-gray-300",
        tempMaxPill: "bg-gray-200 border-gray-300 text-gray-800",
        tempMinPill: "bg-slate-100 border-slate-200 text-slate-800",
        footerLocalPill: "bg-gray-200/60 border-gray-300 text-gray-900",
      };
    } else if (isRain) {
      theme = {
        ...theme,
        wrapperBg: "from-sky-100 via-blue-50 to-indigo-100",
        ring: "ring-sky-300/70",
        overlay:
          "bg-[radial-gradient(circle_at_25%_20%,rgba(59,130,246,0.10),transparent_80%)]",
        overlayAnim: "animate-[pulse_7s_ease-in-out_infinite]",
        headerPill: "bg-blue-500/15 border-blue-300 text-blue-800",
        nowCardBg: "bg-gradient-to-b from-white/85 to-white/70 border-sky-200",
        tomorrowCardBg:
          "bg-gradient-to-b from-white/85 to-white/70 border-sky-200",
        sensationPill: "bg-blue-200 text-blue-800 border-blue-300",
        tempMaxPill: "bg-blue-200 border-blue-300 text-blue-800",
        tempMinPill: "bg-sky-100 border-sky-200 text-sky-800",
        footerLocalPill: "bg-blue-200/60 border-blue-300 text-blue-900",
      };
    } else if (isSnow) {
      theme = {
        ...theme,
        wrapperBg: "from-blue-50 via-white to-slate-50",
        ring: "ring-blue-200/70",
        overlay:
          "bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,248,0.08),transparent_80%)]",
        headerPill: "bg-sky-500/15 border-sky-300 text-sky-800",
        nowCardBg: "bg-gradient-to-b from-white/85 to-white/70 border-blue-200",
        tomorrowCardBg:
          "bg-gradient-to-b from-white/85 to-white/70 border-blue-200",
        sensationPill: "bg-sky-200 text-sky-800 border-sky-300",
        tempMaxPill: "bg-blue-200 border-blue-300 text-blue-800",
        tempMinPill: "bg-sky-100 border-sky-200 text-sky-800",
        footerLocalPill: "bg-blue-200/60 border-blue-300 text-blue-900",
      };
    } else if (isStorm) {
      theme = {
        ...theme,
        wrapperBg: "from-indigo-100 via-white to-violet-100",
        ring: "ring-violet-300/80",
        overlay:
          "bg-[radial-gradient(circle_at_25%_20%,rgba(139,92,246,0.10),transparent_80%)]",
        overlayAnim: "animate-[pulse_6s_ease-in-out_infinite]",
        headerPill: "bg-violet-500/15 border-violet-300 text-violet-800",
        nowCardBg:
          "bg-gradient-to-b from-white/85 to-white/70 border-violet-200",
        tomorrowCardBg:
          "bg-gradient-to-b from-white/85 to-white/70 border-violet-200",
        sensationPill: "bg-violet-200 text-violet-800 border-violet-300",
        tempMaxPill: "bg-violet-200 border-violet-300 text-violet-800",
        tempMinPill: "bg-indigo-100 border-indigo-200 text-indigo-800",
        footerLocalPill: "bg-violet-200/60 border-violet-300 text-violet-900",
      };
    }

    return theme;
  };

  const theme = getTheme(weather?.weathercode ?? 1, isDay);
  const tomorrowTheme = forecast ? getTheme(forecast.weathercode, true) : theme;

  // Novo layout centralizado, clean, inspirado no exemplo da imagem
  function getMainWeatherIcon(code, isDay, size = 110) {
    // Azul claro para céu, branco para noite/neutro
    const azulCeo = "#90cdf4"; // azul claro (tailwind sky-300)
    const branco = "#fff";
    if ([0].includes(code))
      return isDay ? (
        <WiDaySunny
          style={{ color: azulCeo }}
          className="drop-shadow-lg"
          size={size}
        />
      ) : (
        <WiNightClear
          style={{ color: branco }}
          className="drop-shadow-lg"
          size={size}
        />
      );
    if ([1, 2, 3].includes(code))
      return isDay ? (
        <WiDayCloudy
          style={{ color: azulCeo }}
          className="drop-shadow-lg"
          size={size}
        />
      ) : (
        <WiNightCloudy
          style={{ color: branco }}
          className="drop-shadow-lg"
          size={size}
        />
      );
    if ([45, 48].includes(code))
      return (
        <WiFog
          style={{ color: branco }}
          className="drop-shadow-lg"
          size={size}
        />
      );
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
      return isDay ? (
        <WiRain
          style={{ color: azulCeo }}
          className="drop-shadow-lg"
          size={size}
        />
      ) : (
        <WiRain
          style={{ color: branco }}
          className="drop-shadow-lg"
          size={size}
        />
      );
    if ([95, 96, 99].includes(code))
      return (
        <span className="relative inline-block">
          <WiThunderstorm
            style={{ color: branco }}
            className="drop-shadow-lg"
            size={size}
          />
          <WiRain
            style={{ color: azulCeo, opacity: 0.7 }}
            className="absolute left-0 top-0"
            size={size * 0.7}
          />
        </span>
      );
    return (
      <WiCloudy
        style={{ color: azulCeo }}
        className="drop-shadow-lg"
        size={size}
      />
    );
  }

  function getBgGradient(code, isDay) {
    if ([0].includes(code))
      return isDay
        ? "bg-gradient-to-br from-sky-300 via-blue-200 to-blue-400"
        : "bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900";
    if ([1, 2, 3].includes(code))
      return isDay
        ? "bg-gradient-to-br from-sky-200 via-blue-100 to-blue-300"
        : "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900";
    if ([45, 48].includes(code))
      return isDay
        ? "bg-gradient-to-br from-gray-200 via-slate-100 to-slate-300"
        : "bg-gradient-to-br from-gray-800 via-slate-700 to-slate-900";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
      return isDay
        ? "bg-gradient-to-br from-cyan-200 via-blue-200 to-blue-400"
        : "bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900";
    if ([95, 96, 99].includes(code))
      return isDay
        ? "bg-gradient-to-br from-purple-400 via-blue-300 to-blue-700"
        : "bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900";
    return isDay
      ? "bg-gradient-to-br from-sky-100 via-blue-50 to-blue-200"
      : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900";
  }

  // Extrai cidade e UF para exibição
  const { cidade: cidadeNome, uf: cidadeUF } = getCidadeUF(
    resolvedCity || cidade || "Ilha Comprida, SP"
  );

  // Relógio em tempo real com dois pontos piscando
  const [clock, setClock] = useState(new Date());
  const [showColon, setShowColon] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date());
      setShowColon((v) => !v);
    }, 1000); // Pisca a cada segundo
    return () => clearInterval(interval);
  }, []);

  // Se quiser usar o horário da API, pode ajustar aqui, mas para o relógio local, use clock
  const horaStr = `${clock.getHours().toString().padStart(2, "0")}${showColon ? ":" : " "}${clock.getMinutes().toString().padStart(2, "0")}`;
  const dataStr = clock.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <section
      className={`mt-4 w-[95%] max-w-5xl mx-auto my-8 rounded-3xl shadow-xl p-0 overflow-hidden ${getBgGradient(weather?.weathercode ?? 1, isDay)}`}
    >
      <div className="relative flex flex-col justify-between px-7 py-8 min-h-[370px]">
        {/* Ícones decorativos de fundo dinâmicos */}
        {(() => {
          // Define ícones e cores conforme o clima
          let IconLeft = WiCloudy;
          let IconRight = WiDaySunny;
          let colorLeft = "#90cdf4"; // azul claro
          let colorRight = "#fff";
          let opacityLeft = 0.1;
          let opacityRight = 0.09;
          if (weather) {
            const code = weather.weathercode;
            if ([0].includes(code)) {
              IconLeft = isDay ? WiDaySunny : WiNightClear;
              colorLeft = isDay ? "#90cdf4" : "#fff";
              IconRight = isDay ? WiDaySunny : WiNightClear;
              colorRight = isDay ? "#fff" : "#90cdf4";
            } else if ([1, 2, 3].includes(code)) {
              IconLeft = isDay ? WiDayCloudy : WiNightCloudy;
              colorLeft = isDay ? "#90cdf4" : "#fff";
              IconRight = WiCloudy;
              colorRight = "#fff";
            } else if ([45, 48].includes(code)) {
              IconLeft = WiFog;
              colorLeft = "#fff";
              IconRight = WiCloudy;
              colorRight = "#90cdf4";
            } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
              IconLeft = WiRain;
              colorLeft = "#90cdf4";
              IconRight = WiCloudy;
              colorRight = "#fff";
            } else if ([95, 96, 99].includes(code)) {
              IconLeft = WiThunderstorm;
              colorLeft = "#fff";
              IconRight = WiRain;
              colorRight = "#90cdf4";
            }
          }
          return (
            <>
              <IconLeft
                style={{ color: colorLeft, opacity: opacityLeft }}
                className="pointer-events-none select-none absolute left-[-40px] top-[40px] z-0"
                size={180}
              />
              <IconRight
                style={{ color: colorRight, opacity: opacityRight }}
                className="pointer-events-none select-none absolute right-[-30px] top-[120px] z-0"
                size={140}
              />
            </>
          );
        })()}
        {/* Topo: Cidade/UF à esquerda, hora à direita */}
        <div className="w-full flex flex-row items-start justify-between mb-2">
          <div className="flex flex-col items-start">
            <span className="text-xl md:text-2xl font-semibold text-white drop-shadow-sm">
              {cidadeNome}
              {cidadeUF ? `, ${cidadeUF}` : ""}
            </span>
            <span className="text-base text-blue-100/90 mt-0.5">
              {dataStr.charAt(0).toUpperCase() + dataStr.slice(1)}
            </span>
          </div>
          <span className="text-lg font-semibold text-blue-100/90 mt-1">
            {horaStr}
          </span>
        </div>
        {/* Temperatura, mín/máx, descrição no canto inferior esquerdo */}
        <div className="absolute left-7 bottom-8 flex flex-col items-start">
          <div className="flex items-end gap-2">
            <span className="text-7xl md:text-8xl font-bold text-white drop-shadow-lg">
              {weather ? Math.round(weather.temperature) : "--"}
            </span>
            <span className="text-3xl font-semibold text-blue-100/90 mb-1">
              °c
            </span>
          </div>
          {todayRange && (
            <span className="text-lg text-blue-100/90 font-medium mt-1">
              {Math.round(todayRange.temp_min)}°c /{" "}
              {Math.round(todayRange.temp_max)}°c
            </span>
          )}
          <span className="text-lg text-blue-100/90 mt-1">
            {weather ? weatherCodeDescription(weather.weathercode) : "--"}
          </span>
        </div>
        {/* Ícone grande no canto inferior direito */}
        <div className="absolute right-6 bottom-6 flex items-end justify-end">
          {weather && getMainWeatherIcon(weather.weathercode, isDay, 120)}
        </div>
      </div>
    </section>
  );
}
