// ===== ГЕНЕРАЦИЯ СНЕЖИНОК =====
(function createSnow() {
  const snowBg = document.getElementById('snowBg');
  const symbols = ['❄', '❅', '❆', '✻', '✼', '❉'];
 
  let seed = 12345;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
 
  const placed = [];
  const targetCount = 90;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const MIN_DIST_FACTOR = 1.15;
 
  let attempts = 0;
  const MAX_ATTEMPTS = targetCount * 40;
 
  while (placed.length < targetCount && attempts < MAX_ATTEMPTS) {
    attempts++;
    const size = 14 + rand() * 22;
    const radius = size / 2;
    const x = radius + rand() * (W - 2 * radius);
    const y = radius + rand() * (H - 2 * radius);
 
    let collides = false;
    for (let j = 0; j < placed.length; j++) {
      const p = placed[j];
      const dx = x - p.x;
      const dy = y - p.y;
      const minDist = (radius + p.r) * MIN_DIST_FACTOR;
      if (dx * dx + dy * dy < minDist * minDist) { collides = true; break; }
    }
    if (collides) continue;
 
    const span = document.createElement('span');
    span.textContent = symbols[Math.floor(rand() * symbols.length)];
    span.style.left = (x - radius) + 'px';
    span.style.top = (y - radius) + 'px';
    span.style.fontSize = size + 'px';
    span.style.opacity = 0.7 + rand() * 0.3;
    const rotate = Math.floor(rand() * 360);
    span.style.transform = `rotate(${rotate}deg)`;
 
    snowBg.appendChild(span);
    placed.push({ x, y, r: radius });
  }
})();
 
// ===== БАЗА СМАЗОК =====
const WAXES = {
  "Фтор-парафин HF (топ)": [0.020, 0.030],
  "Парафин LF": [0.035, 0.045],
  "Парафин LF (холодный)": [0.050, 0.025],
  "Универсальный парафин": [0.050, 0.060],
  "Натуральный воск": [0.060, 0.070],
  "Клистер (мазь)": [0.080, 0.040],
  "Без смазки": [0.150, 0.180]
};
 
const SPORT_TRACKS = {
  "Китцбюэль (Streif, Австрия)": { angle: 27, length: 3312, vTop: 23.6, desc: "Самая сложная трасса Кубка мира. Уклон до 85%." },
  "Венген (Lauberhorn, Швейцария)": { angle: 22, length: 4480, vTop: 22.5, desc: "Самая длинная трасса Кубка мира." },
  "Бормио (Stelvio, Италия)": { angle: 24, length: 3270, vTop: 22.0, desc: "Классика Кубка мира." },
  "Сочи (олимпийская, Россия)": { angle: 20, length: 3495, vTop: 21.0, desc: "Олимпийская трасса 2014 года." },
  "Биатлонный спуск (Кубок IBU)": { angle: 10, length: 1200, vTop: 14.0, desc: "Спуск на биатлонной трассе." },
  "Лыжероллерная (спуск)": { angle: 8, length: 800, vTop: 11.0, desc: "Тренировочный спуск на лыжероллерах." },
  "Свой вариант (ручной ввод)": { angle: 15, length: 1000, vTop: null, desc: "Введите угол и длину самостоятельно." }
};
 
const g = 9.81;
const RHO = 1.225;
 
// ===== ЗАПОЛНЕНИЕ СПИСКОВ =====
const waxSel = document.getElementById('wax');
Object.keys(WAXES).forEach(k => {
  const o = document.createElement('option');
  o.value = k; o.textContent = k;
  waxSel.appendChild(o);
});
 
const sportSel = document.getElementById('sportTrack');
Object.keys(SPORT_TRACKS).forEach(k => {
  const o = document.createElement('option');
  o.value = k; o.textContent = k;
  sportSel.appendChild(o);
});
 
// ===== РЕЖИМЫ =====
let mode = 'leisure';
 
function setMode(m) {
  mode = m;
  document.getElementById('tabLeisure').classList.toggle('active', m === 'leisure');
  document.getElementById('tabSport').classList.toggle('active', m === 'sport');
  document.getElementById('leisureFields').classList.toggle('hidden', m !== 'leisure');
  document.getElementById('sportFields').classList.toggle('hidden', m !== 'sport');
 
  updateTrackInfo();
  calc();
}
 
sportSel.addEventListener('change', () => { updateTrackInfo(); calc(); });
 
function updateTrackInfo() {
  const name = sportSel.value;
  const tr = SPORT_TRACKS[name];
  const isCustom = name === "Свой вариант (ручной ввод)";
 
  document.getElementById('customAngleWrap').classList.toggle('hidden', !isCustom);
  document.getElementById('customLengthWrap').classList.toggle('hidden', !isCustom);
 
  const infoEl = document.getElementById('trackInfo');
  if (!isCustom && tr) {
    infoEl.innerHTML = `
      <b>📌 ${name}</b><br>
      Средний уклон: <b>${tr.angle}°</b> · Длина: <b>${tr.length} м</b>
      ${tr.vTop ? `· Скорость топ-спортсменов: <b>${tr.vTop} м/с (${(tr.vTop*3.6).toFixed(0)} км/ч)</b>` : ''}
      <br><small>${tr.desc}</small>
    `;
  } else {
    infoEl.innerHTML = `⚙️ Ручной режим — задайте угол и длину трассы.`;
  }
}
 
// ===== ФИЗИКА СПУСКА =====
function getCxS(v) {
  if (v < 8) return 0.45;
  if (v < 15) return 0.30;
  return 0.22;
}
 
