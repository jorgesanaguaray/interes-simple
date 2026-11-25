(function (root, factory) {
  'use strict';
  const simple = typeof module === 'object' && module.exports ? require('./finance.js') : root.SimpleFinance;
  const api = factory(simple);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EconomicMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (SimpleFinance) {
  'use strict';

  const MAX_INPUT = 1e12;
  const MAX_OUTPUT = 1e30;
  const periodLabels = { annual: ['anual', 'años'], monthly: ['mensual', 'meses'], quarterly: ['trimestral', 'trimestres'] };
  const timeLabels = { years: 'años', months: 'meses', days: 'días' };
  const nf = new Intl.NumberFormat('es-EC', { maximumSignificantDigits: 11 });
  const fmt = x => Math.abs(x) > 0 && Math.abs(x) < 1e-7 ? x.toExponential(7).replace('.', ',') : nf.format(Object.is(x, -0) ? 0 : x);
  const usd = x => '$' + new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Object.is(x, -0) ? 0 : x);
  const result = (label, value, format = 'money') => ({ label, value, format });
  const step = (title, formula, explanation) => ({ title, formula, ...(explanation ? { explanation } : {}) });

  function numeric(value, label, options = {}) {
    if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && value.trim() === '') || !Number.isFinite(Number(value))) {
      throw new Error('Completa ' + label + ' con un número válido.');
    }
    const n = Number(value);
    const min = options.min === undefined ? 0 : options.min;
    const max = options.max === undefined ? MAX_INPUT : options.max;
    if (options.exclusiveMin ? n <= min : n < min) {
      throw new Error(label + ' debe ser ' + (options.exclusiveMin ? 'mayor que ' : 'mayor o igual a ') + fmt(min) + '.');
    }
    if (n > max) throw new Error(label + ' no puede superar ' + fmt(max) + '.');
    if (options.integer && !Number.isInteger(n)) throw new Error(label + ' debe ser un número entero.');
    return n;
  }
  function choose(value, choices, label) {
    if (!choices.includes(value)) throw new Error('Selecciona ' + label + '.');
    return value;
  }
  function percent(value, label = 'la tasa', allowNegative = false) {
    return numeric(value, label, allowNegative ? { min: -100, exclusiveMin: true } : {}) / 100;
  }
  function periods(value, label = 'el número de periodos', min = 1, integer = true) {
    return numeric(value, label, { min, max: 360, integer });
  }
  function finite(value) {
    if (!Number.isFinite(value) || Math.abs(value) > MAX_OUTPUT) throw new Error('El resultado excede el rango de cálculo. Reduce los importes, la tasa o el plazo.');
    return value;
  }
  function sum(values) {
    // Compensated summation keeps cancellation and long schedules stable.
    let total = 0, correction = 0;
    for (const value of values) {
      finite(value);
      const y = value - correction;
      const next = total + y;
      correction = (next - total) - y;
      total = next;
    }
    return finite(total);
  }
  function power(i, n) {
    const value = Math.exp(n * Math.log1p(i));
    if (!(value > 0) || !Number.isFinite(value) || value > MAX_OUTPUT) throw new Error('La combinación de tasa y plazo excede el rango de cálculo.');
    return value;
  }
  function validateOutput(output) {
    output.results.forEach(item => finite(item.value));
    if (output.cashflows) output.cashflows.forEach(flow => { finite(flow.amount); finite(flow.time); });
    return output;
  }
  function yearTime(input) {
    const unit = choose(input.timeUnit, ['years', 'months', 'days'], 'la unidad del plazo');
    const time = numeric(input.time, 'el plazo');
    const basis = numeric(input.basis, 'la base anual');
    if (basis !== 360 && basis !== 365) throw new Error('La base anual debe ser 360 o 365 días.');
    const years = unit === 'years' ? time : unit === 'months' ? time / 12 : time / basis;
    const conversion = unit === 'years' ? 'n = ' + fmt(time) + ' años' : 'n = ' + fmt(time) + ' / ' + (unit === 'months' ? '12' : fmt(basis)) + ' = ' + fmt(years) + ' años';
    return { years, conversion, basis, unit, time };
  }
  function signedFlows(input) {
    if (!Array.isArray(input) || input.length < 1 || input.length > 24) throw new Error('Ingresa entre 1 y 24 flujos conocidos.');
    return input.map((flow, index) => {
      if (!flow || typeof flow !== 'object') throw new Error('Revisa los datos del flujo ' + (index + 1) + '.');
      return {
        time: numeric(flow.time, 'el periodo del flujo ' + (index + 1), { max: 360 }),
        amount: numeric(flow.amount, 'el importe del flujo ' + (index + 1), { min: -MAX_INPUT }),
        label: 'Flujo ' + (index + 1)
      };
    });
  }
  function transferFactor(model, i, from, to) {
    const delta = to - from;
    return model === 'simple' ? (delta >= 0 ? 1 + i * delta : 1 / (1 + i * -delta)) : power(i, delta);
  }
  function transferText(model, i, from, to) {
    const delta = to - from;
    if (model === 'compound') return '(1 + ' + fmt(i) + ')^(' + fmt(to) + ' − ' + fmt(from) + ')';
    return delta >= 0 ? '(1 + ' + fmt(i) + ' × ' + fmt(delta) + ')' : '[1 / (1 + ' + fmt(i) + ' × ' + fmt(-delta) + ')]';
  }

  function simple(input) {
    const operation = choose(input.operation, ['interest', 'capital', 'rate', 'time', 'present'], 'la incógnita');
    if (!SimpleFinance || typeof SimpleFinance.calculate !== 'function') throw new Error('No se pudo cargar el módulo de interés simple.');
    const needed = operation === 'interest' ? ['capital', 'rate', 'time'] : operation === 'capital' ? ['interest', 'rate', 'time'] : operation === 'rate' ? ['capital', 'interest', 'time'] : operation === 'time' ? ['capital', 'interest', 'rate'] : ['amount', 'rate', 'time'];
    needed.forEach(key => numeric(input[key], ({ capital: 'el capital', rate: 'la tasa', time: 'el plazo', interest: 'el interés', amount: 'el monto' })[key]));
    choose(input.ratePeriod, Object.keys(periodLabels), 'el periodo de la tasa');
    choose(input.timeUnit, Object.keys(timeLabels), 'la unidad del plazo');
    const r = SimpleFinance.calculate({ ...input, mode: operation });
    const [period, unit] = periodLabels[r.ratePeriod];
    const n = fmt(r.periods), i = fmt(r.rate), c = fmt(r.capital), interest = fmt(r.interest);
    const steps = [];
    if (operation !== 'time') {
      const time = numeric(input.time, 'el plazo');
      const years = input.timeUnit === 'years' ? time : input.timeUnit === 'months' ? time / 12 : time / r.basis;
      const factor = input.ratePeriod === 'annual' ? 1 : input.ratePeriod === 'monthly' ? 12 : 4;
      steps.push(step('Alinear tasa y plazo', 'n = ' + fmt(years) + ' años × ' + factor + ' = ' + n + ' ' + unit, input.timeUnit === 'days' ? 'Se utiliza la base anual de ' + r.basis + ' días.' : 'La tasa y el plazo se expresan en la misma unidad.'));
    }
    if (operation !== 'rate') steps.push(step('Convertir el porcentaje', 'i = ' + fmt(Number(input.rate)) + ' / 100 = ' + i + ' ' + period));
    if (operation === 'interest') steps.push(step('Calcular el interés', 'I = C × i × n = ' + c + ' × ' + i + ' × ' + n + ' = ' + usd(r.interest)));
    if (operation === 'capital') steps.push(step('Despejar el capital', 'C = I / (i × n) = ' + interest + ' / (' + i + ' × ' + n + ') = ' + usd(r.capital)));
    if (operation === 'rate') steps.push(step('Despejar la tasa', 'i = I / (C × n) = ' + interest + ' / (' + c + ' × ' + n + ') = ' + i + ' = ' + fmt(r.rate * 100) + '% ' + period));
    if (operation === 'time') steps.push(step('Despejar el plazo', 'n = I / (C × i) = ' + interest + ' / (' + c + ' × ' + i + ') = ' + n + ' ' + unit), step('Expresar el plazo solicitado', fmt(r.time) + ' ' + timeLabels[r.timeUnit]));
    if (operation === 'present') steps.push(step('Descontar racionalmente el monto', 'C = M / (1 + i × n) = ' + fmt(r.amount) + ' / (1 + ' + i + ' × ' + n + ') = ' + usd(r.capital)));
    steps.push(step('Comprobar el monto', 'M = C + I = ' + c + ' + ' + interest + ' = ' + usd(r.amount)));
    const primary = operation === 'rate' ? result('Tasa ' + period, r.rate, 'percent') : operation === 'time' ? result('Plazo en ' + timeLabels[r.timeUnit], r.time, 'periods') : operation === 'interest' ? result('Interés generado', r.interest) : result(operation === 'present' ? 'Valor presente' : 'Capital inicial', r.capital);
    return { results: [primary, result('Monto final', r.amount), result(operation === 'interest' ? 'Capital inicial' : 'Interés generado', operation === 'interest' ? r.capital : r.interest)], steps,
      notes: ['El interés se calcula sobre el capital inicial; no se capitaliza.', 'Los importes se redondean solo al mostrar la respuesta.'],
      cashflows: [{ time: 0, amount: -r.capital, label: 'Capital inicial' }, { time: r.periods, amount: r.amount, label: 'Monto' }], focal: r.periods, unit };
  }

  function discount(input) {
    const method = choose(input.method, ['commercial', 'rational'], 'el tipo de descuento');
    const face = numeric(input.face, 'el valor nominal');
    const i = percent(input.rate);
    const time = yearTime(input);
    const factor = method === 'commercial' ? 1 - i * time.years : 1 + i * time.years;
    if (method === 'commercial' && factor <= 0) throw new Error('En el descuento comercial debe cumplirse d × n < 1 para recibir un valor actual positivo.');
    const present = method === 'commercial' ? face * factor : face / factor;
    const disc = face - present;
    return { results: [result('Valor actual recibido', present), result('Descuento', disc), result('Valor nominal', face)],
      steps: [step('Expresar el plazo en años', time.conversion), step('Convertir la tasa anual', (method === 'commercial' ? 'd' : 'i') + ' = ' + fmt(Number(input.rate)) + ' / 100 = ' + fmt(i)),
        step(method === 'commercial' ? 'Calcular el descuento comercial' : 'Calcular el valor actual racional', method === 'commercial' ? 'D = F × d × n = ' + fmt(face) + ' × ' + fmt(i) + ' × ' + fmt(time.years) + ' = ' + usd(disc) : 'P = F / (1 + i × n) = ' + fmt(face) + ' / ' + fmt(factor) + ' = ' + usd(present)),
        step('Comprobar valor nominal', 'F = P + D = ' + fmt(present) + ' + ' + fmt(disc) + ' = ' + usd(face))],
      notes: [method === 'commercial' ? 'El descuento comercial usa el valor nominal como base: D = Fdn.' : 'El descuento racional usa interés simple sobre el valor actual: P = F/(1+in).', 'Las tasas de descuento d y de interés i tienen bases distintas y no se sustituyen entre sí.'],
      cashflows: [{ time: 0, amount: present, label: 'Valor actual' }, { time: time.years, amount: -face, label: 'Valor nominal' }], focal: 0, unit: 'años' };
  }

  function flowModel(input, model, equation) {
    const i = percent(input.rate, 'la tasa por periodo', model === 'compound');
    const focal = numeric(input.focal, 'la fecha focal', { max: 360 });
    const flows = signedFlows(input.flows);
    const terms = flows.map(flow => flow.amount * transferFactor(model, i, flow.time, focal));
    const equivalent = sum(terms);
    const steps = [step('Fijar la fecha focal y la tasa', 'Fecha focal = ' + fmt(focal) + '; i = ' + fmt(Number(input.rate)) + ' / 100 = ' + fmt(i), 'Los periodos de los flujos y de la tasa deben coincidir.')];
    flows.forEach((flow, index) => steps.push(step('Trasladar el flujo ' + (index + 1), 'V' + (index + 1) + ' = ' + fmt(flow.amount) + ' × ' + transferText(model, i, flow.time, focal) + ' = ' + usd(terms[index]), 'Flujo original en t = ' + fmt(flow.time) + '.')));
    steps.push(step('Sumar en la misma fecha', 'Σ Vconocidos = ' + terms.map(fmt).join(' + ') + ' = ' + usd(equivalent)));
    const notes = ['Convención de signos: ingresos positivos y egresos negativos. El resultado conserva el signo del flujo neto.'];
    if (model === 'simple') notes.push('Convención simple: los flujos anteriores a la fecha focal se acumulan con 1+iΔt y los posteriores se descuentan dividiendo por 1+iΔt. La ecuación se define en la fecha focal elegida; cambiarla puede cambiar la equivalencia simple.');
    else notes.push('Con capitalización compuesta, trasladar todos los flujos a otra fecha focal mantiene la misma solución de la ecuación de valor.');
    if (!equation) return { results: [result('Valor equivalente neto', equivalent), result('Fecha focal', focal, 'periods')], steps, notes, cashflows: flows, focal, unit: 'periodos' };
    const unknownTime = numeric(input.unknownTime, 'el periodo del flujo desconocido', { max: 360 });
    const factor = transferFactor(model, i, unknownTime, focal);
    if (!(factor > 0)) throw new Error('El factor del flujo desconocido debe ser positivo.');
    const unknown = finite(-equivalent / factor);
    const rawBalance = sum([...terms, unknown * factor]);
    const balance = Math.abs(rawBalance) <= Math.max(1, Math.abs(equivalent)) * 1e-12 ? 0 : rawBalance;
    steps.push(step('Plantear la ecuación de valor', fmt(equivalent) + ' + X × ' + transferText(model, i, unknownTime, focal) + ' = 0'));
    steps.push(step('Despejar el flujo desconocido', 'X = −(' + fmt(equivalent) + ') / ' + fmt(factor) + ' = ' + usd(unknown), 'X positivo es un ingreso; X negativo representa un egreso en t = ' + fmt(unknownTime) + '.'));
    steps.push(step('Verificar el equilibrio', 'Σ valores equivalentes ≈ ' + usd(balance), 'La comprobación usa los valores sin redondear.'));
    return { results: [result('Flujo desconocido X', unknown), result('Saldo en la fecha focal', balance)], steps, notes,
      cashflows: [...flows, { time: unknownTime, amount: unknown, label: 'X' }], focal, unit: 'periodos' };
  }

  function compound(input) {
    const operation = choose(input.operation, ['amount', 'present', 'rate', 'time'], 'la incógnita');
    let capital, amount, i, n;
    if (operation !== 'present') capital = numeric(input.capital, 'el capital', { min: 0, exclusiveMin: operation === 'rate' || operation === 'time' });
    if (operation !== 'amount') amount = numeric(input.amount, 'el monto', { min: 0, exclusiveMin: operation === 'rate' || operation === 'time' });
    if (operation !== 'rate') i = percent(input.rate, 'la tasa periódica', true);
    if (operation !== 'time') n = periods(input.periods, 'el número de periodos', operation === 'rate' ? Number.MIN_VALUE : 0, false);
    const steps = [];
    if (operation === 'amount') {
      amount = finite(capital * power(i, n));
      steps.push(step('Acumular el capital', 'F = C(1+i)^n = ' + fmt(capital) + ' × (1 + ' + fmt(i) + ')^' + fmt(n) + ' = ' + usd(amount)));
    }
    if (operation === 'present') {
      capital = finite(amount / power(i, n));
      steps.push(step('Traer el monto al presente', 'C = F/(1+i)^n = ' + fmt(amount) + ' / (1 + ' + fmt(i) + ')^' + fmt(n) + ' = ' + usd(capital)));
    }
    if (operation === 'rate') {
      i = Math.expm1(Math.log(amount / capital) / n);
      steps.push(step('Despejar la tasa periódica', 'i = (F/C)^(1/n) − 1 = (' + fmt(amount) + '/' + fmt(capital) + ')^(1/' + fmt(n) + ') − 1 = ' + fmt(i), 'La tasa porcentual es ' + fmt(i * 100) + '% por periodo.'));
    }
    if (operation === 'time') {
      if (i === 0) throw new Error(amount === capital ? 'Con tasa cero y montos iguales, cualquier plazo produce el mismo monto; el plazo no es único.' : 'Con tasa cero el monto no cambia; esos datos no permiten hallar un plazo.');
      n = Math.log(amount / capital) / Math.log1p(i);
      if (n < -1e-12) throw new Error('Los montos y la tasa producen un plazo negativo. Revisa los datos.');
      if (Math.abs(n) < 1e-12) n = 0;
      if (n > 360) throw new Error('El plazo calculado supera 360 periodos.');
      steps.push(step('Despejar el plazo', 'n = ln(F/C) / ln(1+i) = ln(' + fmt(amount) + '/' + fmt(capital) + ') / ln(1 + ' + fmt(i) + ') = ' + fmt(n) + ' periodos'));
    }
    const interest = finite(amount - capital);
    if (operation !== 'rate') steps.unshift(step('Convertir la tasa periódica', 'i = ' + fmt(Number(input.rate)) + ' / 100 = ' + fmt(i)));
    steps.push(step('Distinguir interés y monto', 'I = F − C = ' + fmt(amount) + ' − ' + fmt(capital) + ' = ' + usd(interest)));
    const primary = operation === 'rate' ? result('Tasa por periodo', i, 'percent') : operation === 'time' ? result('Plazo', n, 'periods') : result('Monto final', amount);
    // Keep the public result labels and primary value consistent with the chosen inverse.
    const chosen = operation === 'present' ? result('Capital inicial', capital) : operation === 'amount' ? result('Monto final', amount) : primary;
    return { results: [chosen, result('Interés acumulado', interest), result(operation === 'present' ? 'Monto final' : 'Capital inicial', operation === 'present' ? amount : capital)], steps,
      notes: ['La tasa es efectiva por cada periodo utilizado en n.', 'El régimen compuesto capitaliza los intereses de los periodos anteriores.'],
      cashflows: [{ time: 0, amount: -capital, label: 'Capital inicial' }, { time: n, amount, label: 'Monto final' }], focal: n, unit: 'periodos' };
  }

  function rates(input) {
    const entry = choose(input.entry, ['nominal', 'effective', 'periodic'], 'el tipo de tasa de entrada');
    const rate = numeric(input.rate, 'la tasa de entrada', { min: -MAX_INPUT }) / 100;
    const m = numeric(input.m, 'la frecuencia original m', { min: 1, max: 365, integer: true });
    const q = numeric(input.q, 'la frecuencia de destino q', { min: 1, max: 365, integer: true });
    let periodic, effective;
    const steps = [];
    if (entry === 'nominal') {
      periodic = rate / m;
      if (periodic <= -1) throw new Error('La tasa nominal debe producir una tasa periódica mayor que −100%.');
      effective = Math.expm1(m * Math.log1p(periodic));
      steps.push(step('Obtener la tasa periódica original', 'iₘ = j/m = ' + fmt(rate) + '/' + fmt(m) + ' = ' + fmt(periodic)));
    } else if (entry === 'effective') {
      if (rate <= -1) throw new Error('La tasa efectiva anual debe ser mayor que −100%.');
      effective = rate;
      periodic = Math.expm1(Math.log1p(effective) / m);
      steps.push(step('Obtener la tasa periódica original', 'iₘ = (1+EA)^(1/m) − 1 = (1 + ' + fmt(effective) + ')^(1/' + fmt(m) + ') − 1 = ' + fmt(periodic)));
    } else {
      if (rate <= -1) throw new Error('La tasa periódica debe ser mayor que −100%.');
      periodic = rate;
      effective = Math.expm1(m * Math.log1p(periodic));
      steps.push(step('Identificar la tasa periódica', 'iₘ = ' + fmt(Number(input.rate)) + '/100 = ' + fmt(periodic)));
    }
    finite(effective);
    if (!(effective > -1)) throw new Error('La tasa anual equivalente está fuera de la precisión admitida. Reduce la magnitud de la tasa o la frecuencia.');
    const target = Math.expm1(Math.log1p(effective) / q);
    const nominal = target * q;
    steps.push(step('Calcular la tasa efectiva anual', 'EA = (1+iₘ)^m − 1 = (1 + ' + fmt(periodic) + ')^' + fmt(m) + ' − 1 = ' + fmt(effective)));
    steps.push(step('Encontrar la tasa equivalente de destino', 'iᵩ = (1+EA)^(1/q) − 1 = (1 + ' + fmt(effective) + ')^(1/' + fmt(q) + ') − 1 = ' + fmt(target)));
    steps.push(step('Expresar la tasa nominal anual equivalente', 'jᵩ = q × iᵩ = ' + fmt(q) + ' × ' + fmt(target) + ' = ' + fmt(nominal)));
    return { results: [result('Tasa efectiva anual', effective, 'percent'), result('Tasa periódica original', periodic, 'percent'), result('Tasa periódica de destino', target, 'percent'), result('Nominal anual de destino', nominal, 'percent')], steps,
      notes: ['m = ' + fmt(m) + ' capitalizaciones por año; q = ' + fmt(q) + ' periodos de destino por año.', 'Una tasa nominal anual especifica su frecuencia de capitalización; no es igual a la tasa efectiva anual, salvo frecuencia 1 o tasa cero.', 'Las tasas equivalentes generan el mismo factor de acumulación en un año.'] };
  }

  function annuities(input) {
    const operation = choose(input.operation, ['values', 'payment'], 'la operación de anualidades');
    const timing = choose(input.timing, ['ordinary', 'due'], 'el momento del pago');
    const perpetual = input.perpetuity === true || input.perpetuity === 'true' || input.perpetuity === 1 || input.perpetuity === '1';
    const d = periods(input.deferral, 'el diferimiento', 0);
    const i = percent(input.rate, 'la tasa efectiva por periodo');
    const n = perpetual ? null : periods(input.periods);
    const dueFactor = timing === 'due' ? 1 + i : 1;
    const shiftFactor = power(i, -d);
    if (perpetual && i === 0) throw new Error('Una perpetuidad requiere una tasa por periodo mayor que cero.');
    const basePVFactor = perpetual ? 1 / i : i === 0 ? n : -Math.expm1(-n * Math.log1p(i)) / i;
    const pvFactor = basePVFactor * dueFactor * shiftFactor;
    const payment = operation === 'payment' ? numeric(input.present, 'el valor presente objetivo') / pvFactor : numeric(input.payment, 'el pago periódico');
    finite(payment);
    const present = finite(payment * pvFactor);
    const futureFactor = perpetual ? null : (i === 0 ? n : Math.expm1(n * Math.log1p(i)) / i) * dueFactor;
    const future = perpetual ? null : finite(payment * futureFactor);
    const firstTime = d + (timing === 'ordinary' ? 1 : 0);
    const lastTime = perpetual ? null : firstTime + n - 1;
    const finalTime = perpetual ? null : d + n;
    const pvFormula = perpetual ? 'P = R/i' : i === 0 ? 'P = R × n' : 'P = R × [1 − (1+i)^(−n)]/i';
    const adjustments = (timing === 'due' ? ' × (1+i)' : '') + (d ? ' × (1+i)^(−d)' : '');
    const steps = [step('Fijar la tasa y el calendario', 'i = ' + fmt(Number(input.rate)) + '/100 = ' + fmt(i) + '; d = ' + d + (perpetual ? '; pagos sin término' : '; n = ' + n), 'Primer pago en t = ' + fmt(firstTime) + (perpetual ? '.' : '; último pago en t = ' + fmt(lastTime) + '.')),
      step('Calcular el factor de valor presente', pvFormula + adjustments + '; factor P/R = ' + fmt(pvFactor), timing === 'due' ? 'La anualidad anticipada desplaza cada pago un periodo hacia el presente.' : 'La anualidad vencida paga al final de cada periodo.')];
    if (operation === 'payment') steps.push(step('Despejar el pago periódico', 'R = Pobjetivo / factor P/R = ' + fmt(Number(input.present)) + '/' + fmt(pvFactor) + ' = ' + usd(payment)));
    else steps.push(step('Calcular el valor presente', 'P = ' + fmt(payment) + ' × ' + fmt(pvFactor) + ' = ' + usd(present)));
    const outputs = operation === 'payment' ? [result('Pago periódico R', payment), result('Valor presente en t = 0', present)] : [result('Valor presente en t = 0', present), result('Pago periódico R', payment)];
    if (!perpetual) {
      outputs.push(result('Valor futuro en t = ' + finalTime, future));
      steps.push(step('Calcular el valor futuro', (i === 0 ? 'F = R × n' : 'F = R × [(1+i)^n − 1]/i') + (timing === 'due' ? ' × (1+i)' : '') + ' = ' + usd(future), 'Fecha de valoración: t = d+n = ' + finalTime + '. El diferimiento desplaza todo el calendario.'));
    }
    const count = perpetual ? 12 : n;
    const cashflows = Array.from({ length: count }, (_, k) => ({ time: firstTime + k, amount: payment, label: 'Pago ' + (k + 1) }));
    const notes = ['La tasa efectiva por periodo coincide con el intervalo entre pagos. Si las frecuencias difieren, convierte primero la tasa en el módulo de tasas.', 'd representa periodos completos de desplazamiento: vencida empieza en d+1 y anticipada en d.'];
    if (perpetual) notes.push('La perpetuidad no tiene un valor futuro finito de cierre. El diagrama muestra únicamente los primeros 12 pagos; la serie continúa indefinidamente.');
    else notes.push('El valor presente se calcula en t = 0 y el valor futuro en t = d+n, también cuando los pagos son anticipados.');
    return { results: outputs, steps, notes, cashflows, focal: perpetual ? 0 : finalTime, unit: 'periodos' };
  }

  function gradients(input) {
    const kind = choose(input.kind, ['arithmetic', 'geometric'], 'el tipo de gradiente');
    const first = numeric(input.first, 'el primer pago');
    const n = periods(input.periods);
    const i = percent(input.rate, 'la tasa efectiva por periodo');
    const gradient = kind === 'arithmetic' ? numeric(input.gradient, 'el cambio monetario G', { min: -MAX_INPUT }) : null;
    const growth = kind === 'geometric' ? percent(input.growth, 'la variación geométrica g', true) : null;
    const flows = Array.from({ length: n }, (_, k) => ({ time: k + 1, amount: finite(kind === 'arithmetic' ? first + k * gradient : first * power(growth, k)), label: 'Pago ' + (k + 1) }));
    const pvTerms = flows.map(flow => flow.amount / power(i, flow.time));
    const fvTerms = flows.map(flow => flow.amount * power(i, n - flow.time));
    const present = sum(pvTerms), future = sum(fvTerms), total = sum(flows.map(flow => flow.amount));
    const steps = [step('Definir la sucesión de pagos', kind === 'arithmetic' ? 'Aₖ = A₁ + (k−1)G = ' + fmt(first) + ' + (k−1) × ' + fmt(gradient) : 'Aₖ = A₁(1+g)^(k−1) = ' + fmt(first) + ' × (1 + ' + fmt(growth) + ')^(k−1)', 'El primer pago se ubica en t = 1; el último en t = n = ' + n + '.'),
      step('Identificar el último pago', 'Aₙ = ' + usd(flows[n - 1].amount))];
    if (kind === 'geometric') {
      if (i === growth) steps.push(step('Aplicar el caso especial g = i', 'P = n × A₁/(1+i) = ' + n + ' × ' + fmt(first) + '/(1 + ' + fmt(i) + ') = ' + usd(present), 'Se evita dividir por i−g cuando ambas tasas coinciden.'));
      else steps.push(step('Calcular el valor presente geométrico', 'P = A₁ × [1 − ((1+g)/(1+i))^n]/(i−g) = ' + usd(present), 'La respuesta se comprueba con la suma de cada pago descontado.'));
    } else if (i === 0) {
      steps.push(step('Aplicar el caso de tasa cero', 'P = nA₁ + G × n(n−1)/2 = ' + usd(present), 'Sin interés, los valores presente y futuro coinciden con la suma nominal.'));
    } else {
      steps.push(step('Separar base uniforme y gradiente puro', 'P = A₁ × [1−(1+i)^(−n)]/i + G × {[(1+i)^n−in−1]/[i²(1+i)^n]} = ' + usd(present), 'En el gradiente puro, el incremento G aparece por primera vez en t = 2.'));
    }
    steps.push(step('Comprobar descontando todos los pagos', 'P = Σ[Aₖ/(1+i)^k] = ' + usd(present)));
    steps.push(step('Obtener el valor futuro', 'F = Σ[Aₖ(1+i)^(n−k)] = P(1+i)^n = ' + usd(future), 'La fecha de valoración futura es t = n.'));
    const notes = ['Los pagos ocurren al final de cada periodo; i corresponde a ese mismo intervalo.', 'La tabla y el diagrama representan los pagos reales generados por los datos.'];
    if (kind === 'arithmetic') notes.push(first === 0 ? 'Gradiente aritmético puro: A₁ = 0, A₂ = G, A₃ = 2G; el primer incremento está en t = 2.' : 'La serie combina un pago base A₁ y un incremento monetario constante G.');
    else notes.push('g es la variación porcentual de los pagos; i es la tasa para trasladarlos en el tiempo. Son tasas con funciones distintas.');
    if (flows.some(flow => flow.amount < 0)) notes.push('La serie cambia de signo con estos datos. Los importes negativos se interpretan como egresos, no como pagos positivos.');
    return { results: [result('Valor presente en t = 0', present), result('Valor futuro en t = ' + n, future), result('Último pago', flows[n - 1].amount), result('Suma nominal de pagos', total)], steps, notes, cashflows: flows, focal: 0, unit: 'periodos' };
  }

  function solve(topic, data) {
    if (!data || typeof data !== 'object') throw new Error('Completa los datos de la operación.');
    const operations = {
      simple, discount, timeline: input => flowModel(input, choose(input.model, ['simple', 'compound'], 'el régimen de interés'), false),
      'equation-simple': input => flowModel(input, 'simple', true), compound, rates,
      'equation-compound': input => flowModel(input, 'compound', true), annuities, gradients
    };
    if (!Object.prototype.hasOwnProperty.call(operations, topic)) throw new Error('Selecciona un tema válido.');
    return validateOutput(operations[topic](data));
  }

  return { solve };
});
