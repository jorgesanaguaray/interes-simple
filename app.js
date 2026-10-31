'use strict';
const $ = id => document.getElementById(id);
const number = x => x !== 0 && Math.abs(x) < 1e-7 ? x.toExponential(6).replace('.', ',') : new Intl.NumberFormat('es-EC', { maximumFractionDigits: 8 }).format(x);
const money = x => '$' + new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
const periodLabels = { annual: ['anual', 'años', 'año'], monthly: ['mensual', 'meses', 'mes'], quarterly: ['trimestral', 'trimestres', 'trimestre'] };
const unitLabels = { years: ['años', 'año'], months: ['meses', 'mes'], days: ['días', 'día'] };
const descriptions = {
  interest: 'Conoce cuánto interés genera el capital y cuánto se recibe al vencimiento.',
  capital: 'Encuentra el capital inicial a partir del interés producido, la tasa y el plazo.',
  rate: 'Obtén la tasa del periodo seleccionado a partir del capital, el interés y el plazo.',
  time: 'Encuentra la duración de la inversión y exprésala en la unidad que elijas.',
  present: 'Calcula el capital equivalente hoy de un monto futuro bajo interés simple.'
};
const inputIds = ['mode', 'capital', 'interest', 'amount', 'rate', 'ratePeriod', 'time', 'timeUnit', 'basis'];
const defaults = { mode: 'interest', capital: 1000, interest: 15000, amount: 1500, rate: 12, ratePeriod: 'annual', time: 8, timeUnit: 'months', basis: 360 };
const exercises = [
 { id:1,title:'Un préstamo de ocho meses',subtitle:'Interés y monto · tasa anual',answer:'I = $80,00 · M = $1.080,00',question:'Se presta un capital de $1.000 al 12% anual simple durante 8 meses. ¿Cuánto interés se genera y cuál es el monto al vencimiento?',data:['C = $1.000','i = 12% anual','Plazo = 8 meses'],source:'Semana 2, página 14.',steps:['Convertimos el porcentaje y el plazo.<span class="equation">i = 12/100 = 0,12; n = 8/12 años</span>','Calculamos el interés.<span class="equation">I = 1.000 × 0,12 × (8/12) = $80,00</span>','Sumamos el capital y el interés.<span class="equation">M = 1.000 + 80 = $1.080,00</span>'],final:'Al vencimiento se pagan $1.080,00.',preset:{mode:'interest',capital:1000,rate:12,time:8,timeUnit:'months'} },
 { id:2,title:'Una inversión de cinco meses',subtitle:'Interés y monto · conversión del plazo',answer:'I = $90,00 · M = $2.490,00',question:'Una persona invierte $2.400 al 9% anual simple durante 5 meses. ¿Cuánto gana en intereses y cuál es el monto al vencimiento?',data:['C = $2.400','i = 9% anual','Plazo = 5 meses'],source:'Semana 2, página 15.',steps:['Expresamos los datos en la misma unidad.<span class="equation">i = 0,09; n = 5/12 años</span>','Hallamos la ganancia.<span class="equation">I = 2.400 × 0,09 × (5/12) = $90,00</span>','Calculamos el monto final.<span class="equation">M = 2.400 + 90 = $2.490,00</span>'],final:'La inversión gana $90,00 y acumula $2.490,00.',preset:{mode:'interest',capital:2400,rate:9,time:5,timeUnit:'months'} },
 { id:3,title:'Un plazo en años, meses y días',subtitle:'Interés comercial · base de 360 días',answer:'I = $15.760,00',question:'¿Qué interés produce un capital de $40.000 en 1 año, 7 meses y 21 días al 24% anual simple? Se aplica la convención comercial del ejercicio: año de 360 días y meses de 30 días.',data:['C = $40.000','i = 24% anual','Base = 360 días'],source:'Semana 2, página 18. La conversión 30/360 es la utilizada en el material de clase.',steps:['Convertimos el plazo a días comerciales.<span class="equation">Días = 360 + 7 × 30 + 21 = 591</span>','Expresamos el plazo en años.<span class="equation">n = 591/360 años</span>','Aplicamos la fórmula y sumamos el capital.<span class="equation">I = 40.000 × 0,24 × (591/360) = $15.760,00</span><span class="equation">M = 40.000 + 15.760 = $55.760,00</span>'],final:'El interés es $15.760,00; el monto es $55.760,00.',preset:{mode:'interest',capital:40000,rate:24,time:591,timeUnit:'days',basis:360} },
 { id:4,title:'Encontrar el capital inicial',subtitle:'Capital desde el interés generado',answer:'C = $150.000,00',question:'¿Qué capital, invertido al 12% anual simple, produce $15.000 de interés durante 10 meses?',data:['I = $15.000','i = 12% anual','Plazo = 10 meses'],source:'Semana 2, página 20. Desarrollo a partir de la fórmula de la página 19.',steps:['Convertimos la tasa y el plazo.<span class="equation">i = 0,12; n = 10/12 años</span>','Despejamos el capital.<span class="equation">C = I / (i × n)</span>','Sustituimos y comprobamos.<span class="equation">C = 15.000 / [0,12 × (10/12)] = $150.000,00</span><span class="equation">150.000 × 0,12 × (10/12) = $15.000,00</span>'],final:'Se requiere un capital inicial de $150.000,00.',preset:{mode:'capital',interest:15000,rate:12,time:10,timeUnit:'months'} },
 { id:5,title:'Descubrir la tasa de una inversión',subtitle:'Tasa simple · resultado anual',answer:'i = 15% anual',question:'¿A qué tasa anual simple estuvo invertido un capital de $110.000 que produjo $39.875 de interés durante 2 años y 5 meses?',data:['C = $110.000','I = $39.875','Plazo = 29 meses'],source:'Semana 3, páginas 6 y 7.',steps:['Expresamos el plazo en años.<span class="equation">n = 2 + 5/12 = 29/12 años</span>','Despejamos y sustituimos.<span class="equation">i = I / (C × n)</span><span class="equation">i = 39.875 / [110.000 × (29/12)] = 0,15</span>','Convertimos el resultado a porcentaje.<span class="equation">0,15 × 100 = 15% anual</span>'],final:'La tasa simple es 15% anual.',preset:{mode:'rate',capital:110000,interest:39875,time:29,timeUnit:'months'} },
 { id:6,title:'Calcular el tiempo de inversión',subtitle:'Plazo · resultado en años',answer:'n = 2 años',question:'¿Durante cuánto tiempo estuvo invertido un capital de $85.000 que produjo $35.700 de interés a una tasa simple de 21% anual?',data:['C = $85.000','I = $35.700','i = 21% anual'],source:'Semana 3, páginas 6 y 8.',steps:['Escribimos la tasa en forma decimal.<span class="equation">i = 21/100 = 0,21 anual</span>','Despejamos el plazo y sustituimos.<span class="equation">n = I / (C × i)</span><span class="equation">n = 35.700 / (85.000 × 0,21) = 2 años</span>','Comprobamos el interés producido.<span class="equation">85.000 × 0,21 × 2 = $35.700,00</span>'],final:'El capital estuvo invertido 2 años, equivalentes a 24 meses.',preset:{mode:'time',capital:85000,interest:35700,rate:21,timeUnit:'years'} },
 { id:7,title:'Traer un monto al presente',subtitle:'Valor presente · interés simple',answer:'C = $1.435,41',question:'Encuentra el valor presente de $1.500 que vencen dentro de 9 meses, con una tasa de interés simple de 6% anual.',data:['M = $1.500','i = 6% anual','Plazo = 9 meses'],source:'Semana 3, página 12; fórmula del valor presente en la página 10.',steps:['Convertimos el plazo a años.<span class="equation">i = 0,06; n = 9/12 = 0,75 años</span>','Usamos el monto para despejar el capital.<span class="equation">C = M / (1 + i × n)</span><span class="equation">C = 1.500 / [1 + 0,06 × (9/12)]</span>','Calculamos sin redondear durante el procedimiento.<span class="equation">C = 1.500 / 1,045 ≈ $1.435,41</span>'],final:'El valor presente es $1.435,41, redondeado a centavos.',preset:{mode:'present',amount:1500,rate:6,time:9,timeUnit:'months'} }
];
function setMode() {
  const mode = $('mode').value;
  const groups = { capital: ['interest','rate','time'], interest: ['capital','rate','time'], amount: ['present'], rate: ['interest','capital','time','present'], time: ['interest','capital','rate','present'] };
  for (const [field, modes] of Object.entries(groups)) {
    const hidden = !modes.includes(mode);
    $(field + '-field').hidden = hidden;
    $(field).disabled = hidden;
  }
  $('mode-description').textContent = descriptions[mode];
  $('period-label').textContent = mode === 'rate' ? 'Periodo de la tasa buscada' : 'Periodo de la tasa';
  $('unit-label').textContent = mode === 'time' ? 'Unidad del resultado' : 'Unidad del plazo';
}
function plural(value, names) { return Math.abs(value - 1) < 1e-10 ? names[1] : names[0]; }
function step(title, formula, text = '') { return '<li><b>' + title + '</b><code>' + formula + '</code>' + (text ? '<span class="step-text">' + text + '</span>' : '') + '</li>'; }
function buildSteps(r, input) {
  const p = periodLabels[r.ratePeriod];
  const n = number(r.periods);
  const i = number(r.rate);
  const c = number(r.capital);
  const interest = number(r.interest);
  let html = '';
  if (r.mode !== 'time') {
    let conversion = 'n = ' + number(Number(input.time));
    if (input.timeUnit === 'years') conversion += r.ratePeriod === 'annual' ? ' años' : ' × ' + (r.ratePeriod === 'monthly' ? '12' : '4') + ' = ' + n + ' ' + p[1];
    if (input.timeUnit === 'months') conversion += r.ratePeriod === 'annual' ? '/12 = ' + n + ' años' : r.ratePeriod === 'quarterly' ? '/3 = ' + n + ' trimestres' : ' meses';
    if (input.timeUnit === 'days') conversion += '/' + r.basis + (r.ratePeriod === 'annual' ? '' : ' × ' + (r.ratePeriod === 'monthly' ? '12' : '4')) + ' = ' + n + ' ' + p[1];
    html += step('Alinea el plazo con la tasa', conversion, input.timeUnit === 'days' ? 'Base anual seleccionada: ' + r.basis + ' días.' : 'La tasa y el plazo deben usar el mismo periodo.');
  }
  if (r.mode !== 'rate') html += step('Convierte el porcentaje a decimal', 'i = ' + number(Number(input.rate)) + '/100 = ' + i + ' ' + p[0]);
  if (r.mode === 'interest') {
    html += step('Calcula el interés', 'I = C × i × n = ' + c + ' × ' + i + ' × ' + n + ' = ' + money(r.interest));
    html += step('Suma capital e interés', 'M = C + I = ' + c + ' + ' + interest + ' = ' + money(r.amount));
  }
  if (r.mode === 'capital') html += step('Despeja el capital', 'C = I / (i × n) = ' + interest + ' / (' + i + ' × ' + n + ') = ' + money(r.capital));
  if (r.mode === 'rate') {
    html += step('Despeja la tasa', 'i = I / (C × n) = ' + interest + ' / (' + c + ' × ' + n + ') = ' + i);
    html += step('Expresa la tasa en porcentaje', 'i = ' + i + ' × 100 = ' + number(r.rate * 100) + '% ' + p[0]);
  }
  if (r.mode === 'time') {
    html += step('Despeja el número de periodos', 'n = I / (C × i) = ' + interest + ' / (' + c + ' × ' + i + ') = ' + n + ' ' + plural(r.periods, [p[1],p[2]]));
    html += step('Expresa el plazo en la unidad elegida', 'Plazo = ' + number(r.time) + ' ' + plural(r.time, unitLabels[r.timeUnit]), r.timeUnit === 'days' ? 'Equivalencia con base anual de ' + r.basis + ' días.' : 'Se conserva el mismo tiempo de la operación.');
  }
  if (r.mode === 'present') html += step('Trae el monto al presente', 'C = M / (1 + i × n) = ' + number(r.amount) + ' / (1 + ' + i + ' × ' + n + ') = ' + money(r.capital));
  if (['capital','present'].includes(r.mode)) html += step('Comprueba el monto', 'M = C(1 + i × n) = ' + money(r.amount), 'La comprobación usa el capital con toda su precisión.');
  return html;
}
function update() {
  setMode();
  const input = Object.fromEntries(inputIds.map(id => [id, $(id).value]));
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  for (const id of ['capital','interest','amount','rate','time']) $(id).removeAttribute('aria-invalid');
  try {
    const r = SimpleFinance.calculate(input);
    const unit = plural(r.time, unitLabels[r.timeUnit]);
    const period = periodLabels[r.ratePeriod][0];
    const labels = { interest:'Interés generado', capital:'Capital inicial requerido', rate:'Tasa de interés simple', time:'Plazo de la inversión', present:'Valor presente' };
    const primary = r.mode === 'interest' ? money(r.interest) : ['capital','present'].includes(r.mode) ? money(r.capital) : r.mode === 'rate' ? number(r.rate * 100) + '%' : number(r.time) + ' ' + unit;
    $('result-label').textContent = labels[r.mode];
    $('result-value').textContent = primary;
    $('result-error').hidden = true;
    $('result-explanation').hidden = false;
    $('result-summary').hidden = false;
    $('result-explanation').textContent = r.mode === 'rate' ? 'Tasa ' + period + ' para producir ' + money(r.interest) + ' durante ' + number(r.time) + ' ' + unit + '.' : r.mode === 'time' ? 'Con una tasa ' + period + ' de ' + number(r.rate * 100) + '%, el capital produce ' + money(r.interest) + '.' : r.mode === 'present' ? 'Este capital equivale a ' + money(r.amount) + ' al vencimiento.' : r.mode === 'capital' ? 'Este capital produce ' + money(r.interest) + ' durante ' + number(r.time) + ' ' + unit + '.' : 'El capital genera ' + money(r.interest) + ' en ' + number(r.time) + ' ' + unit + '.';
    const summaries = r.mode === 'interest' ? [['Capital inicial',money(r.capital)],['Monto al vencimiento',money(r.amount)]] : [['Interés generado',money(r.interest)],['Monto al vencimiento',money(r.amount)]];
    $('result-summary').innerHTML = summaries.map(([label,value]) => '<div><span>' + label + '</span><strong>' + value + '</strong></div>').join('');
    $('calculation-steps').innerHTML = buildSteps(r,input);
  } catch (error) {
    $('result-label').textContent = 'Revisa los datos';
    $('result-value').textContent = '—';
    $('result-error').textContent = error.message;
    $('result-error').hidden = false;
    $('result-summary').hidden = true;
    $('result-explanation').hidden = true;
    $('calculation-steps').innerHTML = '<li><b>Completa los datos de la operación</b><span class="step-text">Usa valores no negativos. En los despejes, el divisor debe ser mayor que cero.</span></li>';
    for (const id of ['capital','interest','amount','rate','time']) if (!$(id).disabled && ($(id).value === '' || Number($(id).value) < 0)) { $(id).classList.add('is-invalid'); $(id).setAttribute('aria-invalid','true'); }
  }
}
function applyPreset(preset) { for (const [id,value] of Object.entries({...defaults,...preset})) $(id).value = value; update(); }
$('calculator-form').addEventListener('input', update);
$('calculator-form').addEventListener('change', update);
$('calculator-form').addEventListener('submit', event => { event.preventDefault(); update(); });
$('reset').addEventListener('click', () => applyPreset(defaults));
$('exercise-list').innerHTML = exercises.map((e,index) => '<details class="exercise" id="ejercicio-' + e.id + '"' + (index === 0 ? ' open' : '') + '><summary><span class="exercise-number">' + String(e.id).padStart(2,'0') + '</span><span class="exercise-title"><strong>' + e.title + '</strong><small>' + e.subtitle + '</small></span><span class="exercise-answer">' + e.answer + '</span><span class="exercise-plus" aria-hidden="true">+</span></summary><div class="exercise-body"><div><p class="exercise-question">' + e.question + '</p><ul class="exercise-data">' + e.data.map(d => '<li>'+d+'</li>').join('') + '</ul><p class="exercise-source">Fuente: ' + e.source + '</p><button type="button" class="load-exercise" data-exercise="' + e.id + '">Modificar en la calculadora ↗</button></div><div class="exercise-solution"><ol>' + e.steps.map(s => '<li>'+s+'</li>').join('') + '</ol><p class="exercise-final">' + e.final + '</p></div></div></details>').join('');
$('exercise-list').addEventListener('click', event => {
  const button = event.target.closest('[data-exercise]');
  if (!button) return;
  const exercise = exercises.find(e => e.id === Number(button.dataset.exercise));
  applyPreset(exercise.preset);
  $('calculadora').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  $('mode').focus({preventScroll:true});
});
update();
