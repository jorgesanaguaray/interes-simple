(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SimpleFinance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const periodMonths = { annual: 12, monthly: 1, quarterly: 3 };
  const allowedUnits = ['years', 'months', 'days'];
  function value(x, label, positive) {
    if (x === '' || x === null || x === undefined || !Number.isFinite(Number(x))) throw new Error('Completa ' + label.toLowerCase() + ' con un número válido.');
    const n = Number(x);
    if (n < 0 || (positive && n === 0)) throw new Error(label + (positive ? ' debe ser mayor que cero.' : ' no puede ser negativo.'));
    if (n > 1e15) throw new Error(label + ' supera el rango admitido.');
    return n;
  }
  function calculate(input) {
    const mode = input.mode;
    if (!['interest', 'capital', 'rate', 'time', 'present'].includes(mode)) throw new Error('Selecciona una operación válida.');
    if (!(input.ratePeriod in periodMonths)) throw new Error('Selecciona el periodo de la tasa.');
    if (!allowedUnits.includes(input.timeUnit)) throw new Error('Selecciona la unidad del plazo.');
    const basis = Number(input.basis);
    if (![360, 365].includes(basis)) throw new Error('La base anual debe ser 360 o 365 días.');
    const periodsPerYear = 12 / periodMonths[input.ratePeriod];
    let C, I, M, i, n, duration;
    if (mode !== 'time') {
      duration = value(input.time, 'El plazo', mode === 'capital' || mode === 'rate');
      const years = input.timeUnit === 'years' ? duration : input.timeUnit === 'months' ? duration / 12 : duration / basis;
      n = years * periodsPerYear;
    }
    if (mode !== 'rate') i = value(input.rate, 'La tasa', mode === 'capital' || mode === 'time') / 100;
    if (['interest', 'rate', 'time'].includes(mode)) C = value(input.capital, 'El capital', mode === 'rate' || mode === 'time');
    if (['capital', 'rate', 'time'].includes(mode)) I = value(input.interest, 'El interés', false);
    if (mode === 'interest') { I = C * i * n; M = C + I; }
    if (mode === 'capital') { C = I / (i * n); M = C + I; }
    if (mode === 'rate') { i = I / (C * n); M = C + I; }
    if (mode === 'time') {
      n = I / (C * i);
      const years = n / periodsPerYear;
      duration = input.timeUnit === 'years' ? years : input.timeUnit === 'months' ? years * 12 : years * basis;
      M = C + I;
    }
    if (mode === 'present') { M = value(input.amount, 'El monto futuro', false); C = M / (1 + i * n); I = M - C; }
    const result = { mode, capital: C, interest: I, amount: M, rate: i, periods: n, time: duration, basis, ratePeriod: input.ratePeriod, timeUnit: input.timeUnit };
    for (const key of ['capital', 'interest', 'amount', 'rate', 'periods', 'time']) {
      if (!Number.isFinite(result[key])) throw new Error('El resultado supera el rango de cálculo. Reduce los valores.');
    }
    return result;
  }
  return { calculate };
});