function simulate(v0, angleDeg, mu, m, tObs) {
  const alpha = angleDeg * Math.PI / 180;
  const Fg = m * g * Math.sin(alpha);
  const Ff = mu * m * g * Math.cos(alpha);
 
  const dt = 0.005;
  let v = v0, s = 0, t = 0;
  const series = [{t: 0, v: v, s: 0}];
  let stopT = null;
  let vPeak = v0;
 
  while (t < tObs) {
    const CxS = getCxS(v);
    const kAir = 0.5 * RHO * CxS;
    const a = (Fg - Ff - kAir * v * v) / m;
    const vNew = v + a * dt;
    if (vNew < 0 && v0 > 0) {
      const dtStop = -v / a;
      s += v * dtStop + 0.5 * a * dtStop * dtStop;
      t += dtStop;
      series.push({t: t, v: 0, s: s});
      stopT = t; v = 0;
      break;
    }
    v = vNew; s += v * dt; t += dt;
    if (v > vPeak) vPeak = v;
    if (Math.abs(t % 0.1) < dt) series.push({t: t, v: v, s: s});
  }
  if (stopT === null) series.push({t: t, v: v, s: s});
  return { distance: s, vEnd: v, vPeak, stopT, series };
}
 
// ===== АНИМАЦИЯ ГРАФИКОВ =====
let chartAnimationId = null;
 
function stopChartAnimation() {
  if (chartAnimationId) {
    cancelAnimationFrame(chartAnimationId);
    chartAnimationId = null;
  }
}
 
function animateChart(duration, drawFn) {
  stopChartAnimation();
  const start = performance.now();
  
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    drawFn(progress);
    if (progress < 1) {
      chartAnimationId = requestAnimationFrame(step);
    } else {
      chartAnimationId = null;
    }
  }
  chartAnimationId = requestAnimationFrame(step);
}
 
// ===== ПРОВЕРКА ТЕМЫ =====
function isDarkTheme() {
  return document.body.classList.contains('dark-theme');
}
 
// ===== ОСНОВНОЙ РАСЧЁТ =====
let lastData = null;
 
function calc() {
  const wax = waxSel.value;
  const temp = document.getElementById('temp').value;
  const m = +document.getElementById('mass').value;
  const mu = WAXES[wax][temp === 'warm' ? 0 : 1];
 
  let angle, v0, tObs, trackLength = null, trackName = null, vTopRef = null;
 
  if (mode === 'leisure') {
    angle = +document.getElementById('track').value;
    v0 = +document.getElementById('speed').value;
    tObs = +document.getElementById('timeObs').value;
  } else {
    const name = sportSel.value;
    const tr = SPORT_TRACKS[name];
    if (name === "Свой вариант (ручной ввод)") {
      angle = +document.getElementById('customAngle').value;
      trackLength = +document.getElementById('customLength').value;
    } else {
      angle = tr.angle;
      trackLength = tr.length;
      vTopRef = tr.vTop;
    }
    trackName = name;
    v0 = +document.getElementById('sportSpeed').value;
    
    // ПРОВЕРКА: если скорость меньше 1, принудительно ставим 1
    if (v0 < 1) {
      v0 = 1;
      document.getElementById('sportSpeed').value = 1;
    }
 
    const timeInput = document.getElementById('sportTimeObs');
    tObs = timeInput ? +timeInput.value : 40;
    
    if (trackLength) {
      const testSim = simulate(v0, angle, mu, m, 1000);
      const actualTime = estimateTimeToDistance(testSim.series, trackLength);
      if (actualTime !== null && actualTime < tObs) {
        tObs = actualTime;
      }
    }
  }
 
  // ПРОВЕРКА для прогулочного режима
  if (mode === 'leisure' && v0 < 1) {
    v0 = 1;
    document.getElementById('speed').value = 1;
  }
 
  const sim = simulate(v0, angle, mu, m, tObs);
 
  const alpha = angle * Math.PI / 180;
  const Fnet = m * g * Math.sin(alpha) - mu * m * g * Math.cos(alpha);
 
  const CxS_top = 0.22;
  const kAir_top = 0.5 * RHO * CxS_top;
  const vMax = Fnet > 0 ? Math.sqrt(Fnet / kAir_top) : null;
 
  let mode_, verdictClass, verdictText;
  if (Fnet > 0.01) { mode_ = 'accel'; verdictClass = 'warn';
    verdictText = "Лыжня «катит» — лыжник разгоняется до предельной скорости."; }
  else if (Fnet < -0.01) { mode_ = 'brake'; verdictClass = 'good';
    verdictText = "Лыжник тормозит и остановится."; }
  else { mode_ = 'bal'; verdictClass = 'good';
    verdictText = "Скатывающая сила ≈ трение. Равномерное движение."; }
 
  const waxVerdict = mu < 0.03 ? "🔥 Отличное скольжение — соревновательный уровень."
                   : mu < 0.05 ? "✅ Хорошее скольжение для тренировки."
                   : mu < 0.09 ? "⚠️ Среднее скольжение."
                   : "❄️ Плохое скольжение.";
 
  const badge = mode_ === 'accel' ? '<span class="badge accel">РАЗГОН</span>'
              : mode_ === 'brake' ? '<span class="badge brake">ТОРМОЖЕНИЕ</span>'
              : '<span class="badge bal">РАВНОВЕСИЕ</span>';
 
  let sportBlock = '';
  if (mode === 'sport' && trackLength) {
    const reachedEnd = sim.distance >= trackLength;
    const timeOnTrack = estimateTimeToDistance(sim.series, trackLength);
    const vAtEnd = estimateVAtDistance(sim.series, trackLength);
 
    sportBlock = `
      <div class="stat"><span>📏 Длина трассы</span><b>${trackLength} м</b></div>
      <div class="stat"><span>⏱ Время прохождения трассы</span>
        <b>${reachedEnd && timeOnTrack ? timeOnTrack.toFixed(2) + ' с' : '> ' + tObs.toFixed(1) + ' с'}</b>
      </div>
      <div class="stat"><span>🚀 Скорость на финише</span>
        <b>${reachedEnd && vAtEnd ? vAtEnd.toFixed(2) + ' м/с (' + (vAtEnd*3.6).toFixed(0) + ' км/ч)' : '—'}</b>
      </div>
      ${vMax ? `<div class="stat"><span>🏁 Теоретическая v_max</span>
        <b>${vMax.toFixed(2)} м/с (${(vMax*3.6).toFixed(0)} км/ч)</b></div>` : ''}
      ${vTopRef ? `<div class="stat"><span>🥇 Реальная скорость топ-спортсменов</span>
        <b>${vTopRef.toFixed(1)} м/с (${(vTopRef*3.6).toFixed(0)} км/ч)</b></div>` : ''}
    `;
  }
 
  document.getElementById('result').innerHTML = `
    <h2>Результат для «${wax}» ${badge} ${mode === 'sport' ? '<span class="badge sport">СПОРТ</span>' : ''}</h2>
    ${trackName ? `<div style="margin-bottom:12px;color:var(--ice-6);font-weight:600;">🏔 ${trackName} (${angle}°)</div>` : ''}
    <div class="stat"><span>Коэффициент трения μ</span><b>${mu.toFixed(3)}</b></div>
    <div class="stat"><span>Сила трения</span><b>${(mu*m*g*Math.cos(alpha)).toFixed(1)} Н</b></div>
    <div class="stat"><span>Скатывающая сила</span><b>${(m*g*Math.sin(alpha)).toFixed(1)} Н</b></div>
    ${vMax ? `<div class="stat"><span>Предельная скорость</span><b>${vMax.toFixed(2)} м/с</b></div>` : ''}
    <div class="stat"><span>Пройденный путь (за ${tObs.toFixed(1)} с)</span>
      <b class="big">${sim.distance.toFixed(1)} м</b>
    </div>
    ${sportBlock}
    <div class="stat"><span>${sim.stopT !== null
      ? `Остановится через ${sim.stopT.toFixed(1)} с.`
      : `За ${tObs.toFixed(1)} с достигнута скорость ${sim.vEnd.toFixed(2)} м/с.`}</span></div>
    <div class="verdict ${verdictClass}">${verdictText}<br><small>${waxVerdict}</small></div>
  `;
  document.getElementById('result').classList.add('show');
 
  lastData = { mu, m, v0, angle, temp, wax, tObs, sim, mode, trackLength };
 
  saveSettings();
  
  // Сбрасываем устаревший результат калькулятора парафина (смазка могла измениться)
  updateWaxCalc();
  
  animateChart(800, drawChartsFrame);
 
  if (typeof resetAnimation === 'function') resetAnimation();
}
 
