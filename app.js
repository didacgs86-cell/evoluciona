/* Evoluciona 1.2 — registro contextual por áreas y proyectos. */
(() => {
  'use strict';

  const DB_NAME = 'evoluciona-local-v1';
  const DB_STORE = 'data';
  const DB_KEY = 'snapshot';
  const AREAS = [
    { id: 'fisico', label: 'Físico y salud', icon: '💪', sub: 'Movimiento y cuerpo' },
    { id: 'mental', label: 'Bienestar mental', icon: '🌿', sub: 'Equilibrio y reflexión' },
    { id: 'aprendizaje', label: 'Aprendizaje', icon: '📚', sub: 'Lectura y estudio' },
    { id: 'profesional', label: 'Profesional', icon: '🩺', sub: 'Habilidades y carrera' },
    { id: 'objetivos', label: 'Objetivos y proyectos', icon: '🎯', sub: 'Metas y resultados' },
    { id: 'personal', label: 'Vida personal', icon: '✨', sub: 'Personas y experiencias' },
    { id: 'habitos', label: 'Hábitos y descanso', icon: '☀️', sub: 'Rutinas sostenibles' }
  ];
  const TYPES = [
    { id: 'gym', label: 'Entrenamiento', icon: '🏋️', area: 'fisico', unit: 'sesiones', input: false, xp: 20, initial: 1 },
    { id: 'weight', label: 'Peso corporal', icon: '⚖️', area: 'fisico', unit: 'kg', input: true, xp: 5, initial: '', step: '0.1' },
    { id: 'muscle', label: 'Masa muscular estimada', icon: '📈', area: 'fisico', unit: 'kg', input: true, xp: 5, initial: '', step: '0.1' },
    { id: 'bodyfat', label: 'Grasa corporal estimada', icon: '📏', area: 'fisico', unit: '%', input: true, xp: 5, initial: '', step: '0.1' },
    { id: 'waist', label: 'Perímetro de cintura', icon: '📐', area: 'fisico', unit: 'cm', input: true, xp: 5, initial: '', step: '0.1' },
    { id: 'reading', label: 'Lectura', icon: '📖', area: 'aprendizaje', unit: 'páginas', input: true, xp: 10, initial: '', step: '1' },
    { id: 'study', label: 'Estudio', icon: '🎓', area: 'aprendizaje', unit: 'horas', input: true, xp: 15, initial: '', step: '0.25' },
    { id: 'language', label: 'Práctica de idiomas', icon: '🗣️', area: 'aprendizaje', unit: 'minutos', input: true, xp: 10, initial: '', step: '5' },
    { id: 'learning', label: 'Algo aprendido', icon: '💡', area: 'aprendizaje', unit: 'aprendizajes', input: false, xp: 10, initial: 1 },
    { id: 'wellbeing', label: 'Autocuidado', icon: '💚', area: 'mental', unit: 'acciones', input: false, xp: 5, initial: 1 },
    { id: 'reflection', label: 'Reflexión personal', icon: '🧠', area: 'mental', unit: 'reflexiones', input: false, xp: 10, initial: 1 },
    { id: 'experience', label: 'Nueva experiencia', icon: '🌍', area: 'personal', unit: 'experiencias', input: false, xp: 10, initial: 1 },
    { id: 'professional', label: 'Logro profesional', icon: '🩺', area: 'profesional', unit: 'hitos', input: false, xp: 15, initial: 1 },
    { id: 'habit', label: 'Hábito completado', icon: '🌱', area: 'habitos', unit: 'acciones', input: false, xp: 10, initial: 1 },
    { id: 'sleep', label: 'Horas de sueño', icon: '🌙', area: 'habitos', unit: 'horas', input: true, xp: 5, initial: '', step: '0.5' },
    { id: 'project', label: 'Trabajo en proyecto', icon: '💻', area: 'objetivos', unit: 'sesiones', input: false, xp: 15, initial: 1 }
  ];
  const TYPES_BY_ID = Object.fromEntries(TYPES.map(t => [t.id,t]));
  const AREA_BY_ID = Object.fromEntries(AREAS.map(a => [a.id,a]));
  const $ = (sel) => document.querySelector(sel);
  const root = $('#app');
  const modal = $('#modal');
  const toastEl = $('#toast');
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const newId = () => (globalThis.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const localDate = (d = new Date()) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const dateFromIso = (s) => new Date(`${s}T12:00:00`);
  const fmtDate = (s) => dateFromIso(s).toLocaleDateString('es-ES', {day:'numeric',month:'short',year:'numeric'});
  const fmtN = (n, maximumFractionDigits = 1) => new Intl.NumberFormat('es-ES', {maximumFractionDigits}).format(n);
  const daysAgo = (n) => { const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-n);return localDate(d); };
  const areaLabel = (id) => AREA_BY_ID[id]?.label || 'Otros';
  const projectName = (id) => state.projects.find(p=>p.id===id)?.name || 'Proyecto anterior';
  const activeProjects = () => state.projects.filter(p=>!p.archived);
  const currentArea = () => {const m=(location.hash||'').match(/^#area\/(\w+)/);return m&&AREA_BY_ID[m[1]]?m[1]:null;};
  const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(dateFromIso(s).getTime()) && localDate(dateFromIso(s))===s;
  const daysBetween = (start,end) => Math.round((dateFromIso(end)-dateFromIso(start))/(24*60*60*1000));
  const defaultState = () => ({version:1,settings:{name:''},records:[],goals:[],projects:[]});
  let state = defaultState();
  let database = null;
  let filterArea = 'todos';
  let period = 30;
  let bodyMetric = 'weight';
  let toastTimer = null;

  const ACHIEVEMENTS = [
    {id:'first-step',icon:'🌱',title:'Primer paso',description:'Registrar tu primer avance',target:1,from:s=>s.records.length},
    {id:'project-1',icon:'💻',title:'Proyecto en marcha',description:'Registrar el primer día trabajado en un proyecto',target:1,from:s=>s.records.filter(r=>r.type==='project').length},
    {id:'project-10',icon:'🚀',title:'Constructor constante',description:'Registrar 10 días de trabajo en proyectos',target:10,from:s=>s.records.filter(r=>r.type==='project').length},
    {id:'gym-10',icon:'💪',title:'En marcha',description:'Completar 10 entrenamientos',target:10,from:s=>s.records.filter(r=>r.type==='gym').length},
    {id:'gym-50',icon:'🏆',title:'Constancia física',description:'Completar 50 entrenamientos',target:50,from:s=>s.records.filter(r=>r.type==='gym').length},
    {id:'read-100',icon:'📗',title:'Entre páginas',description:'Leer 100 páginas',target:100,from:s=>sumType(s,'reading')},
    {id:'read-1000',icon:'📚',title:'Lector incansable',description:'Leer 1.000 páginas',target:1000,from:s=>sumType(s,'reading')},
    {id:'study-10',icon:'🎓',title:'Mente curiosa',description:'Acumular 10 horas de estudio',target:10,from:s=>sumType(s,'study')},
    {id:'study-100',icon:'🧩',title:'Maestría en construcción',description:'Acumular 100 horas de estudio',target:100,from:s=>sumType(s,'study')},
    {id:'learning-10',icon:'💡',title:'Siempre aprendiendo',description:'Registrar 10 aprendizajes',target:10,from:s=>s.records.filter(r=>r.type==='learning').length},
    {id:'reflection-5',icon:'🌿',title:'Mirada interior',description:'Registrar 5 reflexiones',target:5,from:s=>s.records.filter(r=>r.type==='reflection').length},
    {id:'first-goal',icon:'🎯',title:'Objetivo cumplido',description:'Completar tu primer objetivo',target:1,from:s=>s.goals.filter(g=>g.done).length},
    {id:'goals-5',icon:'✨',title:'Constructor de logros',description:'Completar 5 objetivos',target:5,from:s=>s.goals.filter(g=>g.done).length},
    {id:'experience-5',icon:'🌍',title:'Coleccionista de momentos',description:'Registrar 5 experiencias nuevas',target:5,from:s=>s.records.filter(r=>r.type==='experience').length}
  ];
  const sumType = (s,type) => s.records.filter(r=>r.type===type).reduce((a,r)=>a+r.value,0);
  const linkedTotal = (s,g) => g.recordType && g.linkedAt ? s.records.filter(r=>r.type===g.recordType && r.createdAt>g.linkedAt && (!g.projectId || r.projectId===g.projectId)).reduce((n,r)=>n+r.value,0) : 0;
  const goalValue = (s,g) => Math.min(g.target, g.progress+linkedTotal(s,g));
  function reconcileGoals(s){
    s.goals.forEach(g=>{
      if(!g.done && goalValue(s,g)>=g.target){g.done=true;g.autoCompleted=true;g.completedAt=new Date().toISOString();}
      else if(g.done && g.autoCompleted && goalValue(s,g)<g.target){g.done=false;g.autoCompleted=false;g.completedAt=null;}
    });
  }
  const unlocked = (s=state) => ACHIEVEMENTS.filter(a=>a.from(s)>=a.target);
  const totalXp = () => state.records.reduce((n,r)=>n+(TYPES_BY_ID[r.type]?.xp||0),0)+state.goals.filter(g=>g.done).length*40+unlocked().length*50;
  const recentRecords = () => [...state.records].sort((a,b)=>b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const completedGoals = () => state.goals.filter(g=>g.done);
  const safeTitle = (s) => esc(s).slice(0,500);

  function openDB() {
    return new Promise((resolve,reject) => {
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE);};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Error IndexedDB'));
      req.onblocked=()=>reject(new Error('Cierra las otras pestañas de esta aplicación y vuelve a abrirla.'));
    });
  }
  function readDB() {
    return new Promise((resolve,reject)=>{
      const tx=database.transaction(DB_STORE,'readonly');
      const req=tx.objectStore(DB_STORE).get(DB_KEY);
      req.onsuccess=()=>resolve(req.result||defaultState());
      req.onerror=()=>reject(req.error||new Error('No se pueden leer los datos'));
    });
  }
  function writeDB(value){
    return new Promise((resolve,reject)=>{
      const tx=database.transaction(DB_STORE,'readwrite');
      tx.objectStore(DB_STORE).put(value,DB_KEY);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||new Error('No se pueden guardar los datos'));
      tx.onabort=()=>reject(tx.error||new Error('Guardado cancelado'));
    });
  }
  async function transact(mutator, message){
    const draft=structuredClone(state);
    mutator(draft);
    reconcileGoals(draft);
    try{
      await writeDB(draft);
      state=draft;
      render();
      if(message) toast(message);
      return true;
    }catch(err){alert('No se pudieron guardar los cambios. '+err.message);return false;}
  }
  function toast(msg){
    toastEl.textContent=msg;
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toastEl.classList.remove('visible'),3200);
  }
  function closeModal(){modal.innerHTML='';document.body.style.overflow='';}
  function showModal(title,sub,body){
    modal.innerHTML=`<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div><h2 id="modal-title">${esc(title)}</h2><p>${esc(sub)}</p></div><button class="icon-button" data-action="close-modal" aria-label="Cerrar">✕</button></div>${body}</div>`;
    document.body.style.overflow='hidden';
    modal.querySelector('input:not([type="hidden"]),textarea,button')?.focus();
  }
  function statCard(icon,label,value,foot){return `<div class="stat-card"><div class="stat-top"><span>${esc(label)}</span><span class="stat-icon">${icon}</span></div><div class="stat-number">${esc(value)}</div><div class="stat-foot">${esc(foot)}</div></div>`;}
  function sectionHeading(title,secondary='',link=''){return `<div class="section-header"><h2>${esc(title)}</h2>${link?`<a class="text-link" href="#${link}">${esc(secondary)} →</a>`:`<span class="sub">${esc(secondary)}</span>`}</div>`;}
  function noContent(icon,text,buttonText='',action=''){return `<div class="empty"><div class="empty-icon">${icon}</div><div>${esc(text)}</div>${action?`<button class="btn btn-sm" style="margin-top:15px" data-action="${action}">${esc(buttonText)}</button>`:''}</div>`;}
  function navigation(page){
    document.querySelectorAll('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===page));
    const labels={inicio:'MI PANEL PERSONAL',objetivos:'OBJETIVOS',historial:'HISTORIAL',logros:'LOGROS',ajustes:'MIS DATOS',area:areaLabel(currentArea())};
    $('#page-eyebrow').textContent=labels[page]||labels.inicio;
  }
  function render(){
    const view=(location.hash||'#inicio').slice(1).split('?')[0];
    const page=['inicio','objetivos','historial','logros','ajustes'].includes(view)?view:'inicio';
    navigation(page);
    if(view.startsWith('area/') && currentArea()){navigation('area');root.innerHTML=renderAreaPage(currentArea());return;}
    if(page==='inicio')root.innerHTML=renderHome();
    if(page==='objetivos')root.innerHTML=renderGoalsPage();
    if(page==='historial')root.innerHTML=renderHistoryPage();
    if(page==='logros')root.innerHTML=renderAchievementsPage();
    if(page==='ajustes')root.innerHTML=renderSettingsPage();
  }
  function renderHome(){
    const xp=totalXp(),level=Math.floor(xp/300)+1,current=xp%300;
    const start=daysAgo(29),mon=localDate().slice(0,7);
    const monthsRecords=state.records.filter(r=>r.date.slice(0,7)===mon);
    const days=new Set(state.records.filter(r=>r.date>=start).map(r=>r.date)).size;
    const monthGym=monthsRecords.filter(r=>r.type==='gym').length;
    const monthReading=monthsRecords.filter(r=>r.type==='reading').reduce((n,r)=>n+r.value,0);
    const monthStudy=monthsRecords.filter(r=>r.type==='study').reduce((n,r)=>n+r.value,0);
    const active=state.goals.filter(g=>!g.done).sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,3);
    const prev=recentRecords().slice(0,5);
    return `<div class="eyebrow">TU EVOLUCIÓN IMPORTA</div>
      <section class="hero"><div><h1>${state.settings.name?`Hola, ${safeTitle(state.settings.name)}.`:'Cada paso cuenta.'}<br><span class="highlight">Mira cuánto avanzas.</span></h1><p class="subtitle">Un lugar para registrar lo que haces, reconocer lo que aprendes y disfrutar de tu propio progreso.</p><button class="btn btn-primary" data-action="open-record">＋ Registrar un avance</button></div>
      <div class="hero-stats"><span class="stat-label">Tu camino personal</span><div class="level-line"><span class="level-number">Nivel ${level}</span><span class="xp">${fmtN(xp,0)} XP</span></div><div class="progress-track"><div class="progress-fill" style="width:${(current/300)*100}%"></div></div><span class="progress-sub">${300-current} XP hasta el siguiente nivel · ${unlocked().length} insignias conseguidas</span></div></section>
      <div class="stats-grid">${statCard('🏋️','Entrenamientos',monthGym,'Este mes')}${statCard('📖','Páginas leídas',fmtN(monthReading,0),'Este mes')}${statCard('🎓','Horas de estudio',fmtN(monthStudy),'Este mes')}${statCard('🌱','Días con avances',days,'Últimos 30 días')}</div>
      <div class="content-grid" style="margin-top:24px"><section class="panel"><div class="panel-heading"><h2>Tu actividad</h2><span class="chart-legend">Últimos 14 días</span></div>${renderActivityChart()}</section><section class="panel"><div class="panel-heading"><h2>Registra algo hoy</h2><span class="chart-legend">En unos segundos</span></div><div class="quick-grid">${['gym','reading','study','weight','learning','project'].map(id=>quickCard(TYPES_BY_ID[id])).join('')}</div></section></div>
      ${sectionHeading('Áreas de desarrollo','Entra en un área para registrar y consultar solo sus actividades')}
      <div class="area-grid">${AREAS.map(a=>`<button class="area-card" data-action="area-open" data-area="${a.id}"><span class="area-icon">${a.icon}</span><span class="area-text"><strong>${a.label}</strong><small>${a.sub}</small></span><span class="area-arrow">↗</span></button>`).join('')}</div>
      <div class="content-grid" style="margin-top:32px"><section>${sectionHeading('Actividad reciente','Ver todo','historial')}${prev.length?`<div class="activity-list">${prev.map(renderRecord).join('')}</div>`:noContent('✨','Todavía no hay avances registrados. El primero puede ser pequeño.','Registrar mi primer avance','open-record')}</section>
      <section>${sectionHeading('Objetivos en curso','Ver objetivos','objetivos')}${active.length?`<div class="goal-list">${active.map(g=>renderGoal(g,true)).join('')}</div>`:noContent('🎯','Define una meta que te ilusione y síguela poco a poco.','Crear un objetivo','open-goal')}</section></div>
      ${sectionHeading('Tu evolución física','Seguimiento opcional de tus medidas')}
      <section class="panel">${renderBodyMetrics()}</section><p class="footer-hint">Los puntos reconocen tus registros y metas, no tu valor personal. Descansar también forma parte del progreso.</p>`;
  }
  function renderAreaPage(areaId){
    const a=AREA_BY_ID[areaId],items=TYPES.filter(t=>t.area===areaId);
    const logs=recentRecords().filter(r=>TYPES_BY_ID[r.type]?.area===areaId).slice(0,15);
    const goals=state.goals.filter(g=>g.area===areaId && !g.done);
    const mon=localDate().slice(0,7);
    const monthCount=state.records.filter(r=>r.date.startsWith(mon) && TYPES_BY_ID[r.type]?.area===areaId).length;
    return `<button class="btn btn-sm btn-ghost" data-action="go-home">← Volver al resumen</button>
      <div class="page-heading area-heading"><div><div class="eyebrow">ÁREA DE DESARROLLO</div><h1>${a.icon} ${esc(a.label)}</h1><p class="subtitle">${esc(a.sub)} · Registra tus avances en esta área, sin mezclar otras categorías.</p></div>
      <button class="btn btn-primary" data-action="open-record">＋ Registrar en ${esc(a.label)}</button></div>
      <div class="stats-grid" style="margin-bottom:24px">${statCard('🗓️','Registros este mes',monthCount,'Esta área')}${statCard('🎯','Objetivos activos',goals.length,'Esta área')}${statCard('✨','Avances acumulados',state.records.filter(r=>TYPES_BY_ID[r.type]?.area===areaId).length,'Histórico')}</div>
      ${sectionHeading('Qué quieres registrar','Solo actividades de esta área')}
      <div class="quick-grid area-quick-grid">${items.map(quickCard).join('')}</div>
      ${areaId==='objetivos'?renderProjectsSection():''}
      ${goals.length?`${sectionHeading('Objetivos en curso','Progreso en esta área')}<div class="goal-list">${goals.map(g=>renderGoal(g)).join('')}</div>`:''}
      ${sectionHeading('Actividad en esta área','Últimos 15 registros')}
      ${logs.length?`<div class="activity-list">${logs.map(renderRecord).join('')}</div>`:noContent('✨','Todavía no tienes registros en esta área.','Registrar ahora','open-record')}
      ${areaId==='fisico'?`${sectionHeading('Evolución corporal','Datos de tus medidas')}<section class="panel">${renderBodyMetrics()}</section>`:''}`;
  }
  function renderProjectsSection(){
    const projects=activeProjects();
    return `${sectionHeading('Mis proyectos','Apps, iniciativas y otras creaciones')}
      <div class="project-toolbar"><button class="btn btn-primary" data-action="new-project">＋ Crear proyecto</button></div>
      ${projects.length?`<div class="project-grid">${projects.map(p=>{
        const count=state.records.filter(r=>r.type==='project'&&r.projectId===p.id).length;
        const today=state.records.some(r=>r.type==='project'&&r.projectId===p.id&&r.date===localDate());
        return `<div class="project-card"><div class="project-icon">💻</div><div><h3>${esc(p.name)}</h3><p>${count} ${count===1?'día registrado':'días registrados'}</p></div>
          <button class="btn btn-primary btn-sm" data-action="project-today" data-id="${esc(p.id)}" ${today?'disabled':''}>${today?'✓ Registrado hoy':'＋ He trabajado hoy'}</button>
          <button class="btn btn-sm btn-ghost" data-action="project-detail" data-id="${esc(p.id)}">Añadir detalle</button>
          <button class="btn btn-sm btn-ghost" data-action="archive-project" data-id="${esc(p.id)}">Archivar</button></div>`;
      }).join('')}</div>`:noContent('💻','Crea el nombre de tu primera app o proyecto. Después podrás marcar los días en que trabajas en él.')}
      ${state.projects.some(p=>p.archived)?`<div class="project-toolbar"><strong>Proyectos archivados</strong></div><div class="project-grid">${state.projects.filter(p=>p.archived).map(p=>`<div class="project-card"><div><h3>${esc(p.name)}</h3><p>Archivado · registros conservados</p></div><button class="btn btn-sm" data-action="restore-project" data-id="${esc(p.id)}">↩ Reactivar</button></div>`).join('')}</div>`:''}`;
  }
  function quickCard(t){return `<button class="quick-action" data-action="new-record" data-type="${t.id}"><span class="quick-icon">${t.icon}</span><span class="name">${esc(t.label)}</span></button>`;}
  function renderActivityChart(){
    const nums=Array.from({length:14},(_,i)=>{
      const d=daysAgo(13-i);
      return {d,n:state.records.filter(r=>r.date===d).length};
    });
    const max=Math.max(1,...nums.map(x=>x.n));
    const bars=nums.map((d,i)=>{
      const x=26+i*28.6;
      const height=(d.n/max)*117;
      const y=145-height;
      return `<rect x="${x}" y="${y}" width="17" height="${Math.max(2,height)}" rx="5" fill="${d.n?'#80d6ae':'#304845'}"><title>${esc(fmtDate(d.d))}: ${d.n} registros</title></rect>${(i===0||i===4||i===8||i===13)?`<text x="${x+8.5}" y="169" text-anchor="middle" class="chart-axis">${esc(d.d.slice(8))}/${esc(d.d.slice(5,7))}</text>`:''}`;
    }).join('');
    return `<div class="chart-wrap"><svg viewBox="0 0 430 185" role="img" aria-label="Número de registros diarios durante los últimos catorce días"><line x1="24" x2="416" y1="145" y2="145" stroke="#3a514f" stroke-width="1"/>${bars}<text x="8" y="20" class="chart-axis">${max}</text></svg></div><p class="mini-note">${nums.reduce((n,d)=>n+d.n,0)} registros en los últimos 14 días. No hay obligación de registrar algo todos los días.</p>`;
  }
  function renderBodyMetrics(){
    const metrics = ['weight','muscle','bodyfat','waist'];
    const metric = TYPES_BY_ID[bodyMetric];
    const tabs = `<div class="filters" aria-label="Tipo de medida corporal">${metrics.map(id=>`<button class="chip ${bodyMetric===id?'active':''}" data-action="body-metric" data-type="${id}">${esc(TYPES_BY_ID[id].label)}</button>`).join('')}</div>`;
    const all=recentRecords().filter(r=>r.type===bodyMetric).sort((a,b)=>a.date.localeCompare(b.date));
    const cutoff=period===0?'0000-01-01':daysAgo(period-1);
    const data=all.filter(r=>r.date>=cutoff);
    if(!data.length) return tabs+noContent(metric.icon,`Aún no hay medidas de ${metric.label.toLowerCase()} en este período. Puedes registrar una para ver cómo evoluciona.`,'Registrar medida','new-body-metric')+periodControls();
    const values=data.map(r=>r.value),min=Math.floor(Math.min(...values)-1),max=Math.ceil(Math.max(...values)+1),range=Math.max(1,max-min);
    const x0=43,x1=624,y0=17,y1=150;
    const first=data[0].date,last=data[data.length-1].date;
    const dayRange=Math.max(1,daysBetween(first,last));
    const pts=data.map(r=>({x:x0+daysBetween(first,r.date)/dayRange*(x1-x0),y:y1-(r.value-min)/range*(y1-y0),r}));
    const points=pts.map(p=>`${p.x},${p.y}`).join(' ');
    const lastValue=values[values.length-1],firstValue=values[0];
    return tabs+`<div class="weight-summary"><span>Último registro <strong>${fmtN(lastValue)} ${metric.unit}</strong></span><span>Cambio en el período <strong>${lastValue-firstValue>0?'+':''}${fmtN(lastValue-firstValue)} ${metric.unit}</strong></span></div><div class="chart-wrap"><svg viewBox="0 0 650 192" role="img" aria-label="Evolución de ${esc(metric.label)} desde ${esc(fmtDate(first))} hasta ${esc(fmtDate(last))}">
      ${[0,1,2,3,4].map(i=>{const y=y0+(y1-y0)*i/4;return `<line x1="43" x2="624" y1="${y}" y2="${y}" stroke="#33484a" stroke-dasharray="4 6"/><text x="35" y="${y+4}" text-anchor="end" class="chart-axis">${fmtN(max-i*range/4)}</text>`;}).join('')}
      ${data.length>1?`<polyline points="${points}" fill="none" stroke="#80d6ae" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`:''}
      ${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#80d6ae" stroke="#173029" stroke-width="2"><title>${esc(fmtDate(p.r.date))}: ${fmtN(p.r.value)} ${metric.unit}</title></circle>`).join('')}
      <text x="43" y="180" class="chart-axis">${esc(fmtDate(first))}</text><text x="624" y="180" text-anchor="end" class="chart-axis">${esc(fmtDate(last))}</text></svg></div>${periodControls()}<p class="mini-note">Datos orientativos: las medidas y estimaciones corporales pueden fluctuar y, especialmente en básculas domésticas, tener un margen de error.</p>`;
  }
  function periodControls(){return `<div class="filters" aria-label="Período del gráfico de peso">${[[7,'7 días'],[30,'30 días'],[90,'90 días'],[365,'1 año'],[0,'Todo']].map(([days,label])=>`<button class="chip ${period===days?'active':''}" data-action="period" data-period="${days}">${label}</button>`).join('')}</div>`;}
  function renderRecord(r){
    const t=TYPES_BY_ID[r.type];if(!t)return '';
    const quantity=t.input?`${fmtN(r.value)} ${t.unit}`:t.label;
    return `<article class="record-row"><div class="record-icon">${t.icon}</div><div class="record-body"><div class="record-title">${esc(r.type==='project'?`Proyecto · ${projectName(r.projectId)}`:t.label)}</div><div class="record-meta">${esc(fmtDate(r.date))} · ${esc(areaLabel(t.area))}</div>${r.note?`<p class="record-note">${esc(r.note)}</p>`:''}</div><div class="record-side"><span class="pill neutral">${esc(quantity)}</span><div class="record-meta" style="margin-top:7px">+${t.xp} XP</div></div><button class="icon-button" data-action="delete-record" data-id="${esc(r.id)}" title="Eliminar registro" aria-label="Eliminar registro">×</button></article>`;
  }
  function renderGoalsPage(){
    const active=state.goals.filter(g=>!g.done).sort((a,b)=>a.deadline.localeCompare(b.deadline));
    const done=state.goals.filter(g=>g.done).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    return `<div class="page-heading"><div><div class="eyebrow">DÓNDE QUIERES LLEGAR</div><h1>Mis objetivos</h1><p class="subtitle">Metas claras, avances pequeños y una fecha para orientarte, no para castigarte.</p></div><button class="btn btn-primary" data-action="open-goal">＋ Nuevo objetivo</button></div>
      <div class="stats-grid" style="margin-bottom:28px">${statCard('🎯','Objetivos creados',state.goals.length,'Total')}${statCard('🛠️','En curso',active.length,'Sin completar')}${statCard('🏆','Completados',done.length,'En tu historial')}${statCard('🌿','Porcentaje completado',state.goals.length?`${Math.round(done.length/state.goals.length*100)}%`:'—','Sin presión por alcanzar el 100%')}</div>
      ${sectionHeading('En curso',`${active.length} objetivos`)}${active.length?`<div class="goal-list">${active.map(g=>renderGoal(g)).join('')}</div>`:noContent('🎯','No hay objetivos activos. Puedes crear uno ahora.','Crear objetivo','open-goal')}
      ${sectionHeading('Metas completadas',`${done.length} logros`)}${done.length?`<div class="goal-list">${done.map(g=>renderGoal(g)).join('')}</div>`:noContent('🏁','Cuando completes objetivos aparecerán aquí.')}`;
  }
  function renderGoal(g,compact=false){
    const current=goalValue(state,g), auto=linkedTotal(state,g);
    const pct=Math.min(100,Math.round(current/g.target*100));
    const overDue=!g.done&&g.deadline<localDate();
    const dueText=g.done?'Completado':overDue?'Fecha pasada':`Hasta ${fmtDate(g.deadline)}`;
    return `<article class="goal-card"><div class="goal-top"><span class="area-icon" style="height:36px;width:36px;font-size:19px">${AREA_BY_ID[g.area]?.icon||'🎯'}</span><div class="goal-body"><div class="goal-title">${esc(g.title)}</div><div class="goal-area">${esc(areaLabel(g.area))}</div></div><span class="pill ${g.done?'':'neutral'} ${overDue?'warn':''}">${esc(dueText)}</span></div>
      <div class="progress-track" style="margin-top:17px"><div class="progress-fill" style="width:${pct}%"></div></div><div class="goal-foot"><span>${fmtN(current)} / ${fmtN(g.target)} ${esc(g.unit)}</span><span>${pct}%</span></div>
      ${g.recordType?`<p class="record-note">⚡ ${esc(TYPES_BY_ID[g.recordType]?.label||'Actividad')}${g.recordType==='project'&&g.projectId?` · ${esc(projectName(g.projectId))}`:''} · ${fmtN(auto)} ${esc(g.unit)} añadidos automáticamente.</p>`:''}
      ${!compact&&g.note?`<p class="record-note">${esc(g.note)}</p>`:''}<div class="goal-actions">${!g.recordType?`<button class="btn btn-sm" data-action="goal-progress" data-id="${esc(g.id)}" ${g.done?'disabled':''}>＋ Añadir avance</button>`:''}${!g.done?`<button class="btn btn-sm" data-action="goal-link" data-id="${esc(g.id)}">⚡ ${g.recordType?'Cambiar/desvincular':'Vincular actividad'}</button>`:''}<button class="btn btn-sm btn-ghost" data-action="toggle-goal" data-id="${esc(g.id)}" ${g.autoCompleted?'disabled':''}>${g.autoCompleted?'✓ Completado automáticamente':g.done?'↩ Reabrir':'✓ Completar'}</button>${!compact?`<button class="btn btn-sm btn-ghost" data-action="delete-goal" data-id="${esc(g.id)}">Eliminar</button>`:''}</div></article>`;
  }
  function renderHistoryPage(){
    const list=recentRecords().filter(r=>filterArea==='todos'||TYPES_BY_ID[r.type]?.area===filterArea);
    return `<div class="page-heading"><div><div class="eyebrow">EL CAMINO RECORRIDO</div><h1>Historial de avances</h1><p class="subtitle">Cada registro es una pequeña parte de tu historia.</p></div><button class="btn btn-primary" data-action="open-record">＋ Registrar</button></div>
      <div class="filters"><button class="chip ${filterArea==='todos'?'active':''}" data-action="filter" data-area="todos">Todas las áreas</button>${AREAS.map(a=>`<button class="chip ${filterArea===a.id?'active':''}" data-action="filter" data-area="${a.id}">${a.icon} ${a.label}</button>`).join('')}</div>
      ${list.length?`<div class="activity-list">${list.map(renderRecord).join('')}</div>`:noContent('📔','No hay registros en este filtro. Puedes empezar con un pequeño avance.','Registrar avance','open-record')}
      <p class="footer-hint">Tus registros se guardan en este navegador. Exporta una copia desde Ajustes para protegerlos.</p>`;
  }
  function renderAchievementsPage(){
    const complete=unlocked().length;
    return `<div class="page-heading"><div><div class="eyebrow">CELEBRA TU CAMINO</div><h1>Insignias y logros</h1><p class="subtitle">Un reconocimiento a tus acciones, experiencias y proyectos completados.</p></div><span class="pill">✦ ${complete} / ${ACHIEVEMENTS.length}</span></div>
    <div class="callout" style="margin-bottom:26px">Las insignias reconocen hitos orientativos: no son un examen, y los días sin registros no restan puntos.</div>
    <div class="achievement-grid">${ACHIEVEMENTS.map(a=>{const value=a.from(state),done=value>=a.target;return `<article class="achievement ${done?'':'locked'}"><div class="emblem">${done?a.icon:'🔒'}</div><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><div class="count">${done?'✓ Desbloqueado':`${fmtN(value)} / ${fmtN(a.target)}`}</div>${!done?`<div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,value/a.target*100)}%"></div></div>`:''}</article>`;}).join('')}</div>`;
  }
  function renderSettingsPage(){
    return `<div class="page-heading"><div><div class="eyebrow">TU ESPACIO, TUS REGLAS</div><h1>Ajustes y datos</h1><p class="subtitle lead">Todo el contenido personal vive en el almacenamiento de este navegador. No se envía a ningún servidor.</p></div></div>
    <div class="callout" style="margin-bottom:22px"><strong>Importante:</strong> si borras los datos del navegador, usas otro dispositivo o cambias de perfil, este historial puede no estar disponible. Descarga copias JSON periódicamente. Los archivos exportados no están cifrados.</div>
    <div class="settings-layout"><section class="setting-card"><h3>✦ Personalizar saludo</h3><p>Un nombre opcional para la pantalla principal. Se almacena localmente.</p><form id="name-form"><label class="form-label" for="name-input">Cómo prefieres que te salude</label><input id="name-input" class="field" maxlength="35" autocomplete="off" value="${esc(state.settings.name||'')}" placeholder="Mi nombre"><button class="btn btn-primary" style="margin-top:15px" type="submit">Guardar nombre</button></form></section>
      <section class="setting-card"><h3>📦 Copias de seguridad</h3><p>Descarga todos tus registros, objetivos y ajustes, o restaura un archivo de Evoluciona. La restauración sustituye los datos actuales.</p><div class="setting-actions"><button class="btn btn-primary" data-action="export">↓ Exportar JSON</button><button class="btn" data-action="import">↑ Importar JSON</button></div></section>
      <section class="setting-card"><h3>🔐 Datos locales</h3><p>Solicita al navegador que intente conservar el almacenamiento con más persistencia. No garantiza una copia de seguridad y no sincroniza dispositivos.</p><button class="btn" data-action="persist">Solicitar almacenamiento persistente</button><p style="margin-top:13px" id="persistence-status">Estado: no comprobado</p></section>
      <section class="setting-card"><h3>🧹 Empezar de nuevo</h3><p>Elimina todos los registros, logros, objetivos y ajustes guardados en este navegador. Esta acción no se puede deshacer si no tienes una copia.</p><button class="btn btn-danger" data-action="reset">Eliminar todos mis datos</button></section></div>
      <p class="footer-hint">Versión 1.0 · IndexedDB · Funciona sin cuenta ni Supabase · Para uso personal · Recomendado: exportar una copia cada semana.</p>`;
  }
  function recordPicker(areaId=currentArea()){
    const list=areaId?TYPES.filter(t=>t.area===areaId):TYPES;
    const area=AREA_BY_ID[areaId];
    showModal(area?`Registrar · ${area.label}`:'¿Qué has conseguido hoy?',area?'Solo actividades de esta área.':'Elige una actividad de cualquiera de las áreas.',`<div class="quick-grid">${list.map(quickCard).join('')}</div>${areaId==='objetivos'?'<button class="btn btn-sm" data-action="new-project" style="margin-top:15px">＋ Crear nuevo proyecto</button>':''}`);
  }
  function newProjectForm(){
    showModal('Crear proyecto','Escribe el nombre de una app, iniciativa o proyecto que quieras seguir.',`<form id="project-form"><div class="form-group"><label class="form-label" for="project-name">Nombre del proyecto</label><input id="project-name" name="name" required maxlength="90" class="field" placeholder="Ej.: English365, NutriTrack, mi nueva app"></div><div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Crear proyecto</button></div></form>`);
  }
  function recordForm(typeId, selectedProjectId=''){
    const t=TYPES_BY_ID[typeId]||TYPES_BY_ID.gym;
    if(t.id==='project' && !activeProjects().length){newProjectForm();return;}
    showModal(`Registrar · ${t.label}`,'Puedes añadir una nota para recordar por qué fue importante.',`<form id="record-form"><input type="hidden" name="type" value="${t.id}">
    ${t.id==='project'?`<div class="form-group"><label class="form-label" for="record-project">Proyecto</label><select required id="record-project" name="projectId" class="select-field">${activeProjects().map(p=>`<option value="${esc(p.id)}" ${selectedProjectId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>`:''}
    <div class="form-grid"><div class="form-group"><label class="form-label" for="record-date">Fecha</label><input required class="field" id="record-date" type="date" name="date" value="${localDate()}"></div>
    ${t.input?`<div class="form-group"><label class="form-label" for="record-amount">Cantidad (${t.unit})</label><input required class="field" id="record-amount" name="amount" type="number" min="0.01" max="100000" step="any" inputmode="decimal" placeholder="Ej.: ${t.id==='weight'?'68,5':'30'}"></div>`:'<div class="form-group"><label class="form-label">Registro</label><div class="field" style="opacity:.8">1 actividad completada</div></div>'}</div>
    <div class="form-group"><label class="form-label" for="record-note">Detalle o reflexión (opcional)</label><textarea id="record-note" name="note" class="textarea-field" maxlength="1000" placeholder="¿Qué has hecho? ¿Qué has aprendido? ¿Cómo te has sentido?"></textarea></div>
    <div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Guardar avance</button></div></form>`);
  }
  function goalForm(){
    showModal('Crear un objetivo','Divídelo en pequeñas acciones medibles.',`<form id="goal-form"><div class="form-group"><label for="goal-title" class="form-label">Nombre del objetivo</label><input id="goal-title" name="title" class="field" required maxlength="110" placeholder="Ej.: Completar 20 entrenamientos"></div>
    <div class="form-grid"><div class="form-group"><label for="goal-area" class="form-label">Área</label><select id="goal-area" name="area" class="select-field">${AREAS.map(a=>`<option value="${a.id}">${a.icon} ${a.label}</option>`).join('')}</select></div><div class="form-group"><label for="goal-deadline" class="form-label">Fecha objetivo</label><input type="date" required name="deadline" id="goal-deadline" class="field" value="${daysAgo(-30)}"></div></div>
    <div class="form-grid"><div class="form-group"><label for="goal-target" class="form-label">Cantidad que quieres alcanzar</label><input type="number" step="any" min="0.01" max="1000000" required name="target" id="goal-target" class="field" value="10"></div><div class="form-group"><label for="goal-unit" class="form-label">Unidad</label><input name="unit" id="goal-unit" class="field" maxlength="35" required placeholder="sesiones, páginas, horas…"></div></div>
    <div class="form-group"><label for="goal-record-type" class="form-label">Actividad vinculada (opcional)</label><select name="recordType" id="goal-record-type" class="select-field"><option value="">Sin vincular: progreso manual</option>${TYPES.map(t=>`<option value="${t.id}">${t.icon} ${esc(t.label)} (${esc(t.unit)})</option>`).join('')}</select><div id="goal-project-wrap" class="form-group" hidden><label class="form-label" for="goal-project">Proyecto concreto</label><select id="goal-project" name="projectId" class="select-field"><option value="">Todos mis proyectos</option>${state.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div><p class="mini-note">Al vincular, cada registro NUEVO de esa actividad sumará automáticamente.</p></div>
    <div class="form-group"><label for="goal-note" class="form-label">Descripción (opcional)</label><textarea id="goal-note" name="note" maxlength="500" class="textarea-field" placeholder="¿Por qué es importante para ti?"></textarea></div>
    <div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Crear objetivo</button></div></form>`);
  }
  function goalLinkForm(goalId){
    const g=state.goals.find(g=>g.id===goalId);if(!g||g.done)return;
    showModal('Vincular actividad',g.title,`<form id="goal-link-form"><input type="hidden" name="id" value="${esc(g.id)}"><div class="form-group"><label class="form-label" for="link-type">Actividad</label><select name="recordType" id="link-type" class="select-field"><option value="">Sin vincular</option>${TYPES.map(t=>`<option value="${t.id}" ${g.recordType===t.id?'selected':''}>${esc(t.label)} (${esc(t.unit)})</option>`).join('')}</select><div id="link-project-wrap" class="form-group" ${g.recordType==='project'?'':'hidden'}><label class="form-label" for="link-project">Proyecto concreto</label><select id="link-project" name="projectId" class="select-field"><option value="">Todos mis proyectos</option>${state.projects.map(p=>`<option value="${esc(p.id)}" ${g.projectId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div></div><p class="mini-note">Los registros anteriores no se duplicarán. Al desvincular se conserva el avance acumulado.</p><div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Guardar vinculación</button></div></form>`);
  }
  function progressForm(goalId){
    const g=state.goals.find(x=>x.id===goalId);if(!g||g.done||g.recordType)return;
    showModal('Actualizar objetivo',g.title,`<form id="progress-form"><input type="hidden" name="id" value="${esc(g.id)}"><div class="form-group"><label class="form-label" for="progress-amount">Avance adicional (${esc(g.unit)})</label><input id="progress-amount" required class="field" type="number" step="any" min="0.01" max="1000000" name="amount" placeholder="¿Cuánto has avanzado?"></div><p class="record-meta">Ahora: ${fmtN(g.progress)} de ${fmtN(g.target)} ${esc(g.unit)}. Al llegar al objetivo quedará completado automáticamente.</p><div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="submit">Añadir progreso</button></div></form>`);
  }
  function downloadBackup(){
    const payload={app:'Evoluciona',schemaVersion:1,exportedAt:new Date().toISOString(),data:state};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download=`evoluciona-copia-${localDate()}.json`;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    toast('Copia JSON descargada. Guárdala en un lugar seguro.');
  }
  function verifyImported(input){
    if(input?.app!=='Evoluciona'||input?.schemaVersion!==1)throw Error('El archivo no es una copia compatible de Evoluciona v1.');
    const data=input.data;
    if(!data||!Array.isArray(data.records)||!Array.isArray(data.goals))throw Error('La copia no contiene registros válidos.');
    if(data.records.length>100000||data.goals.length>10000)throw Error('La copia contiene demasiados elementos.');
    const recIds=new Set(),goalIds=new Set(),projectIds=new Set();
    const projects=(Array.isArray(data.projects)?data.projects:[]).map(p=>{
      if(typeof p.id!=='string'||!p.id||projectIds.has(p.id)||typeof p.name!=='string'||!p.name.trim())throw Error('Hay proyectos inválidos en la copia.');
      projectIds.add(p.id);
      return {id:p.id.slice(0,100),name:p.name.trim().slice(0,90),archived:Boolean(p.archived),createdAt:typeof p.createdAt==='string'?p.createdAt.slice(0,40):new Date().toISOString()};
    });
    const records=data.records.map(r=>{
      if(typeof r.id!=='string'||!r.id||recIds.has(r.id)||!TYPES_BY_ID[r.type]||!isValidDate(r.date)||!Number.isFinite(r.value)||r.value<=0||r.value>100000)throw Error('Hay registros inválidos en el archivo.');
      recIds.add(r.id);
      return {id:r.id.slice(0,100),type:r.type,date:r.date,value:r.value,projectId:r.type==='project'&&projectIds.has(r.projectId)?r.projectId:null,note:String(r.note||'').slice(0,1000),createdAt:typeof r.createdAt==='string'?r.createdAt.slice(0,40):new Date().toISOString()};
    });
    const goals=data.goals.map(g=>{
      if(typeof g.id!=='string'||!g.id||goalIds.has(g.id)||!AREA_BY_ID[g.area]||!isValidDate(g.deadline)||!Number.isFinite(g.target)||g.target<=0||g.target>1000000||!Number.isFinite(g.progress)||g.progress<0||g.progress>1000000||typeof g.title!=='string'||!g.title.trim()||typeof g.unit!=='string'||!g.unit.trim())throw Error('Hay objetivos inválidos en el archivo.');
      goalIds.add(g.id);
      const recordType=TYPES_BY_ID[g.recordType]&&typeof g.linkedAt==='string'&&Number.isFinite(Date.parse(g.linkedAt))?g.recordType:null;
      return {projectId:recordType==='project'&&projectIds.has(g.projectId)?g.projectId:null,recordType,linkedAt:recordType?g.linkedAt:null,autoCompleted:Boolean(g.autoCompleted),id:g.id.slice(0,100),title:g.title.slice(0,110),area:g.area,target:g.target,unit:g.unit.slice(0,35),progress:Math.min(g.progress,g.target),deadline:g.deadline,done:Boolean(g.done),note:String(g.note||'').slice(0,500),createdAt:typeof g.createdAt==='string'?g.createdAt.slice(0,40):new Date().toISOString(),completedAt:typeof g.completedAt==='string'?g.completedAt.slice(0,40):null};
    });
    return {version:1,settings:{name:String(data.settings?.name||'').slice(0,35)},records,goals,projects};
  }
  function handleClick(e){
    const el=e.target.closest('[data-action]');if(!el)return;
    const action=el.dataset.action;
    if(action==='open-record'){recordPicker();return;}
    if(action==='go-home'){location.hash='#inicio';return;}
    if(action==='area-open'){location.hash=`#area/${el.dataset.area}`;return;}
    if(action==='new-project'){newProjectForm();return;}
    if(action==='project-detail'){recordForm('project',el.dataset.id);return;}
    if(action==='project-today'){
      const id=el.dataset.id,p=activeProjects().find(x=>x.id===id);if(!p)return;
      if(state.records.some(r=>r.type==='project'&&r.projectId===id&&r.date===localDate())){toast('Ese proyecto ya está registrado hoy.');return;}
      transact(s=>s.records.push({id:newId(),type:'project',projectId:id,date:localDate(),value:1,note:'',createdAt:new Date().toISOString()}),`Día de trabajo registrado en ${p.name}`);return;
    }
    if(action==='restore-project'){
      const id=el.dataset.id;
      transact(s=>{const x=s.projects.find(z=>z.id===id);if(x)x.archived=false;},'Proyecto reactivado');return;
    }
    if(action==='archive-project'){
      const id=el.dataset.id,p=activeProjects().find(x=>x.id===id);if(!p||!confirm(`¿Archivar ${p.name}? Conservarás sus registros y sus logros.`))return;
      transact(s=>{const x=s.projects.find(z=>z.id===id);if(x)x.archived=true;},'Proyecto archivado');return;
    }
    if(action==='close-modal'){closeModal();return;}
    if(action==='new-record'){recordForm(el.dataset.type);return;}
    if(action==='new-weight'){recordForm('weight');return;}
    if(action==='new-body-metric'){recordForm(bodyMetric);return;}
    if(action==='body-metric'){bodyMetric=el.dataset.type;render();return;}
    if(action==='filter'){filterArea=el.dataset.area;render();return;}
    if(action==='period'){period=Number(el.dataset.period);render();return;}
    if(action==='open-goal'){goalForm();return;}
    if(action==='goal-progress'){progressForm(el.dataset.id);return;}
    if(action==='goal-link'){goalLinkForm(el.dataset.id);return;}
    if(action==='toggle-goal'){
      const g=state.goals.find(x=>x.id===el.dataset.id);if(!g)return;
      transact(s=>{const it=s.goals.find(x=>x.id===g.id);it.done=!it.done;it.autoCompleted=false;it.completedAt=it.done?new Date().toISOString():null;},g.done?'Objetivo reabierto':'¡Objetivo completado!');return;
    }
    if(action==='delete-record'){
      if(!confirm('¿Eliminar este registro? Los puntos y logros se recalcularán.'))return;
      transact(s=>{s.records=s.records.filter(x=>x.id!==el.dataset.id);},'Registro eliminado');return;
    }
    if(action==='delete-goal'){
      if(!confirm('¿Eliminar este objetivo? La acción no se puede deshacer.'))return;
      transact(s=>{s.goals=s.goals.filter(x=>x.id!==el.dataset.id);},'Objetivo eliminado');return;
    }
    if(action==='export'){downloadBackup();return;}
    if(action==='import'){$('#import-file').click();return;}
    if(action==='persist'){
      if(!navigator.storage?.persist){toast('Este navegador no ofrece esta opción. Exporta copias JSON.');return;}
      navigator.storage.persist().then(x=>{toast(x?'Almacenamiento persistente concedido':'El navegador no ha concedido persistencia. Haz copias JSON.');showPersistenceStatus();}).catch(()=>toast('No se pudo solicitar persistencia.'));return;
    }
    if(action==='reset'){
      if(!confirm('¿Seguro que quieres eliminar TODOS los datos de Evoluciona de este navegador?'))return;
      if(!confirm('Última confirmación: se perderán todos los registros y objetivos sin copia de seguridad.'))return;
      transact(s=>{Object.assign(s,defaultState());},'Datos locales eliminados');return;
    }
  }
  async function handleSubmit(e){
    if(!['record-form','goal-form','goal-link-form','progress-form','name-form','project-form'].includes(e.target.getAttribute('id')))return;
    e.preventDefault();
    const form=e.target, fields=new FormData(form);
    if(form.getAttribute('id')==='project-form'){
      const name=String(fields.get('name')||'').trim();if(!name){toast('Escribe el nombre de tu proyecto.');return;}
      if(state.projects.some(p=>p.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'))){toast('Ya tienes un proyecto con ese nombre.');return;}
      const ok=await transact(s=>s.projects.push({id:newId(),name:name.slice(0,90),archived:false,createdAt:new Date().toISOString()}),'Proyecto creado');
      if(ok){closeModal();location.hash='#area/objetivos';}return;
    }
    if(form.getAttribute('id')==='record-form'){
      const type=String(fields.get('type'));
      const t=TYPES_BY_ID[type],date=String(fields.get('date'));
      const amount=t?.input?Number(String(fields.get('amount')).replace(',','.')):1;
      if(!t||!isValidDate(date)||!Number.isFinite(amount)||amount<=0||amount>100000){toast('Revisa la fecha y la cantidad.');return;}
      const projectId=t.id==='project'?String(fields.get('projectId')||''):null;
      if(t.id==='project'&&!activeProjects().some(p=>p.id===projectId)){toast('Selecciona un proyecto válido.');return;}
      const existing=t.id==='project'?state.records.find(r=>r.type==='project'&&r.projectId===projectId&&r.date===date):null;
      if(existing){
        const note=String(fields.get('note')||'').trim().slice(0,1000);
        if(!note){toast('Ese proyecto ya está registrado en esa fecha. Añade una nota para completar su detalle.');return;}
        const ok=await transact(s=>{const r=s.records.find(r=>r.id===existing.id);if(r)r.note=note;},'Detalle del proyecto actualizado sin duplicar la sesión');
        if(ok)closeModal();return;
      }
      const result=await transact(s=>s.records.push({id:newId(),type,date,value:amount,projectId,note:String(fields.get('note')||'').trim().slice(0,1000),createdAt:new Date().toISOString()}),'Avance registrado. ¡Buen trabajo!');
      if(result)closeModal();return;
    }
    if(form.getAttribute('id')==='goal-form'){
      const title=String(fields.get('title')||'').trim(),recordType=String(fields.get('recordType')||'');
      const type=TYPES_BY_ID[recordType],area=type?.area||String(fields.get('area'));
      const target=Number(fields.get('target')),unit=type?.unit||String(fields.get('unit')||'').trim(),deadline=String(fields.get('deadline'));
      if(!title||!AREA_BY_ID[area]||!isValidDate(deadline)||!unit||!Number.isFinite(target)||target<=0||target>1000000){toast('Revisa los campos del objetivo.');return;}
      const projectId=type?.id==='project'&&state.projects.some(p=>p.id===String(fields.get('projectId')))?String(fields.get('projectId')):null;
      const result=await transact(s=>s.goals.push({id:newId(),title:title.slice(0,110),area,target,unit:unit.slice(0,35),progress:0,deadline,done:false,note:String(fields.get('note')||'').trim().slice(0,500),createdAt:new Date().toISOString(),completedAt:null,recordType:type?.id||null,projectId,linkedAt:type?new Date().toISOString():null,autoCompleted:false}),'Objetivo creado');
      if(result){closeModal();location.hash='#objetivos';}return;
    }
    if(form.getAttribute('id')==='goal-link-form'){
      const id=String(fields.get('id')), t=TYPES_BY_ID[String(fields.get('recordType')||'')];
      const projectId=t?.id==='project'&&state.projects.some(p=>p.id===String(fields.get('projectId')))?String(fields.get('projectId')):null;
      const g=state.goals.find(g=>g.id===id);if(!g||g.done)return;
      if(t && g.unit!==t.unit && goalValue(state,g)>0 && !confirm(`La unidad cambiará de ${g.unit} a ${t.unit} conservando el número de progreso previo. ¿Continuar?`))return;
      const ok=await transact(s=>{const x=s.goals.find(g=>g.id===id);if(x.recordType!==(t?.id||null)||x.projectId!==projectId){
        x.progress=goalValue(s,x);x.recordType=t?.id||null;x.projectId=projectId;x.linkedAt=t?new Date().toISOString():null;
        if(t){x.unit=t.unit;x.area=t.area;}
      }},'Vinculación actualizada');if(ok)closeModal();return;
    }
    if(form.getAttribute('id')==='progress-form'){
      const id=String(fields.get('id')),value=Number(fields.get('amount'));
      if(!Number.isFinite(value)||value<=0||value>1000000){toast('Introduce una cantidad válida.');return;}
      const goal=state.goals.find(g=>g.id===id);if(!goal||goal.done||goal.recordType)return;
      const result=await transact(s=>{const g=s.goals.find(g=>g.id===id);g.progress=Math.min(g.target,g.progress+value);},goal.progress+value>=goal.target?'¡Objetivo alcanzado!':'Progreso actualizado');
      if(result)closeModal();return;
    }
    if(form.getAttribute('id')==='name-form'){
      const value=String(fields.get('name')||'').trim().slice(0,35);
      await transact(s=>{s.settings.name=value;},'Nombre actualizado');return;
    }
  }
  async function showPersistenceStatus(){
    if(!$('#persistence-status'))return;
    const persistent=await navigator.storage?.persisted?.().catch(()=>null);
    const node=$('#persistence-status');
    if(node)node.textContent=`Estado: ${persistent===true?'persistente':persistent===false?'no persistente':'no disponible'}.`;
  }
  async function importFile(e){
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>5*1024*1024){alert('El archivo supera el límite de 5 MB.');return;}
    try{
      const parsed=JSON.parse(await file.text());const incoming=verifyImported(parsed);
      if(!confirm(`La copia contiene ${incoming.records.length} registros y ${incoming.goals.length} objetivos. ¿Sustituir TODOS los datos locales actuales por esta copia?`))return;
      const ok=await transact(s=>Object.assign(s,incoming),'Copia restaurada correctamente');
      if(ok)location.hash='#inicio';
    }catch(err){alert(`No se pudo importar: ${err.message}`);}
  }
  async function main(){
    $('#today-label').textContent=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
    document.addEventListener('click',handleClick);
    document.addEventListener('submit',handleSubmit);
    document.addEventListener('change',e=>{
      if(e.target.id==='goal-record-type'){
        const t=TYPES_BY_ID[e.target.value],u=$('#goal-unit'),a=$('#goal-area'),wrap=$('#goal-project-wrap');
        if(t){u.value=t.unit;u.readOnly=true;a.value=t.area;a.disabled=true;}
        else{u.readOnly=false;a.disabled=false;}
        if(wrap)wrap.hidden=t?.id!=='project';
      }
      if(e.target.id==='link-type'){const wrap=$('#link-project-wrap');if(wrap)wrap.hidden=e.target.value!=='project';}
    });
    window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
    modal.addEventListener('click',(e)=>{if(e.target===modal)closeModal();});
    document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&modal.innerHTML)closeModal();});
    $('#import-file').addEventListener('change',importFile);
    try{
      if(!('indexedDB' in window))throw Error('Tu navegador no dispone de IndexedDB.');
      database=await openDB();state=verifyLocalState(await readDB());render();
      if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
      showPersistenceStatus();
    }catch(err){
      console.error('Evoluciona no se pudo iniciar',err);
      root.innerHTML=`<div class="callout"><h2>No se puede acceder al almacenamiento local</h2><p style="margin-top:10px">${esc(err.message)}</p><p style="margin-top:10px">Comprueba si utilizas navegación privada o si el navegador tiene el almacenamiento bloqueado. No se ha guardado ningún dato.</p></div>`;
    }
  }
  function verifyLocalState(candidate){
    if(candidate?.version!==1||!Array.isArray(candidate.records)||!Array.isArray(candidate.goals))throw Error('El formato de datos local no es compatible. Evita borrar nada y recupera una copia si la tienes.');
    return {version:1,settings:{name:String(candidate.settings?.name||'').slice(0,35)},records:candidate.records,goals:candidate.goals,projects:Array.isArray(candidate.projects)?candidate.projects:[]};
  }
  main();
})();
