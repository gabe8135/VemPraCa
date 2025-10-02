"use client";

import React, { useEffect, useState } from "react";
import { FiClock } from "react-icons/fi";
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

// Descrição textual de códigos meteorológicos Open-Meteo em PT-BR
const weatherCodeDescription = (code) => {
  const map = {
    0: "Céu limpo",
    1: "Predomínio de sol",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Nevoeiro",
    48: "Nevoeiro gelado",
    51: "Garoa fraca",
    53: "Garoa moderada",
    55: "Garoa intensa",
    56: "Garoa congelante leve",
    57: "Garoa congelante intensa",
    61: "Chuva fraca",
    63: "Chuva moderada",
    65: "Chuva forte",
    66: "Chuva congelante leve",
    67: "Chuva congelante forte",
    71: "Neve fraca",
    73: "Neve moderada",
    75: "Neve forte",
    77: "Grãos de neve",
    80: "Aversos de chuva fracos",
    81: "Aversos de chuva moderados",
    82: "Aversos de chuva fortes",
    85: "Aversos de neve fracos",
    86: "Aversos de neve fortes",
    95: "Tempestade",
    96: "Tempestade com granizo leve",
    99: "Tempestade com granizo forte",
  };
  return map[code] || "Condição indefinida";
};

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
  const [todayRange, setTodayRange] = useState(null); // mín/máx de hoje
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

  return (
    <Fade triggerOnce>
      <section className="relative w-[98%] mx-auto mb-8">
        {/* Fundo suavizado: gradiente dinâmico com borda sutil */}
        <div
          className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${theme.wrapperBg} shadow`}
        />
        <div
          className={`relative rounded-3xl overflow-hidden ring-1 ${theme.ring}`}
        >
          <div
            className={`pointer-events-none absolute inset-0 ${theme.overlay} ${theme.overlayAnim}`}
          />
          <div
            className={`relative p-5 md:p-7 flex flex-col gap-6 ${theme.textMain}`}
          >
            <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-slate-800">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full backdrop-blur-sm text-[11px] font-medium uppercase tracking-wide shadow-sm border ${theme.headerPill}`}
                  >
                    Clima agora
                  </span>
                  <span className="text-slate-700 font-light">
                    | {cidade || "Ilha Comprida"}
                  </span>
                </h2>
                {(resolvedCity ||
                  (resolvedCoords.lat && resolvedCoords.lon)) && (
                  <p
                    className={`mt-1 text-[11px] font-medium ${theme.subtitleText} flex items-center gap-2`}
                  >
                    <FiClock className="text-blue-500" size={14} />
                    <span>Atualizado {lastUpdate}</span>
                    <span className="hidden sm:inline text-blue-500/70">
                      • Fonte Open‑Meteo
                    </span>
                  </p>
                )}
              </div>
              {stormAlert && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-xs font-semibold shadow-sm">
                  <WiThunderstorm size={20} className="text-red-500" />
                  Alerta de tempestade
                </div>
              )}
            </header>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Bloco Agora */}
              <div
                className={`relative rounded-2xl backdrop-blur-sm p-5 flex flex-col items-center text-center border shadow-sm ${theme.nowCardBg}`}
              >
                <div className="relative mb-1">
                  <div className="absolute inset-0 blur-xl opacity-40 bg-gradient-to-tr from-sky-300 via-blue-200 to-indigo-200" />
                  <div className="relative flex items-center justify-center">
                    {weather && getWeatherIcon(weather.weathercode, isDay, 80)}
                  </div>
                </div>
                {weather ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-light leading-none text-slate-800">
                          {Math.round(weather.temperature)}
                        </span>
                        <span className="text-2xl font-semibold mt-1 text-slate-700">
                          °C
                        </span>
                      </div>
                      {todayRange && (
                        <div className="inline-flex">
                          <div className="flex flex-col px-2.5 py-1 rounded-md bg-white/70 text-[12px] leading-tight text-slate-700">
                            <div className="flex items-baseline gap-1">
                              <span className="uppercase text-slate-500">
                                máx
                              </span>
                              <span className="font-semibold">
                                {Math.round(todayRange.temp_max)}°
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="uppercase text-slate-500">
                                mín
                              </span>
                              <span className="font-semibold">
                                {Math.round(todayRange.temp_min)}°
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium tracking-wide uppercase text-slate-600">
                      {weatherCodeDescription(weather.weathercode)}
                    </p>
                    {typeof apparent === "number" && (
                      <div
                        className={`mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium shadow-sm border ${theme.sensationPill}`}
                      >
                        Sensação {Math.round(apparent)}°C
                      </div>
                    )}
                  </>
                ) : loading ? (
                  <p className="text-sm text-slate-600">Carregando...</p>
                ) : error ? (
                  <p className="text-sm text-red-600">{error}</p>
                ) : null}
              </div>

              {/* Bloco Amanhã */}
              <div
                className={`relative rounded-2xl backdrop-blur-sm p-5 flex flex-col justify-between border shadow-sm ${tomorrowTheme.tomorrowCardBg}`}
              >
                {forecast ? (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                        Amanhã
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(forecast.date).toLocaleDateString("pt-BR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="scale-90 -ml-1">
                        {getWeatherIcon(forecast.weathercode, true)}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700">
                          {weatherCodeDescription(forecast.weathercode)}
                        </span>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`inline-flex items-baseline gap-1 px-2.5 py-1 rounded-md text-[13px] font-semibold shadow-sm ${tomorrowTheme.tempMaxPill}`}
                          >
                            {Math.round(forecast.temp_max)}°C
                            <span className="text-[10px] font-medium text-blue-600">
                              máx
                            </span>
                          </span>
                          <span
                            className={`inline-flex items-baseline gap-1 px-2.5 py-1 rounded-md text-[13px] font-semibold shadow-sm ${tomorrowTheme.tempMinPill}`}
                          >
                            {Math.round(forecast.temp_min)}°C
                            <span className="text-[10px] font-medium text-sky-600">
                              mín
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    {loading ? "Carregando previsão..." : "Sem dados"}
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé */}
            <footer className="flex flex-wrap items-center gap-2 pt-2 border-t border-sky-100/70">
              {(resolvedCity || (resolvedCoords.lat && resolvedCoords.lon)) && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium ${theme.footerLocalPill}`}
                >
                  Local: {resolvedCity || "GPS"}
                </span>
              )}
              {resolvedCoords.lat && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] tracking-wide ${theme.footerCoordPill}`}
                >
                  {resolvedCoords.lat.toFixed(3)},{" "}
                  {resolvedCoords.lon.toFixed(3)}
                </span>
              )}
              {/* Disclaimer removido conforme solicitação */}
            </footer>
          </div>
        </div>
      </section>
    </Fade>
  );
}