function drawChartsFrame(progress) {
  if (!lastData) return;
  drawChart1(lastData.sim, progress);
  drawChart2(lastData.sim, progress);
  drawChart3(progress);
}
 
function estimateTimeToDistance(series, distTarget) {
  for (let i = 1; i < series.length; i++) {
    if (series[i].s >= distTarget) {
      const a = series[i-1], b = series[i];
      const k = (distTarget - a.s) / (b.s - a.s || 1);
      return a.t + (b.t - a.t) * k;
    }
  }
  return null;
}
 
function estimateVAtDistance(series, distTarget) {
  for (let i = 1; i < series.length; i++) {
    if (series[i].s >= distTarget) {
      const a = series[i-1], b = series[i];
      const k = (distTarget - a.s) / (b.s - a.s || 1);
      return a.v + (b.v - a.v) * k;
    }
  }
  return null;
}
 
// ===== РИСОВАНИЕ ЛЫЖНИКА =====
function drawSkier(ctx, progress = 0, isJumping = false) {
  const dark = isDarkTheme();
  
  const bodyColor = dark ? '#ffffff' : '#0369a1';
  const bodyDark = dark ? '#e0f2fe' : '#075985';
  const skiColor = dark ? '#ffffff' : '#0ea5e9';
  const skiColorDark= dark ? '#e0f2fe' : '#0284c7';
 
  ctx.strokeStyle = skiColorDark;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-30, -3);
  ctx.lineTo(30, -3);
  ctx.stroke();
 
  ctx.strokeStyle = skiColor;
  ctx.beginPath();
  ctx.moveTo(-30, 3);
  ctx.lineTo(30, 3);
  ctx.stroke();
 
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(0, -22);
  ctx.stroke();
 
  ctx.strokeStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(0, -22);
  ctx.stroke();
 
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, -40);
  ctx.stroke();
 
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(-12, -18);
  ctx.stroke();
 
  ctx.strokeStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(12, -18);
  ctx.stroke();
 
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, -52, 8, 0, Math.PI*2);
  ctx.fill();
}
 
