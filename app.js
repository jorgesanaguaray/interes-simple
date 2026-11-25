(function(){
'use strict';
const {modules,groups,sources,authors}=window.CourseData;
const $=id=>document.getElementById(id);
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>Math.abs(value)>0&&Math.abs(value)<1e-7?Number(value).toExponential(5).replace('.',','):new Intl.NumberFormat('es-EC',{maximumFractionDigits:7}).format(value);
const money=value=>(value<0?'−':'')+'$'+new Intl.NumberFormat('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.abs(value));
const formatted=item=>item.format==='percent'?number(item.value*100)+'%':item.format==='money'?money(item.value):number(item.value);
let activeModule=null,inputs={},selectedExample='';

function defaults(mod){const data=Object.fromEntries(mod.fields.map(field=>[field.id,field.value]));if(mod.defaultFlows)data.flows=clone(mod.defaultFlows);return data;}
function solve(mod,data){if(!window.EconomicMath)throw new Error('No se pudo cargar el motor de cálculo. Recarga la página.');return window.EconomicMath.solve(mod.id,data);}
function stepsHTML(steps){return '<ol class="solution-steps">'+steps.map(s=>'<li><strong>'+esc(s.title)+'</strong><code>'+esc(s.formula)+'</code>'+(s.explanation?'<span class="step-explanation">'+esc(s.explanation)+'</span>':'')+'</li>').join('')+'</ol>';}
function sourceHTML(key,full=true){const s=sources[key];return esc(s.label)+(s.url?' <a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+(full?'Consultar fuente':'Consultar')+'</a>':'');}

function diagramSVG(raw,focal=0,unit='periodos',compact=false){
  const grouped=new Map();
  for(const flow of raw||[]){const t=Number(flow.time),amount=Number(flow.amount);if(Number.isFinite(t)&&Number.isFinite(amount))grouped.set(t,(grouped.get(t)||0)+amount);}
  const all=Array.from(grouped,([time,amount])=>({time,amount})).sort((a,b)=>a.time-b.time);
  if(!all.length)return '';
  const flows=all.length>48?all.filter((_,i)=>i===0||i===all.length-1||i%Math.ceil(all.length/46)===0):all;
  const width=compact?680:860,height=compact?280:268,left=56,right=width-52,axis=128;
  const end=Math.max(1,Number(focal)||0,...all.map(x=>x.time));
  const x=t=>left+(right-left)*t/end;
  const max=Math.max(1,...all.map(f=>Math.abs(f.amount)));
  const ticks=Array.from(new Set([0,...all.length<=8?all.map(v=>v.time):Array.from({length:7},(_,k)=>end*k/6),Number(focal)||0])).sort((a,b)=>a-b);
  const labelEvery=Math.max(1,Math.ceil(flows.length/(compact?4:7)));
  const short=v=>{const a=Math.abs(v);return(v<0?'−':'')+'$'+(a>=1e6?number(a/1e6)+' M':a>=1e4?number(a/1000)+' mil':number(a));};
  let svg='<svg class="cashflow-diagram" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Diagrama de flujos netos por fecha. Entradas sobre el eje, salidas debajo; fecha focal '+esc(number(focal))+' '+esc(unit)+'."><line x1="'+left+'" x2="'+right+'" y1="'+axis+'" y2="'+axis+'" stroke="#8a9ca6" stroke-width="1.4"/>';
  if(Number.isFinite(Number(focal))){const xf=x(Number(focal));svg+='<line x1="'+xf+'" x2="'+xf+'" y1="26" y2="211" stroke="#8e9fa8" stroke-width="1" stroke-dasharray="4 5"/><text x="'+xf+'" y="18" text-anchor="middle" fill="#536773" font-size="12">Fecha focal '+esc(number(focal))+'</text>';}
  for(const t of ticks){const xx=x(t);svg+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(axis-4)+'" y2="'+(axis+4)+'" stroke="#8a9ca6"/><text x="'+xx+'" y="'+(height-19)+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#536773">'+esc(number(t))+'</text>';}
  flows.forEach((f,k)=>{const xx=x(f.time),positive=f.amount>=0,color=positive?'#087c75':'#b56545',length=23+Math.abs(f.amount)/max*52,yy=axis+(positive?-length:length),direction=positive?1:-1;svg+='<g><title>t = '+esc(number(f.time))+': '+esc(money(f.amount))+'</title><line x1="'+xx+'" x2="'+xx+'" y1="'+axis+'" y2="'+yy+'" stroke="'+color+'" stroke-width="3"/><path d="M '+(xx-5)+' '+(yy+direction*8)+' L '+xx+' '+yy+' L '+(xx+5)+' '+(yy+direction*8)+'" fill="none" stroke="'+color+'" stroke-width="2.4"/>';
    if(k%labelEvery===0||k===flows.length-1)svg+='<text x="'+xx+'" y="'+(positive?yy-11:yy+21)+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="'+(compact?'13':'12')+'" fill="'+color+'" font-weight="700">'+esc(short(f.amount))+'</text>';
    svg+='</g>';});
  return svg+'<text x="'+right+'" y="'+(height-2)+'" text-anchor="end" font-family="Arial,sans-serif" font-size="11" fill="#536773">'+esc(unit)+'</text></svg>';
}

function renderNav(){
  $('course-nav').innerHTML='<a class="nav-home" href="#inicio">Vista general</a>'+groups.map(group=>'<div class="nav-group"><p>'+esc(group.title)+'</p>'+modules.filter(mod=>mod.group===group.id).map(mod=>'<a href="#'+mod.id+'">'+esc(mod.title)+'</a>').join('')+'</div>').join('');
}
function updateCurrent(route){for(const a of document.querySelectorAll('.sidebar a')){if(a.getAttribute('href')==='#'+route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}}
function homeHTML(){
  const sample={model:'compound',rate:10,focal:3,flows:[{time:0,amount:-5000},{time:1,amount:2000},{time:3,amount:4000}]};
  let heroResult='−$235,00';try{heroResult=formatted(window.EconomicMath.solve('timeline',sample).results[0]);}catch(e){console.error(e);}
  return '<section class="home-hero" id="overview"><div><p class="eyebrow">Proyecto del primer parcial</p><h1>El valor del dinero<br>en el tiempo.</h1><p class="hero-lead">Conceptos, fórmulas y ejercicios para comprender cómo se relacionan los capitales, las tasas y los flujos de efectivo.</p><p class="hero-context"><strong>Universidad Agraria del Ecuador</strong>Computación en línea · Paralelo 6SB · Grupo 6</p><div class="hero-actions"><a href="#simple" class="button button-primary">Comenzar con interés simple</a><a href="#equipo" class="button button-secondary">Equipo y fuentes</a></div></div><div class="hero-visual"><div class="visual-heading"><h2>Un flujo, distintas fechas</h2><span>10% compuesto por periodo</span></div><div class="hero-diagram">'+diagramSVG(sample.flows,3,'periodos',true)+'</div><div class="visual-caption"><div><span>Saldo equivalente en t = 3</span><strong>'+heroResult+'</strong></div><p>Las cantidades se trasladan a una fecha común antes de sumarse.</p></div></div></section><section aria-labelledby="course-title"><div class="course-intro"><h2 id="course-title">Los temas del primer parcial</h2><p>Explora cada tema, resuelve los casos y modifica sus datos para comprobar el procedimiento.</p></div><div class="block-grid">'+groups.map(g=>'<article class="course-block"><span class="block-symbol" aria-hidden="true">'+g.symbol+'</span><h3>'+g.title+'</h3><p>'+g.description+'</p><div class="topic-links">'+modules.filter(m=>m.group===g.id).map(m=>'<a href="#'+m.id+'"><span>'+m.title+'</span><small>'+m.examples.length+' ejercicios</small></a>').join('')+'</div></article>').join('')+'</div></section><section class="home-bottom"><div><h3>La fecha focal hace comparables los flujos.</h3><p>Construye un diagrama, registra entradas y salidas y observa qué valor tienen bajo interés simple o compuesto.</p></div><a href="#timeline" class="button button-secondary">Explorar el diagrama</a></section>';
}
function teamHTML(){return '<div class="module-heading"><div><p class="eyebrow">Autoría y referencias</p><h1>Equipo y fuentes</h1><p class="team-intro">Proyecto del I parcial de Ingeniería Económica. Universidad Agraria del Ecuador, carrera de Ingeniería en Ciencias de la Computación.</p></div><span class="module-tag">Paralelo 6SB · Grupo 6</span></div><div class="team-layout"><section class="team-card"><h2>Integrantes</h2><ul class="team-list">'+authors.map(a=>'<li>'+esc(a)+'</li>').join('')+'</ul><p class="teacher"><strong>Docente</strong>Ing. María del Pilar Avilés Vera</p><p class="teacher"><strong>Curso y período</strong>Computación en línea · 6SB<br>2026–2027 · Ciclo II</p><p class="delivery-note">Entrega del I parcial: 29 de noviembre de 2026.<br>Presentación: 30 de noviembre al 2 de diciembre de 2026.</p></section><section class="source-card"><h2>Material de consulta</h2><ol class="source-list">'+Object.keys(sources).map(k=>'<li>'+sourceHTML(k)+'</li>').join('')+'</ol><p class="source-use">Los siete ejercicios de interés simple proceden del material de clase indicado. Los casos adicionales se identifican como ejercicios propuestos por el grupo. Las explicaciones y los desarrollos permiten comprobar cada respuesta.</p></section></div>';}

function visibleField(mod,id,data){
  if(mod.id==='simple'){
    const op=data.operation,sets={capital:['interest','rate','time'],interest:['capital','rate','time'],amount:['present'],rate:['interest','capital','time','present'],time:['interest','capital','rate','present']};
    if(sets[id])return sets[id].includes(op);
  }
  if(mod.id==='compound'){
    const op=data.operation,sets={capital:['amount','rate','time'],amount:['present','rate','time'],rate:['amount','present','time'],periods:['amount','present','rate']};
    if(sets[id])return sets[id].includes(op);
  }
  if(mod.id==='annuities'){
    if(id==='payment')return data.operation==='values';
    if(id==='present')return data.operation==='payment';
    if(id==='periods')return !data.perpetuity;
  }
  if(mod.id==='gradients'){
    if(id==='gradient')return data.kind==='arithmetic';
    if(id==='growth')return data.kind==='geometric';
  }
  return true;
}
function fieldLabel(mod,field,data){
  if(mod.id==='discount'&&field.id==='rate')return data.method==='commercial'?'Tasa comercial anual d · %':'Tasa de interés anual i · %';
  if(mod.id==='simple'&&field.id==='timeUnit'&&data.operation==='time')return 'Unidad del plazo buscado';
  if(mod.id==='simple'&&field.id==='ratePeriod'&&data.operation==='rate')return 'Periodo de la tasa buscada';
  if(mod.id==='rates'&&field.id==='rate')return data.entry==='nominal'?'Tasa nominal anual j · %':data.entry==='effective'?'Tasa efectiva anual EA · %':'Tasa efectiva por periodo · %';
  return field.label;
}
function fieldHTML(mod,field){
  const value=inputs[field.id],visible=visibleField(mod,field.id,inputs);
  let control;
  if(field.type==='select')control='<select id="input-'+field.id+'" name="'+field.id+'"'+(!visible?' disabled':'')+'>'+field.options.map(o=>'<option value="'+esc(o.value)+'"'+(String(o.value)===String(value)?' selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select>';
  else control='<input id="input-'+field.id+'" name="'+field.id+'" type="number" inputmode="decimal" step="'+esc(field.step??'any')+'"'+(field.min!==undefined?' min="'+field.min+'"':'')+(field.max!==undefined?' max="'+field.max+'"':'')+' value="'+esc(value)+'"'+(!visible?' disabled':'')+'>';
  return '<div class="field'+(field.wide?' field-wide':'')+'" data-field="'+field.id+'"'+(!visible?' hidden':'')+'><label for="input-'+field.id+'">'+esc(fieldLabel(mod,field,inputs))+'</label>'+control+(field.help?'<p class="field-help" id="help-'+field.id+'">'+esc(field.help)+'</p>':'')+'</div>';
}
function flowRowsHTML(){return(inputs.flows||[]).map((flow,index)=>'<div class="flow-row" data-flow="'+index+'"><div><label for="flow-time-'+index+'">Fecha t</label><input id="flow-time-'+index+'" type="number" min="0" max="360" step="any" inputmode="decimal" data-time="'+index+'" value="'+esc(flow.time)+'"></div><div><label for="flow-amount-'+index+'">Flujo · USD</label><input id="flow-amount-'+index+'" type="number" step="any" inputmode="decimal" data-amount="'+index+'" value="'+esc(flow.amount)+'"></div><button type="button" class="remove-flow" data-remove="'+index+'" aria-label="Eliminar flujo '+(index+1)+'">×</button></div>').join('');}
function formHTML(mod){return '<form id="lab-form" class="form-panel" novalidate><div class="form-head"><h3>Datos de la operación</h3><button class="button-quiet" type="button" id="reset-data">Restablecer</button></div><p class="selected-example" id="selected-example" hidden></p><div class="field-grid">'+mod.fields.map(field=>fieldHTML(mod,field)).join('')+'</div>'+(mod.flows?'<div class="flow-editor"><h3>Flujos '+(mod.id==='timeline'?'de efectivo':'conocidos')+'</h3><p>Entradas con signo positivo y salidas con signo negativo. Las fechas utilizan la misma unidad que la tasa.</p><div id="flow-rows">'+flowRowsHTML()+'</div><button type="button" class="add-flow" id="add-flow">Añadir flujo</button><p class="flow-limit" id="flow-limit" hidden>Se admiten hasta 12 flujos en el editor.</p></div>':'')+'<div class="form-buttons"><button type="submit" class="button button-primary">Calcular</button></div><p class="form-foot">El resultado se actualiza también al cambiar los datos.</p></form>';}
function readInputs(mod){
  const data={};for(const field of mod.fields){const element=$('input-'+field.id);data[field.id]=field.boolean?element.value==='true':element.value;}
  if(mod.flows)data.flows=Array.from(document.querySelectorAll('#flow-rows .flow-row')).map(row=>({time:row.querySelector('[data-time]').value,amount:row.querySelector('[data-amount]').value}));
  return data;
}
function updateConditions(mod){for(const field of mod.fields){const element=$('input-'+field.id),visible=visibleField(mod,field.id,inputs);element.disabled=!visible;element.closest('[data-field]').hidden=!visible;document.querySelector('label[for="input-'+field.id+'"]').textContent=fieldLabel(mod,field,inputs);}}
function resultHTML(result){const [primary,...others]=result.results;return '<section class="result-box" id="result-box" aria-live="polite" aria-atomic="true"><h3>Resultado de la operación</h3><p class="result-label" id="result-label">'+esc(primary.label)+'</p><div class="primary-value" id="result-value">'+esc(formatted(primary))+'</div>'+(others.length?'<div class="result-details" id="result-summary">'+others.map(item=>'<div><span>'+esc(item.label)+'</span><strong>'+esc(formatted(item))+'</strong></div>').join('')+'</div>':'')+'</section><section class="steps-panel" id="procedure"><h3>Procedimiento</h3>'+stepsHTML(result.steps)+'</section>'+(result.notes?.length?'<ul class="result-notes">'+result.notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>':'');}
function diagramHTML(result){
  if(!result.cashflows?.length)return '';
  const flows=result.cashflows,tooMany=new Set(flows.map(f=>f.time)).size>48;
  return '<div class="diagram-panel"><div class="diagram-heading"><h3>Diagrama de tiempo</h3><div class="diagram-legend"><span>Entradas</span><span>Salidas</span></div></div><div class="diagram-scroll">'+diagramSVG(flows,result.focal??0,result.unit||'periodos')+'</div><p class="diagram-note">Las posiciones representan las fechas y la altura representa la magnitud del flujo. Los flujos que coinciden en una fecha se agrupan por su valor neto.'+(tooMany?' Para mantener la lectura, el gráfico muestra una selección de fechas; la tabla conserva todos los pagos.':'')+'</p><details class="cashflow-details"><summary>Ver tabla de flujos</summary><div class="table-scroll"><table class="data-table"><thead><tr><th scope="col">Flujo</th><th scope="col">Fecha · '+esc(result.unit||'periodos')+'</th><th scope="col">Importe · USD</th></tr></thead><tbody>'+flows.map((flow,index)=>'<tr><td>'+esc(flow.label||'Flujo '+(index+1))+'</td><td>'+esc(number(flow.time))+'</td><td>'+esc(money(flow.amount))+'</td></tr>').join('')+'</tbody></table></div></details></div>';
}
function updateResult(){
  const mod=activeModule;inputs=readInputs(mod);updateConditions(mod);
  for(const field of mod.fields)$('input-'+field.id).removeAttribute('aria-invalid');
  try{const result=solve(mod,inputs);$('result-zone').innerHTML=resultHTML(result);$('diagram-zone').innerHTML=diagramHTML(result);}
  catch(error){$('result-zone').innerHTML='<div class="error-box" role="alert" id="result-error"><strong>Revisa los datos</strong>'+esc(error.message)+'</div>';$('diagram-zone').innerHTML='';for(const field of mod.fields){const el=$('input-'+field.id);if(!el.disabled&&(el.value===''||!el.validity.valid))el.setAttribute('aria-invalid','true');}}
}
function setPreset(data,title=''){
  inputs={...defaults(activeModule),...clone(data)};for(const field of activeModule.fields)$('input-'+field.id).value=String(inputs[field.id]);
  if(activeModule.flows)$('flow-rows').innerHTML=flowRowsHTML();
  selectedExample=title;$('selected-example').hidden=!title;$('selected-example').textContent=title?'Ejercicio cargado: '+title:'';
  if($('flow-limit'))$('flow-limit').hidden=true;
  updateResult();
}
function exampleHTML(mod,example,index){
  const data={...defaults(mod),...clone(example.preset)};
  let solution,answer;try{solution=solve(mod,data);answer=formatted(solution.results[0]);}catch(error){console.error('Ejercicio '+mod.id+' '+index,error);return '<div class="error-box">No se pudo resolver el ejercicio '+esc(example.title)+': '+esc(error.message)+'</div>';}
  return '<details class="exercise" id="exercise-'+index+'"><summary><div class="exercise-summary-title"><strong>'+esc(example.title)+'</strong><small>'+esc(example.source.startsWith('Material de clase')?'Material de clase':'Ejercicio propuesto por el grupo')+'</small></div><span class="exercise-answer">'+esc(answer)+'</span></summary><div class="exercise-body"><div><p class="exercise-question">'+esc(example.question)+'</p><p class="exercise-source">'+esc(example.source)+'</p><button type="button" class="button button-secondary" data-example="'+index+'">Cargar datos en la calculadora</button></div><div class="exercise-work">'+stepsHTML(solution.steps)+'<p class="result-mini">'+solution.results.map(r=>esc(r.label)+': '+esc(formatted(r))).join('<br>')+'</p></div></div></details>';
}
function moduleHTML(mod){const group=groups.find(g=>g.id===mod.group),index=modules.indexOf(mod),next=modules[index+1];return '<header class="module-heading" id="module-intro"><div><p class="eyebrow">'+esc(group.title)+' · Primer parcial</p><h1>'+esc(mod.title)+'</h1><p class="module-lead">'+esc(mod.lead)+'</p></div><span class="module-tag">Conceptos y práctica</span></header><section class="concept-panel" id="concepts"><h2>Comprende el tema</h2><div class="concept-copy">'+mod.concepts.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div><dl class="definition-list">'+mod.definitions.map(([term,text])=>'<div><dt>'+esc(term)+'</dt><dd>'+esc(text)+'</dd></div>').join('')+'</dl><div class="formula-list">'+mod.formulas.map(f=>'<div class="formula-item"><span>'+esc(f.label)+'</span><div class="formula">'+f.html+'</div></div>').join('')+'</div>'+(mod.formulaNote?'<p class="formula-note">'+esc(mod.formulaNote)+'</p>':'')+'<p class="assumptions"><strong>Condiciones del modelo.</strong> '+esc(mod.assumptions)+'</p></section><section class="lab-section" id="calculator"><div class="lab-heading"><div><h2>Resuelve y comprueba</h2><p>Modifica los datos para ver el resultado y la sustitución en cada paso.</p></div><span class="live-note">Cálculo con datos editables</span></div><div class="lab-grid">'+formHTML(mod)+'<div class="result-column" id="result-zone"></div></div><div id="diagram-zone"></div></section><section class="examples-section" id="examples"><div class="section-intro"><div><h2>Ejercicios resueltos</h2><p>Abre el desarrollo de un caso o carga sus datos para explorar otras condiciones.</p></div><span class="examples-count">'+mod.examples.length+' ejercicios</span></div>'+mod.examples.map((e,i)=>exampleHTML(mod,e,i)).join('')+'</section><section class="module-sources"><p><strong>Fuentes del tema</strong></p>'+mod.sources.map(key=>'<p>'+sourceHTML(key)+'</p>').join('')+'</section>'+(next?'<div class="next-topic"><a href="#'+next.id+'"><small>Continuar con el siguiente tema</small>'+esc(next.title)+'</a></div>':'<div class="next-topic"><a href="#equipo">Consultar equipo y fuentes</a></div>');}

function attachLab(){
  const form=$('lab-form');form.addEventListener('input',updateResult);form.addEventListener('change',updateResult);form.addEventListener('submit',event=>{event.preventDefault();updateResult();});
  $('reset-data').addEventListener('click',()=>setPreset({}));
  if(activeModule.flows){
    $('add-flow').addEventListener('click',()=>{inputs=readInputs(activeModule);if(inputs.flows.length>=12){$('flow-limit').hidden=false;return;}const max=Math.max(0,...inputs.flows.map(f=>Number(f.time)||0));inputs.flows.push({time:Math.min(360,max+1),amount:0});$('flow-rows').innerHTML=flowRowsHTML();updateResult();});
    $('flow-rows').addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(!button)return;inputs=readInputs(activeModule);inputs.flows.splice(Number(button.dataset.remove),1);$('flow-rows').innerHTML=flowRowsHTML();$('flow-limit').hidden=true;updateResult();});
  }
  $('examples').addEventListener('click',event=>{const button=event.target.closest('[data-example]');if(!button)return;const example=activeModule.examples[Number(button.dataset.example)];setPreset(example.preset,example.title);$('calculator').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('input-'+activeModule.fields[0].id).focus({preventScroll:true});});
  for(const field of activeModule.fields){if(field.help)$('input-'+field.id).setAttribute('aria-describedby','help-'+field.id);}
  updateResult();
}
function syncMenuAccessibility(){const hidden=window.matchMedia('(max-width: 760px)').matches&&!$('sidebar').classList.contains('is-open');$('sidebar').inert=hidden;if(hidden)$('sidebar').setAttribute('aria-hidden','true');else $('sidebar').removeAttribute('aria-hidden');}
function closeMenu(){ $('sidebar').classList.remove('is-open');$('menu-toggle').setAttribute('aria-expanded','false');syncMenuAccessibility(); }
function route(){
  const id=decodeURIComponent(location.hash.slice(1)||'inicio');activeModule=modules.find(m=>m.id===id)||null;
  closeMenu();updateCurrent(activeModule?id:id==='equipo'?'equipo':'inicio');
  if(activeModule){inputs=defaults(activeModule);selectedExample='';$('main').innerHTML=moduleHTML(activeModule);$('breadcrumb').textContent=groups.find(g=>g.id===activeModule.group).title+' / '+activeModule.title;document.title=activeModule.title+' | Ingeniería Económica · Grupo 6';attachLab();}
  else if(id==='equipo'){$('main').innerHTML=teamHTML();$('breadcrumb').textContent='Proyecto / Equipo y fuentes';document.title='Equipo y fuentes | Ingeniería Económica';}
  else{$('main').innerHTML=homeHTML();$('breadcrumb').textContent='Proyecto del primer parcial';document.title='Ingeniería Económica | Primer parcial · Grupo 6';}
  window.scrollTo({top:0,behavior:'instant'});
}
renderNav();
$('menu-toggle').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('is-open');$('menu-toggle').setAttribute('aria-expanded',String(open));syncMenuAccessibility();});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();$('main').focus();$('main').scrollIntoView({block:'start',behavior:'instant'});});
window.matchMedia('(max-width: 760px)').addEventListener('change',syncMenuAccessibility);
document.addEventListener('click',event=>{if($('sidebar').classList.contains('is-open')&&!event.target.closest('.sidebar')&&!event.target.closest('.mobile-header'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('sidebar').classList.contains('is-open')){closeMenu();$('menu-toggle').focus();}});
window.addEventListener('hashchange',route);
route();
})();