// ===== ГРАФИК 1 =====
function drawChart1(sim, progress = 1) {
  const c = document.getElementById('chart1');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const pad = {l: 60, r: 30, t: 30, b: 50};
  ctx.clearRect(0, 0, W, H);
 
  const dark = isDarkTheme();
  const gridColor = dark ? '#334155' : '#e0f2fe';
  const textColor = '#94a3b8';
 
  const data = sim.series;
  const maxT = Math.max(...data.map(p => p.t)) || 1;
  const maxS = Math.max(...data.map(p => p.s), 1) * 1.15;
 
  ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + (H - pad.t - pad.b) * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = textColor; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText((maxS * (1 - i/5)).toFixed(0) + ' м', pad.l - 8, y + 4);
  }
  for (let i = 0; i <= 6; i++) {
    const x = pad.l + (W - pad.l - pad.r) * i / 6;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
    ctx.fillStyle = textColor; ctx.textAlign = 'center';
    ctx.fillText((maxT * i / 6).toFixed(1) + ' с', x, H - pad.b + 18);
  }
 
  if (lastData.trackLength && lastData.mode === 'sport') {
    const yEnd = pad.t + (H - pad.t - pad.b) * (1 - lastData.trackLength / maxS);
    if (yEnd > pad.t && yEnd < H - pad.b) {
      ctx.strokeStyle = '#dc2626'; ctx.setLineDash([4,4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pad.l, yEnd); ctx.lineTo(W - pad.r, yEnd); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`🏁 финиш ${lastData.trackLength} м`, pad.l + 6, yEnd - 6);
    }
  }
 
  const maxIndex = Math.max(1, Math.floor(data.length * progress));
 
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < maxIndex; i++) {
    const p = data[i];
    const x = pad.l + (W - pad.l - pad.r) * p.t / maxT;
    const y = pad.t + (H - pad.t - pad.b) * (1 - p.s / maxS);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
 
  if (maxIndex > 0) {
    const lastP = data[maxIndex - 1];
    const lastX = pad.l + (W - pad.l - pad.r) * lastP.t / maxT;
    ctx.lineTo(lastX, H - pad.b);
    ctx.lineTo(pad.l, H - pad.b);
    ctx.closePath();
    ctx.fillStyle = dark ? 'rgba(14, 165, 233, 0.15)' : 'rgba(56,189,248,0.15)';
    ctx.fill();
  }
 
  ctx.fillStyle = textColor; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Время, с', W/2, H - 10);
  ctx.save(); ctx.translate(16, H/2); ctx.rotate(-Math.PI/2);
  ctx.fillText('Путь, м', 0, 0); ctx.restore();
 
  ctx.fillStyle = dark ? '#38bdf8' : '#0369a1'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
  if (progress >= 1) {
    ctx.fillText(`Пройдено за ${maxT.toFixed(1)} с: ${data[data.length-1].s.toFixed(1)} м`, pad.l, 20);
  } else {
    ctx.fillText(`Расчёт...`, pad.l, 20);
  }
}
 
// ===== ГРАФИК 2 =====
function drawChart2(sim, progress = 1) {
  const c = document.getElementById('chart2');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const pad = {l: 60, r: 30, t: 30, b: 50};
  ctx.clearRect(0, 0, W, H);
 
  const dark = isDarkTheme();
  const gridColor = dark ? '#334155' : '#e0f2fe';
  const textColor = '#94a3b8';
 
  const data = sim.series;
  const maxT = Math.max(...data.map(p => p.t)) || 1;
  const maxV = Math.max(...data.map(p => p.v), 1) * 1.15;
 
  ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + (H - pad.t - pad.b) * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = textColor; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText((maxV * (1 - i/5)).toFixed(1), pad.l - 8, y + 4);
  }
  for (let i = 0; i <= 6; i++) {
    const x = pad.l + (W - pad.l - pad.r) * i / 6;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
    ctx.fillStyle = textColor; ctx.textAlign = 'center';
    ctx.fillText((maxT * i / 6).toFixed(1) + ' с', x, H - pad.b + 18);
  }
 
  const alpha = lastData.angle * Math.PI / 180;
  const Fnet = lastData.m * g * Math.sin(alpha) - lastData.mu * lastData.m * g * Math.cos(alpha);
  const kAir = 0.5 * RHO * 0.22;
  if (Fnet > 0) {
    const vMax = Math.sqrt(Fnet / kAir);
    if (vMax < maxV) {
      const yV = pad.t + (H - pad.t - pad.b) * (1 - vMax / maxV);
      ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([6,4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pad.l, yV); ctx.lineTo(W - pad.r, yV); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`v_max = ${vMax.toFixed(2)} м/с`, pad.l + 6, yV - 6);
    }
  }
 
  if (lastData.trackLength && lastData.mode === 'sport') {
    const tEnd = estimateTimeToDistance(data, lastData.trackLength);
    if (tEnd && tEnd < maxT) {
      const xEnd = pad.l + (W - pad.l - pad.r) * tEnd / maxT;
      ctx.strokeStyle = '#dc2626'; ctx.setLineDash([4,4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xEnd, pad.t); ctx.lineTo(xEnd, H - pad.b); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🏁 финиш', xEnd, pad.t - 8);
    }
  }
 
  const maxIndex = Math.max(1, Math.floor(data.length * progress));
 
  ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < maxIndex; i++) {
    const p = data[i];
    const x = pad.l + (W - pad.l - pad.r) * p.t / maxT;
    const y = pad.t + (H - pad.t - pad.b) * (1 - p.v / maxV);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
 
  if (maxIndex > 0) {
    const lastP = data[maxIndex - 1];
    const lastX = pad.l + (W - pad.l - pad.r) * lastP.t / maxT;
    ctx.lineTo(lastX, H - pad.b);
    ctx.lineTo(pad.l, H - pad.b);
    ctx.closePath();
    ctx.fillStyle = dark ? 'rgba(2, 132, 199, 0.2)' : 'rgba(2,132,199,0.12)';
    ctx.fill();
  }
 
  ctx.fillStyle = textColor; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Время, с', W/2, H - 10);
ctx.save(); ctx.translate(16, H/2); ctx.rotate(-Math.PI/2);
  ctx.fillText('Скорость, м/с', 0, 0); ctx.restore();
 
  ctx.fillStyle = dark ? '#38bdf8' : '#075985'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
  if (progress >= 1) {
    ctx.fillText(`Конечная скорость: ${data[data.length-1].v.toFixed(2)} м/с`, pad.l, 20);
  } else {
    ctx.fillText(`Расчёт...`, pad.l, 20);
  }
}
 
// ===== ГРАФИК 3 =====
function drawChart3(progress = 1) {
  const c = document.getElementById('chart3');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  
  const pad = {l: 60, r: 30, t: 50, b: 150}; 
  ctx.clearRect(0, 0, W, H);
 
  const dark = isDarkTheme();
  const gridColor = dark ? '#334155' : '#e0f2fe';
  const textColor = '#94a3b8';
 
  const {m, v0, angle, temp, tObs} = lastData;
  const idx = temp === 'warm' ? 0 : 1;
 
  const names = Object.keys(WAXES);
  const results = names.map(name => {
    const mu = WAXES[name][idx];
    const sim = simulate(v0, angle, mu, m, tObs);
    return { name, mu, dist: sim.distance };
  });
 
  const maxD = Math.max(...results.map(r => r.dist)) * 1.15 || 1;
 
  ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + (H - pad.t - pad.b) * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = textColor; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText((maxD * (1 - i/5)).toFixed(0) + ' м', pad.l - 8, y + 4);
  }
 
  const barW = (W - pad.l - pad.r) / results.length * 0.7;
  const step = (W - pad.l - pad.r) / results.length;
 
  results.forEach((r, i) => {
    const x = pad.l + step * i + (step - barW) / 2;
    const h = (H - pad.t - pad.b) * (r.dist / maxD) * progress;
    const y = H - pad.b - h;
 
    const grad = ctx.createLinearGradient(0, y, 0, H - pad.b);
    if (r.mu < 0.03)      { grad.addColorStop(0, '#34d399'); grad.addColorStop(1, '#047857'); }
    else if (r.mu < 0.05) { grad.addColorStop(0, '#38bdf8'); grad.addColorStop(1, '#0369a1'); }
    else if (r.mu < 0.09) { grad.addColorStop(0, '#fbbf24'); grad.addColorStop(1, '#b45309'); }
    else                  { grad.addColorStop(0, '#f87171'); grad.addColorStop(1, '#991b1b'); }
 
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, h, 6);
    ctx.fill();
 
    if (progress > 0.9) {
      ctx.fillStyle = dark ? '#f8fafc' : '#0f172a'; 
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(r.dist.toFixed(0) + ' м', x + barW/2, y - 6);
      
      ctx.fillStyle = textColor; 
      ctx.font = '11px sans-serif';
      ctx.fillText(`μ=${r.mu.toFixed(3)}`, x + barW/2, y - 22);
    }
 
    ctx.save();
    ctx.translate(x + barW/2, H - pad.b + 10);
    ctx.rotate(-Math.PI/4);
    ctx.fillStyle = dark ? '#cbd5e1' : '#475569'; 
    ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(r.name, 0, 0);
    ctx.restore();
  });
 
  if (progress > 0.9) {
    const legendY = H - 25;
    const legendItems = [
      { label: 'Отличное', color: '#34d399' },
      { label: 'Хорошее', color: '#38bdf8' },
      { label: 'Среднее', color: '#fbbf24' },
      { label: 'Плохое', color: '#f87171' }
    ];
 
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
 
    let totalW = 0;
    const gap = 20;
    const boxW = 12;
    const textW = ctx.measureText('Отличное').width;
    legendItems.forEach(item => { totalW += boxW + 4 + textW + gap; });
    totalW -= gap;
 
    let startX = (W - totalW) / 2;
 
    legendItems.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(startX, legendY - 6, boxW, boxW, 3);
      ctx.fill();
 
      ctx.fillStyle = dark ? '#cbd5e1' : '#475569';
      ctx.fillText(item.label, startX + boxW + 4, legendY);
 
      startX += boxW + 4 + textW + gap;
    });
 
    ctx.fillStyle = textColor; 
    ctx.font = 'bold 13px sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillText('Тип смазки', W/2, pad.t - 25);
 
    ctx.save();
    ctx.translate(16, H/2 - 30); ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center';
    ctx.fillText('Путь, м', 0, 0);
    ctx.restore();
 
    ctx.fillStyle = dark ? '#38bdf8' : '#0369a1'; 
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`Сравнение за ${tObs} с при угле ${angle}°`, pad.l, 22);
  }
}
 
// ===== АНИМАЦИЯ =====
let animProgress = 0;
let animFrameId = null;
let animStartTime = 0;
 
function applySpeedCurve(t) {
  if (!lastData) return t;
  const stops = lastData.sim.stopT !== null;
  if (stops) return 1 - Math.pow(1 - t, 2.2);
  return Math.pow(t, 1.4);
}
 
function drawAnimationFrame(rawProgress) {
  drawSlideAnimation(rawProgress);
}
 
function drawSlideAnimation(rawProgress) {
  const c = document.getElementById('chartAnim');
  if (!c || !lastData) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
 
  const dark = isDarkTheme();
  const progress = applySpeedCurve(rawProgress);
 
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  if (dark) {
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.6, '#1e293b');
    bg.addColorStop(1, '#0b1120');
  } else {
    bg.addColorStop(0, '#f0f9ff');
    bg.addColorStop(0.6, '#e0f2fe');
    bg.addColorStop(1, '#f8fafc');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
 
  ctx.fillStyle = dark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(186,230,253,0.6)';
  for (let i = 0; i < 35; i++) {
    const x = (i * 137) % W;
    const y = (i * 71) % H;
    ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();
  }
 
  const angle = lastData.angle;
  const alpha = angle * Math.PI / 180;
  const cx = W / 2;
  const cy = H / 2;
  const trackLength = W - 160;
 
  const visualAlpha = Math.max(-0.45, Math.min(0.45, alpha));
  const dx = trackLength * Math.cos(visualAlpha);
  const dy = trackLength * Math.sin(visualAlpha);
 
  const skierHalfLength = 30;
  const startOffset = skierHalfLength;
  const endOffset = skierHalfLength;
 
  const usableLength = trackLength - startOffset - endOffset;
  const usableDx = usableLength * Math.cos(visualAlpha);
  const usableDy = usableLength * Math.sin(visualAlpha);
 
  const xStartEdge = cx - dx / 2;
  const yStartEdge = cy - dy / 2;
  const xEndEdge = cx + dx / 2;
  const yEndEdge = cy + dy / 2;
 
  const xStart = xStartEdge + startOffset * Math.cos(visualAlpha);
  const yStart = yStartEdge + startOffset * Math.sin(visualAlpha);
  const xEnd = xEndEdge - endOffset * Math.cos(visualAlpha);
  const yEnd = yEndEdge - endOffset * Math.sin(visualAlpha);
 
  ctx.fillStyle = dark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(186,230,253,0.35)';
  ctx.beginPath();
  ctx.moveTo(xStartEdge, yStartEdge);
  ctx.lineTo(xEndEdge, yEndEdge);
  ctx.lineTo(xEndEdge, H);
  ctx.lineTo(xStartEdge, H);
  ctx.closePath();
  ctx.fill();
 
  ctx.strokeStyle = dark ? 'rgba(56, 189, 248, 0.4)' : '#bae6fd';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(xStartEdge, yStartEdge);
  ctx.lineTo(xEndEdge, yEndEdge);
  ctx.stroke();
  ctx.setLineDash([]);
 
  const perpX = -Math.sin(visualAlpha);
  const perpY = Math.cos(visualAlpha);
  const skiOffset = 8;
 
  const xNow = xStart + usableDx * progress;
  const yNow = yStart + usableDy * progress;
 
  ctx.strokeStyle = dark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2,132,199,0.5)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
 
  ctx.beginPath();
  ctx.moveTo(xStart + perpX * skiOffset, yStart + perpY * skiOffset);
  ctx.lineTo(xNow + perpX * skiOffset, yNow + perpY * skiOffset);
  ctx.stroke();
 
  ctx.beginPath();
  ctx.moveTo(xStart - perpX * skiOffset, yStart - perpY * skiOffset);
  ctx.lineTo(xNow - perpX * skiOffset, yNow - perpY * skiOffset);
  ctx.stroke();
 
  ctx.save();
  ctx.translate(xNow, yNow);
  ctx.rotate(visualAlpha);
  drawSkier(ctx, progress, false);
  ctx.restore();
 
  ctx.save();
  ctx.translate(xEndEdge, yEndEdge);
  ctx.rotate(visualAlpha);
  ctx.strokeStyle = dark ? '#38bdf8' : '#0284c7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -30);
  ctx.stroke();
  ctx.fillStyle = dark ? '#38bdf8' : '#0284c7';
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(16, -26);
  ctx.lineTo(0, -22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
 
  ctx.fillStyle = dark ? '#e0f2fe' : '#075985';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  let angleText;
  if (angle > 0)      angleText = `⬇ Спуск ${angle}°`;
  else if (angle < 0) angleText = `⬆ Подъём ${Math.abs(angle)}°`;
  else                angleText = `→ Ровная ${angle}°`;
  ctx.fillText(angleText, W - 140, 30);
 
  const pbY = H - 22;
  const pbW = W - 140;
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.roundRect(70, pbY, pbW, 8, 4);
  ctx.fill();
  ctx.fillStyle = dark ? '#38bdf8' : '#0ea5e9';
  ctx.beginPath();
  ctx.roundRect(70, pbY, Math.max(0, pbW * progress), 8, 4);
  ctx.fill();
 
  ctx.fillStyle = dark ? '#cbd5e1' : '#075985';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Старт', 55, pbY - 6);
  ctx.textAlign = 'right';
  ctx.fillText('Финиш', W - 55, pbY - 6);
 
  const tCur = progress * (lastData.sim.stopT || lastData.tObs);
  const vCur = interpolateV(lastData.sim.series, tCur);
  const sCur = lastData.sim.distance * progress;
 
  document.getElementById('animTime').textContent = tCur.toFixed(1);
  document.getElementById('animDist').textContent = sCur.toFixed(1);
  document.getElementById('animSpeed').textContent = vCur.toFixed(2);
}
 
function interpolateV(series, t) {
  if (t <= 0) return series[0].v;
  for (let i = 1; i < series.length; i++) {
    if (series[i].t >= t) {
      const a = series[i-1], b = series[i];
      const k = (t - a.t) / (b.t - a.t || 1);
      return a.v + (b.v - a.v) * k;
    }
  }
  return series[series.length-1].v;
}
 
function startAnimation() {
  if (!lastData) calc();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animProgress = 0;
  animStartTime = performance.now();
  const btn = document.getElementById('btnPlay');
  btn.disabled = true;
  btn.textContent = '⏵ Идёт...';
 
  const duration = 4500;
 
  function step(now) {
    const p = Math.min((now - animStartTime) / duration, 1);
    animProgress = p;
    drawAnimationFrame(p);
    if (p < 1) {
      animFrameId = requestAnimationFrame(step);
    } else {
      animFrameId = null;
      btn.disabled = false;
      btn.textContent = '▶ Запустить заново';
    }
  }
  animFrameId = requestAnimationFrame(step);
}
 
function resetAnimation() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  animProgress = 0;
  drawAnimationFrame(0);
  const btn = document.getElementById('btnPlay');
  if (btn) {
    btn.disabled = false;
    btn.textContent = '▶ Запустить';
  }
}
 
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (h < r) r = h;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, 0);
    this.arcTo(x, y + h, x, y, 0);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}
 
// ===== СОХРАНЕНИЕ НАСТРОЕК =====
function saveSettings() {
  const settings = {
    mode: mode,
    wax: document.getElementById('wax').value,
    temp: document.getElementById('temp').value,
    mass: document.getElementById('mass').value,
    track: document.getElementById('track').value,
    speed: document.getElementById('speed').value,
    timeObs: document.getElementById('timeObs').value,
    sportTrack: document.getElementById('sportTrack').value,
    sportSpeed: document.getElementById('sportSpeed').value,
    sportTimeObs: document.getElementById('sportTimeObs')?.value || 40,
    customAngle: document.getElementById('customAngle').value,
    customLength: document.getElementById('customLength').value
  };
  localStorage.setItem('skiwax_settings', JSON.stringify(settings));
}
 
// ===== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ =====
function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.toggle('dark-theme');
  document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  if (lastData) {
    drawChart1(lastData.sim, 1);
    drawChart2(lastData.sim, 1);
    drawChart3(1);
    resetAnimation();
  }
}
 
// ===== ЗАГРУЗКА ТЕМЫ =====
(function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    document.getElementById('themeToggle').textContent = '☀️';
  }
})();
 
// ===== TOOLTIP НА ГРАФИКАХ =====
(function initChartTooltips() {
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  document.body.appendChild(tooltip);
 
  function attachTooltip(canvasId, getValueFn, unit) {
    const c = document.getElementById(canvasId);
    if (!c) return;
 
    c.addEventListener('mousemove', (e) => {
      if (!lastData) return;
      
      const rect = c.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      const W = c.width;
      const scaleX = W / rect.width;
      const x = mouseX * scaleX;
      const pad = {l: 60, r: 30, t: 30, b: 50};
      
      const data = lastData.sim.series;
      const maxT = Math.max(...data.map(p => p.t)) || 1;
      
      const tVal = ((x - pad.l) / (W - pad.l - pad.r)) * maxT;
      if (tVal < 0 || tVal > maxT) { tooltip.classList.remove('show'); return; }
      
      const closest = data.reduce((prev, curr) => 
        Math.abs(curr.t - tVal) < Math.abs(prev.t - tVal) ? curr : prev
      );
      
      tooltip.innerHTML = `<b>${closest.t.toFixed(2)} с</b> · ${getValueFn(closest).toFixed(1)} ${unit}`;
      tooltip.style.left = (e.clientX) + 'px';
      tooltip.style.top = (e.clientY - 15) + 'px';
      tooltip.classList.add('show');
    });
 
    c.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });
  }
 
  attachTooltip('chart1', p => p.s, 'м');
  attachTooltip('chart2', p => p.v, 'м/с');
})();
 
// ===== ЗАГРУЗКА НАСТРОЕК =====
(function loadSettings() {
  const saved = localStorage.getItem('skiwax_settings');
  if (!saved) return;
  try {
    const s = JSON.parse(saved);
    if (s.mode) mode = s.mode;
    if (s.wax) document.getElementById('wax').value = s.wax;
    if (s.temp) document.getElementById('temp').value = s.temp;
    if (s.mass) document.getElementById('mass').value = s.mass;
    if (s.track) document.getElementById('track').value = s.track;
    if (s.speed) document.getElementById('speed').value = s.speed;
    if (s.timeObs) document.getElementById('timeObs').value = s.timeObs;
    if (s.sportTrack) document.getElementById('sportTrack').value = s.sportTrack;
    if (s.sportSpeed) document.getElementById('sportSpeed').value = s.sportSpeed;
    if (s.sportTimeObs && document.getElementById('sportTimeObs')) {
      document.getElementById('sportTimeObs').value = s.sportTimeObs;
    }
    if (s.customAngle) document.getElementById('customAngle').value = s.customAngle;
    if (s.customLength) document.getElementById('customLength').value = s.customLength;
    
    if (mode === 'sport') {
      document.getElementById('tabLeisure').classList.remove('active');
      document.getElementById('tabSport').classList.add('active');
      document.getElementById('leisureFields').classList.add('hidden');
      document.getElementById('sportFields').classList.remove('hidden');
    }
  } catch(e) {}
})();
 
// ===== АНИМАЦИЯ ПОЯВЛЕНИЯ СЕКЦИЙ =====
(function initReveal() {
  const revealTargets = document.querySelectorAll('.chart-wrap, .formulas, .result, h2.section');
  revealTargets.forEach(el => el.classList.add('reveal'));
 
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
 
  revealTargets.forEach(el => observer.observe(el));
})();
 
// ===== МОДАЛЬНОЕ ОКНО "О ПРОЕКТЕ" =====
function openAbout() {
  document.getElementById('aboutModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}
 
function closeAbout() {
  document.getElementById('aboutModal').classList.remove('show');
  document.body.style.overflow = '';
}
 
document.getElementById('aboutModal').addEventListener('click', (e) => {
  if (e.target.id === 'aboutModal') {
    closeAbout();
  }
});
 
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAbout();
  }
});
 
// ===== КАЛЬКУЛЯТОР ПАРАФИНА =====
// Сбрасывает (скрывает) результат при изменении полей или смазки,
// чтобы пользователь заново нажал кнопку «Рассчитать парафин».
function updateWaxCalc() {
  const resultEl = document.getElementById('waxCalcResult');
  if (resultEl) {
    resultEl.classList.remove('show');
    resultEl.innerHTML = '';
  }
}
 
// Основная функция расчёта (вызывается только по кнопке)
function calcWax() {
  doWaxCalc(true);
}
 
function doWaxCalc(saveToStorage) {
  const lengthCm = +document.getElementById('skiLength').value;
  const intensity = document.getElementById('waxIntensity').value;
  const resultEl = document.getElementById('waxCalcResult');
  
  // Получаем выбранную смазку
  const currentWax = document.getElementById('wax').value;
  const currentTemp = document.getElementById('temp').value;
  const tempText = currentTemp === 'warm' ? 'тёплый снег' : 'холодный снег';
 
  // Валидация длины
  if (!lengthCm || lengthCm < 100 || lengthCm > 220) {
    resultEl.innerHTML = `<h4>⚠️ Некорректная длина лыж</h4><p>Пожалуйста, введите длину от 100 до 220 см.</p>`;
    resultEl.classList.add('show');
    return;
  }
 
  // Площадь лыж
  const width = lengthCm < 150 ? 3.8 : 4.8;
  const areaCm2 = lengthCm * width;
 
  // Базовый расход (г/см²) в зависимости от типа смазки
  let baseGramsPerCm2 = 0.004; // стоковое значение
 
  // Корректировка в зависимости от смазки
  if (currentWax.includes("Фтор")) {
    baseGramsPerCm2 = 0.002; // Топовые фтор-парафины более концентрированные
  } else if (currentWax.includes("Клистер") || currentWax.includes("Без смазки")) {
    baseGramsPerCm2 = 0.006; // Мази и обычный парафин требуют больше
  } else if (currentWax.includes("воск")) {
    baseGramsPerCm2 = 0.003; // Натуральный воск — экономный
  }
 
  let gramsPerLayer = areaCm2 * baseGramsPerCm2;
  
  // Коэффициенты по интенсивности
  let layers = 1;
  let extraPowder = 0;
  let intensityLabel = '';
 
  if (intensity === 'training') {
    layers = 1;
    intensityLabel = 'Тренировка';
  } else if (intensity === 'race') {
    layers = 2.5;
    intensityLabel = 'Соревнование';
  } else {
    layers = 4;
    extraPowder = 3;
    intensityLabel = 'Профи';
  }
 
  const baseGrams = gramsPerLayer * layers;
  const totalGrams = baseGrams + extraPowder;
  const roundedGrams = Math.round(totalGrams * 2) / 2;
 
  // Вывод
  resultEl.innerHTML = `
    <h4>🕯️ Рекомендуемый расход парафина</h4>
    <div class="wax-grams">${roundedGrams} г</div>
    <div style="font-size:14px;margin:6px 0;">
      на <b>${intensityLabel.toLowerCase()}</b> · длина лыж: <b>${lengthCm} см</b> · ${tempText}
    </div>
    <div style="font-size:13px;color:var(--text-soft);margin-top:4px;">
      Тип смазки: <b>${currentWax}</b><br>
      ${extraPowder > 0 ? `Включает <b>${extraPowder} г</b> финишного порошка.` : 'Порошок не учитывается (только парафин).'}
    </div>
    <small>Расчёт ориентировочный: 1 слой ≈ ${Math.round(gramsPerLayer * 10) / 10} г на лыжу.</small>
  `;
  resultEl.classList.add('show');
 
  if (saveToStorage) {
    saveWaxSettings();
  }
}
 
function saveWaxSettings() {
  const settings = {
    skiLength: document.getElementById('skiLength').value,
    waxIntensity: document.getElementById('waxIntensity').value
  };
  localStorage.setItem('skiwax_calc', JSON.stringify(settings));
}
 
(function loadWaxSettings() {
  const saved = localStorage.getItem('skiwax_calc');
  if (!saved) return;
  try {
    const s = JSON.parse(saved);
    if (s.skiLength) document.getElementById('skiLength').value = s.skiLength;
    if (s.waxIntensity) document.getElementById('waxIntensity').value = s.waxIntensity;
  } catch(e) {}
})();
 
// ===== КНОПКА НАВЕРХ =====
const scrollTopBtn = document.getElementById('scrollTopBtn');
 
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
 
window.addEventListener('scroll', () => {
  if (window.scrollY > 400) {
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
});
 
// ===== СЛУШАТЕЛИ ДЛЯ СБРОСА КАЛЬКУЛЯТОРА ПАРАФИНА =====
document.getElementById('wax').addEventListener('change', updateWaxCalc);
document.getElementById('temp').addEventListener('change', updateWaxCalc);
 
// ===== СТАРТ =====
updateTrackInfo();
calc();
// Результат парафина показывается только после нажатия кнопки «Рассчитать парафин»