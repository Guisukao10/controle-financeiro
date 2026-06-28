(function(){
'use strict';

/* ── Areas config ── */
var AREAS = [
  { id:'fin', label:'Financeiro',      color:'#15803D', bg:'#F0FDF4' },
  { id:'sau', label:'Saúde',           color:'#E11D48', bg:'#FFF1F2' },
  { id:'apr', label:'Aprendizado',     color:'#1D4ED8', bg:'#EFF6FF' },
  { id:'rel', label:'Relacionamentos', color:'#9333EA', bg:'#FDF4FF' },
  { id:'pes', label:'Pessoal',         color:'#EA580C', bg:'#FFF7ED' },
  { id:'pro', label:'Projetos',        color:'#0891B2', bg:'#F0FDFA' }
];

var PERSONS = [
  { id:'gui',   label:'Gui',   color:'#1D4ED8', bg:'#EFF6FF', icon:'👤' },
  { id:'giu',   label:'Giu',   color:'#9333EA', bg:'#FDF4FF', icon:'👤' },
  { id:'ambos', label:'Ambos', color:'#15803D', bg:'#F0FDF4', icon:'👥' }
];

var HORIZONS = [
  { id:'decada', icon:'🔭', label:'10 Anos',  title:'Visão de 10 Anos',   desc:'Onde você quer estar daqui a 10 anos?'  },
  { id:'anual',  icon:'📅', label:'Anual',    title:'Metas Anuais',       desc:'O que você vai conquistar este ano?'    },
  { id:'mensal', icon:'🗓', label:'Mensal',   title:'Compromissos do Mês',desc:'Foco e prioridades deste mês'           },
  { id:'semanal',icon:'📋', label:'Semanal',  title:'Semana em Foco',     desc:'Suas prioridades desta semana'         },
  { id:'diario', icon:'✅', label:'Hoje',     title:'Plano do Dia',       desc:'O que você vai fazer hoje?'            }
];

/* ── State ── */
var currentHz    = 'decada';
var editingId    = null;
var allGoals     = [];
var allTasks     = [];
var allGoalLogs  = [];
var todayChecks  = {};
var personFilter = 'all';

function todayKey(){ var n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); }
function uid()     { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function areaInfo(id){ return AREAS.find(function(a){return a.id===id;})||AREAS[4]; }
function hzInfo(id)  { return HORIZONS.find(function(h){return h.id===id;})||HORIZONS[0]; }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function brl(v){ return (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function formatToday(){ return new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}); }

/* ── Loading state ── */
function setLoading(msg) {
  document.getElementById('mainPanel').innerHTML =
    '<div style="text-align:center;padding:40px;color:#bbb;font-size:.82rem">'+
    '<div style="font-size:1.4rem;margin-bottom:10px">⏳</div>'+(msg||'Carregando...')+'</div>';
}
function showError(msg) {
  document.getElementById('mainPanel').innerHTML =
    '<div style="text-align:center;padding:40px;color:#B91C1C;font-size:.82rem">'+
    '<div style="font-size:1.4rem;margin-bottom:10px">⚠️</div>'+msg+'</div>';
}

/* ── Goal log helpers ── */
function getLogsForPerson(goalId, person) {
  return allGoalLogs.filter(function(l){ return l.goal_id===goalId && l.person===person; });
}
function isCheckedInToday(goalId, person) {
  return allGoalLogs.some(function(l){ return l.goal_id===goalId && l.person===person && l.date===todayKey(); });
}
function paceInfo(count, targetCount, deadline) {
  if (!deadline) return null;
  var months = {Jan:0,Fev:1,Mar:2,Abr:3,Mai:4,Jun:5,Jul:6,Ago:7,Set:8,Out:9,Nov:10,Dez:11};
  var parts = deadline.split('/');
  if (parts.length!==2) return null;
  var m = months[parts[0]], y = parseInt(parts[1]);
  if (m===undefined || !y) return null;
  var end = new Date(y, m+1, 0);
  var daysLeft = Math.max(0, Math.floor((end - new Date()) / 86400000));
  var remaining = targetCount - count;
  if (remaining <= 0) return { text:'✅ Meta atingida!', ok:true };
  if (daysLeft === 0) return { text:'⚠️ Prazo vencido', ok:false };
  var perWeek = Math.ceil(remaining / daysLeft * 7);
  var ok = perWeek <= 5;
  return { text: '~'+perWeek+' dia'+(perWeek!==1?'s':'')+'/semana ('+daysLeft+' dias restantes)', ok:ok };
}

/* ── Data loading ── */
function loadAll() {
  setLoading('Carregando metas...');
  return Promise.all([
    db.from('goals').order('created_at',{ascending:true}).select('*'),
    db.from('daily_tasks').eq('active','true').order('sort_order',{ascending:true}).select('*'),
    db.from('daily_checks').eq('date', todayKey()).select('*'),
    db.from('goal_logs').select('*')
  ]).then(function(results){
    allGoals    = results[0] || [];
    allTasks    = results[1] || [];
    allGoalLogs = results[3] || [];
    var checks  = results[2] || [];
    todayChecks = {};
    checks.forEach(function(c){ if(c.done) todayChecks[c.task_id]=true; });
    render();
  }).catch(function(e){
    showError('Erro ao conectar com Supabase:<br>'+e.message);
  });
}

/* ── Financial connection ── */
function readFinancialData() {
  var ganhoOvr = parseFloat(localStorage.getItem('cf_sim_ganho_v1')||'0')||0;
  return { ganho: ganhoOvr };
}

/* ── Render ── */
function render() {
  renderHorizonTabs();
  renderConnectionBar();
  renderOverview();
  renderCascade();
  if (currentHz === 'diario') renderDailyPanel();
  else renderGoalsPanel();
}

function renderHorizonTabs() {
  document.getElementById('horizonTabs').innerHTML = HORIZONS.map(function(h){
    return '<button class="hz-btn'+(h.id===currentHz?' on':'')+'" onclick="setHz(\''+h.id+'\')">'+
      '<span class="hz-icon">'+h.icon+'</span><span class="hz-label">'+h.label+'</span></button>';
  }).join('');
}

function renderConnectionBar() {
  var fin   = readFinancialData();
  var cur   = allGoals.filter(function(g){ return g.hz===currentHz; });
  var done  = cur.filter(function(g){ return g.progress>=100; }).length;
  var annual= allGoals.filter(function(g){ return g.hz==='anual'; });
  var annDone=annual.filter(function(g){ return g.progress>=100; }).length;

  document.getElementById('connBar').innerHTML =
    conn('💰','Financeiro',fin.ganho>0?brl(fin.ganho)+'/mês':'—',fin.ganho>0?'Receita planejada':'Configure no módulo financeiro','#15803D')+
    conn('🎯','Metas Ativas',cur.length,'no horizonte atual','#1D4ED8')+
    conn('✅','Concluídas',done+' / '+cur.length,'horizonte atual','#9333EA')+
    conn('📅','Metas Anuais',annual.length,annDone+' concluídas','#EA580C');

  document.getElementById('personBar').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;">'+
    PERSONS.map(function(p){
      var pg   = allGoals.filter(function(g){return (g.person||'ambos')===p.id;});
      var pdone= pg.filter(function(g){return g.progress>=100;}).length;
      var isSel= personFilter===p.id;
      return '<div class="conn-card" onclick="setPersonFilter(\''+p.id+'\')" style="cursor:pointer;'+
        'border:2px solid '+(isSel?p.color:'#eaeaea')+';'+
        'background:'+(isSel?p.bg:'#fff')+';'+
        'transition:all .15s;'+
        'box-shadow:'+(isSel?'0 2px 8px rgba(0,0,0,.08)':'none')+';'+
        'transform:'+(isSel?'translateY(-1px)':'none')+';">'+
        '<div style="width:10px;height:10px;border-radius:50%;background:'+p.color+';flex-shrink:0"></div>'+
        '<div>'+
          '<div style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:'+(isSel?p.color:'#bbb')+';margin-bottom:2px">'+p.icon+' '+p.label+'</div>'+
          '<div style="font-size:1rem;font-weight:800;color:#1a1a1a">'+pg.length+' <span style="font-size:.72rem;font-weight:600;color:#aaa">meta'+(pg.length!==1?'s':'')+'</span></div>'+
          '<div style="font-size:.63rem;color:#aaa;margin-top:1px">'+(pg.length-pdone)+' ativas · '+pdone+' concluídas</div>'+
        '</div>'+
      '</div>';
    }).join('')+
    '</div>';
}
function conn(icon,lbl,val,sub,color){
  return '<div class="conn-card"><div class="conn-dot" style="background:'+color+'"></div>'+
    '<div><div class="conn-lbl">'+icon+' '+lbl+'</div><div class="conn-val">'+val+'</div><div class="conn-sub">'+sub+'</div></div></div>';
}

function renderOverview(){
  document.getElementById('overviewGrid').innerHTML = HORIZONS.map(function(h){
    var t=allGoals.filter(function(g){return g.hz===h.id;}).length;
    var d=allGoals.filter(function(g){return g.hz===h.id&&g.progress>=100;}).length;
    var p=t>0?Math.round(d/t*100):0;
    return '<div class="ov-card"><div class="ov-num">'+t+'</div><div class="ov-lbl">'+h.icon+' '+h.label+'</div>'+
      '<div class="ov-bar"><div class="ov-bar-fill" style="width:'+p+'%"></div></div></div>';
  }).join('');
}

function renderCascade(){
  document.getElementById('cascade').innerHTML =
    '<div class="cascade-title">Hierarquia de metas — do macro ao micro</div>'+
    '<div class="cascade-row">'+HORIZONS.map(function(h,i){
      return (i>0?'<span class="cascade-arrow">→</span>':'')+
        '<span class="cascade-step'+(h.id===currentHz?' cur':'')+'" onclick="setHz(\''+h.id+'\')">'+h.icon+' '+h.label+'</span>';
    }).join('')+'</div>';
}

function renderGoalsPanel() {
  var hz    = hzInfo(currentHz);
  var goals = allGoals.filter(function(g){ return g.hz===currentHz; });
  if(personFilter!=='all') goals=goals.filter(function(g){return (g.person||'ambos')===personFilter;});
  var filterBadge = personFilter!=='all'
    ? (function(){ var p=PERSONS.find(function(x){return x.id===personFilter;}); return p?
        ' <span style="font-size:.7rem;padding:2px 8px;border-radius:9999px;background:'+p.bg+';color:'+p.color+';font-weight:700;vertical-align:middle">'+p.icon+' '+p.label+'</span>':''; })()
    : '';
  var parentHzIdx = HORIZONS.findIndex(function(h){return h.id===currentHz;});
  var parentHz    = parentHzIdx>0?HORIZONS[parentHzIdx-1]:null;

  var header = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">'+
    '<div><div style="font-size:1rem;font-weight:700">'+hz.icon+' '+hz.title+filterBadge+'</div>'+
    '<div style="font-size:.73rem;color:#aaa;margin-top:2px">'+hz.desc+'</div></div>'+
    '<button class="add-goal-btn" style="width:auto;padding:8px 16px" onclick="openModal(null)">+ Adicionar meta</button></div>';

  var cards = goals.length === 0
    ? '<div class="no-goals">'+hz.icon+'<br><br>Nenhuma meta em <strong>'+hz.title+'</strong>.<br>'+
      '<button class="add-goal-btn" style="max-width:300px;margin:14px auto 0" onclick="openModal(null)">+ Criar primeira meta</button></div>'
    : '<div class="goals-grid">'+goals.slice().sort(function(a,b){
        if(a.progress>=100&&b.progress<100) return 1;
        if(b.progress>=100&&a.progress<100) return -1;
        return 0;
      }).map(function(g){ return goalCard(g); }).join('')+'</div>';

  document.getElementById('mainPanel').innerHTML = header + cards;
}

function goalCardCount(g) {
  var area      = areaInfo(g.area||'pes');
  var personInfo= PERSONS.find(function(p){return p.id===(g.person||'ambos');})||PERSONS[2];
  var trackers  = g.person==='ambos' ? ['gui','giu'] : [g.person||'gui'];

  var rows = trackers.map(function(pk){
    var pi      = PERSONS.find(function(p){return p.id===pk;})||PERSONS[0];
    var count   = getLogsForPerson(g.id, pk).length;
    var pct     = g.target_count>0 ? Math.min(100,Math.round(count/g.target_count*100)) : 0;
    var done    = isCheckedInToday(g.id, pk);
    var pace    = paceInfo(count, g.target_count, g.deadline);

    return '<div style="margin-bottom:10px;padding:10px;background:#fafafa;border-radius:8px;border:1px solid #f0f0f0;">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">'+
        '<span style="font-size:.72rem;font-weight:700;color:'+pi.color+'">'+pi.icon+' '+pi.label+'</span>'+
        '<span style="font-size:.78rem;font-weight:800;color:#1a1a1a">'+count+' <span style="font-size:.65rem;font-weight:500;color:#aaa">/ '+g.target_count+' dias</span></span>'+
      '</div>'+
      '<div style="background:#ebebeb;border-radius:5px;height:7px;overflow:hidden;margin-bottom:6px;">'+
        '<div style="height:100%;border-radius:5px;background:'+pi.color+';width:'+pct+'%;transition:width .4s;"></div>'+
      '</div>'+
      (pace?'<div style="font-size:.63rem;color:'+(pace.ok?'#15803D':'#EA580C')+';margin-bottom:6px;">'+pace.text+'</div>':'')+
      '<button onclick="checkIn(\''+g.id+'\',\''+pk+'\')" style="'+
        'width:100%;padding:7px;border-radius:7px;'+
        'border:1.5px solid '+(done?pi.color:'#e5e7eb')+';'+
        'background:'+(done?pi.bg:'#fff')+';color:'+(done?pi.color:'#888')+';'+
        'font-family:inherit;font-size:.75rem;font-weight:700;cursor:pointer;transition:all .15s;">'+
        (done?'✓ '+pi.label+' registrou hoje — clique para desfazer':'+ Registrar dia ('+pi.label+')')+
      '</button>'+
    '</div>';
  }).join('');

  var mod = AREA_MODULES ? (AREA_MODULES[g.area]||null) : null;
  return '<div class="goal-row goal-row-count" id="gc-'+g.id+'">'+
    '<div class="gr-head">'+
      '<div class="gr-badges">'+
        '<span class="gr-area" style="background:'+area.bg+';color:'+area.color+'">'+
          '<span class="gr-area-dot" style="background:'+area.color+'"></span>'+area.label+
        '</span>'+
        '<span class="gr-person" style="background:'+personInfo.bg+';color:'+personInfo.color+'">'+personInfo.icon+' '+personInfo.label+'</span>'+
      '</div>'+
      '<div class="gr-right">'+
        (mod?'<a class="gr-mod-link" href="'+mod.url+'" title="Ir para '+mod.label+'">'+mod.icon+' '+mod.label+' →</a>':'')+
      '</div>'+
    '</div>'+
    '<div class="gr-title">'+esc(g.title)+'</div>'+
    (g.description?'<div class="gr-desc">'+esc(g.description)+'</div>':'')+
    '<div class="goal-row-count gr-tracker">'+rows+'</div>'+
    '<div class="gr-footer" style="margin-top:8px;">'+
      '<div class="gr-meta">'+(g.deadline?'<span class="gr-date">📅 '+esc(g.deadline)+'</span>':'')+'</div>'+
      '<div class="gc-actions">'+
        '<button class="gc-btn" onclick="openModal(\''+g.id+'\')">✏ Editar</button>'+
        '<button class="gc-btn del-btn" onclick="deleteGoal(\''+g.id+'\')">🗑</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}

/* ── Module links per area ── */
var AREA_MODULES = {
  fin:{url:'../financeiro/',icon:'💰',label:'Financeiro'},
  sau:{url:'../saude/',     icon:'❤️',label:'Saúde'},
  hab:{url:'../habitos/',  icon:'✅',label:'Hábitos'},
  nut:{url:'../nutricao/', icon:'🥗',label:'Nutrição'}
};

function goalCard(g) {
  if(g.target_count>0) return goalCardCount(g);
  var area   = areaInfo(g.area||'pes');
  var pi     = PERSONS.find(function(p){return p.id===(g.person||'ambos');})||PERSONS[2];
  var pct    = Math.min(g.progress||0,100);
  var done   = pct>=100;
  var parent = g.parent_id?allGoals.find(function(x){return x.id===g.parent_id;}):null;
  var children=allGoals.filter(function(x){return x.parent_id===g.id;});
  var mod    = AREA_MODULES[g.area]||null;
  var statusCls = done?'done':pct>=80?'close':pct>0?'active':'pending';
  var progColor = done?'#15803D':pct>=70?'#EF9F27':'#1D4ED8';

  return '<div class="goal-row '+statusCls+'" id="gc-'+g.id+'">'+
    '<div class="gr-head">'+
      '<div class="gr-badges">'+
        '<span class="gr-area" style="background:'+area.bg+';color:'+area.color+'">'+
          '<span class="gr-area-dot" style="background:'+area.color+'"></span>'+area.label+
        '</span>'+
        '<span class="gr-person" style="background:'+pi.bg+';color:'+pi.color+'">'+pi.icon+' '+pi.label+'</span>'+
      '</div>'+
      '<div class="gr-right">'+
        (mod?'<a class="gr-mod-link" href="'+mod.url+'" title="Ir para '+mod.label+'">'+mod.icon+' '+mod.label+' →</a>':'')+
        (done?'<span class="gr-done-badge">✓ Concluída</span>':'')+
      '</div>'+
    '</div>'+
    '<div class="gr-title">'+esc(g.title)+'</div>'+
    (g.description?'<div class="gr-desc">'+esc(g.description)+'</div>':'')+
    (parent?'<div class="gr-parent">↗ '+esc(parent.title)+'</div>':'')+
    '<div class="gr-progress">'+
      '<div class="gr-prog-track"><div class="gr-prog-fill" style="width:'+pct+'%;background:'+progColor+'"></div></div>'+
      '<span class="gr-prog-pct" style="color:'+progColor+'">'+pct+'%</span>'+
    '</div>'+
    '<div class="gr-footer">'+
      '<div class="gr-meta">'+
        (g.deadline?'<span class="gr-date">📅 '+esc(g.deadline)+'</span>':'')+
        (g.target?'<span class="gr-tag">🎯 '+esc(g.target)+'</span>':'')+
        (children.length?'<span class="gr-tag gr-linked">'+children.length+' sub-meta'+(children.length>1?'s':'')+'</span>':'')+
      '</div>'+
      '<div class="gc-actions">'+
        (!done?'<button class="gc-btn done-btn" onclick="markDone(\''+g.id+'\')">✓ Concluir</button>':'')+
        (pct<100&&pct>0?'<button class="gc-btn" onclick="quickProgress(\''+g.id+'\')">+10%</button>':'')+
        '<button class="gc-btn" onclick="openModal(\''+g.id+'\')">✏ Editar</button>'+
        '<button class="gc-btn del-btn" onclick="deleteGoal(\''+g.id+'\')">🗑</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}

/* ── Celebration animation ── */
function celebrate(areaId) {
  var EMOJIS={
    fin:['💰','💵','🤑','💸','💎','✨'],
    sau:['❤️','💪','🔥','🏋️','⚡','🏆'],
    apr:['📚','🎓','💡','⭐','🧠','✨'],
    rel:['❤️','🥰','💑','✨','🌹','💕'],
    pes:['⭐','🌟','🎯','✨','🏆','🎉'],
    pro:['🎉','🚀','✅','💻','🏆','⚡']
  };
  var items=EMOJIS[areaId]||['🎉','⭐','✅','✨','🏆'];
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999;';
  document.body.appendChild(overlay);
  for(var i=0;i<45;i++){
    (function(){
      var el=document.createElement('div');
      el.textContent=items[Math.floor(Math.random()*items.length)];
      var sx=window.innerWidth*(0.05+Math.random()*0.9);
      var sy=window.innerHeight*0.65;
      var vx=(Math.random()-0.5)*9, vy=-(7+Math.random()*11);
      var size=1.3+Math.random()*1.6, rot=0, rotS=(Math.random()-0.5)*14;
      var op=1, g=0.38, px=sx, py=sy;
      el.style.cssText='position:absolute;font-size:'+size+'rem;left:'+px+'px;top:'+py+'px;user-select:none;will-change:transform,opacity;';
      overlay.appendChild(el);
      setTimeout(function(){
        (function tick(){
          vy+=g; px+=vx; py+=vy; rot+=rotS; op-=0.011;
          el.style.transform='translate('+(px-sx)+'px,'+(py-sy)+'px) rotate('+rot+'deg)';
          el.style.opacity=Math.max(0,op);
          if(op>0) requestAnimationFrame(tick); else el.remove();
        })();
      },Math.random()*700);
    })();
  }
  setTimeout(function(){if(overlay.parentNode)overlay.remove();},5000);
}

/* ── Daily panel ── */
function renderDailyPanel() {
  var weeklyGoals = allGoals.filter(function(g){return g.hz==='semanal'&&g.progress<100;});
  var done   = allTasks.filter(function(t){return todayChecks[t.id];}).length;
  var total  = allTasks.length;
  var pct    = total>0?Math.round(done/total*100):0;

  var header = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">'+
    '<div><div style="font-size:1rem;font-weight:700">✅ Plano do Dia</div>'+
    '<div style="font-size:.73rem;color:#aaa;margin-top:2px">'+formatToday()+'</div></div>'+
    '<button class="add-goal-btn" style="width:auto;padding:8px 16px" onclick="openDailyModal()">+ Adicionar tarefa</button></div>';

  var progress = total>0?'<div style="background:#fff;border:1px solid #eaeaea;border-radius:10px;padding:14px;margin-bottom:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
      '<span style="font-size:.78rem;font-weight:600;color:#555">Progresso de hoje</span>'+
      '<span style="font-size:.88rem;font-weight:800;color:'+(pct>=100?'#15803D':pct>=50?'#EF9F27':'#1D4ED8')+'">'+done+'/'+total+' — '+pct+'%</span></div>'+
    '<div style="background:#f0f0f0;border-radius:5px;height:10px;overflow:hidden">'+
      '<div style="height:100%;border-radius:5px;background:'+(pct>=100?'#15803D':pct>=50?'#EF9F27':'#1D4ED8')+';width:'+pct+'%;transition:width .5s"></div></div>'+
    (pct>=100?'<div style="text-align:center;margin-top:8px;font-size:.75rem;font-weight:600;color:#15803D">🎉 Missão cumprida hoje!</div>':'')+
  '</div>':'';

  var tasksHtml='<div class="today-section"><div class="ts-header">Tarefas do dia <span style="font-size:.7rem;font-weight:600;color:#1D4ED8">'+done+'/'+total+'</span></div>';
  if(!allTasks.length){
    tasksHtml+='<div class="no-goals" style="padding:12px">Nenhuma tarefa. Clique em + para adicionar.</div>';
  } else {
    allTasks.forEach(function(t){
      var isDone=!!todayChecks[t.id];
      var area=areaInfo(t.area||'pes');
      tasksHtml+='<div class="task-item">'+
        '<div class="task-check'+(isDone?' checked':'')+'" onclick="toggleDaily(\''+t.id+'\')">'+( isDone?'✓':'')+'</div>'+
        '<div style="flex:1"><div class="task-text'+(isDone?' checked':'')+'">'+esc(t.title)+'</div>'+
        (t.note?'<div style="font-size:.67rem;color:#bbb;margin-top:2px">'+esc(t.note)+'</div>':'')+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:5px">'+
          '<span class="task-area" style="background:'+area.bg+';color:'+area.color+'">'+area.label+'</span>'+
          '<button onclick="deleteTask(\''+t.id+'\')" style="border:none;background:none;color:#ddd;cursor:pointer;font-size:.8rem;padding:2px">×</button>'+
        '</div></div>';
    });
  }
  tasksHtml+='</div>';

  var weekHtml='<div class="today-section"><div class="ts-header">Metas da semana</div>';
  if(!weeklyGoals.length){
    weekHtml+='<div class="no-goals" style="padding:12px">Nenhuma meta semanal ativa.<br><a href="#" onclick="setHz(\'semanal\');return false" style="color:#1D4ED8;font-size:.75rem">Definir metas →</a></div>';
  } else {
    weeklyGoals.slice(0,5).forEach(function(g){
      var area=areaInfo(g.area||'fin');
      weekHtml+='<div class="task-item">'+
        '<div style="flex:1">'+
          '<div style="font-size:.78rem;font-weight:600;color:#333">'+esc(g.title)+'</div>'+
          '<div style="margin-top:5px;background:#f0f0f0;border-radius:4px;height:5px;overflow:hidden">'+
            '<div style="height:100%;border-radius:4px;background:'+area.color+';width:'+(g.progress||0)+'%"></div></div>'+
        '</div>'+
        '<span style="font-size:.72rem;font-weight:700;color:'+area.color+';min-width:32px;text-align:right">'+(g.progress||0)+'%</span>'+
        '<button onclick="quickProgress(\''+g.id+'\')" style="padding:3px 8px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font-size:.65rem;cursor:pointer;color:#555;font-family:inherit">+10%</button>'+
      '</div>';
    });
  }
  weekHtml+='</div>';

  document.getElementById('mainPanel').innerHTML = header+progress+'<div class="today-grid">'+tasksHtml+weekHtml+'</div>';
}

/* ── Modal ── */
function openModal(id) {
  editingId = id;
  var g = id ? allGoals.find(function(x){return x.id===id;}) : null;
  var hz = hzInfo(currentHz);
  var parentHzIdx = HORIZONS.findIndex(function(h){return h.id===currentHz;});
  var parentHz    = parentHzIdx>0?HORIZONS[parentHzIdx-1]:null;
  var parentGoals = parentHz?allGoals.filter(function(x){return x.hz===parentHz.id;}):[];

  var parentSelect = parentGoals.length?
    '<div class="mf-field"><label>Vinculada a ('+parentHz.label+')</label>'+
    '<select id="mf-parent"><option value="">— Não vinculada —</option>'+
    parentGoals.map(function(p){return'<option value="'+p.id+'"'+(g&&g.parent_id===p.id?' selected':'')+'>'+esc(p.title)+'</option>';}).join('')+
    '</select></div>':'';

  document.getElementById('modalTitle').textContent=(id?'Editar':'Nova')+' meta — '+hz.icon+' '+hz.label;
  document.getElementById('modalForm').innerHTML=
    '<div class="mf">'+
      '<div class="mf-field"><label>Título *</label><input id="mf-title" type="text" placeholder="O que você quer alcançar?" value="'+esc(g?g.title:'')+'"/></div>'+
      '<div class="mf-field"><label>Descrição</label><textarea id="mf-desc" placeholder="Detalhes, motivação...">'+esc(g?g.description:'')+'</textarea></div>'+
      '<div class="mf-row">'+
        '<div class="mf-field"><label>Área</label><select id="mf-area">'+
          AREAS.map(function(a){return'<option value="'+a.id+'"'+(g&&g.area===a.id?' selected':'')+'>'+a.label+'</option>';}).join('')+
        '</select></div>'+
        '<div class="mf-field"><label>Prazo</label><input id="mf-deadline" type="text" placeholder="Ex: Dez/2026" value="'+esc(g?g.deadline:'')+'"/></div>'+
      '</div>'+
      '<div class="mf-field"><label>Meta de quem?</label>'+
        '<div id="personPicker" style="display:flex;gap:8px;flex-wrap:wrap;">'+
          PERSONS.map(function(p){
            var sel=(g?g.person||'ambos':'ambos')===p.id;
            return '<button type="button" id="pb-'+p.id+'" onclick="pickPerson(\''+p.id+'\')" style="'+
              'flex:1;padding:8px 12px;border-radius:8px;border:2px solid '+(sel?p.color:'#e5e7eb')+';'+
              'background:'+(sel?p.bg:'#fff')+';color:'+(sel?p.color:'#888')+';'+
              'font-weight:'+(sel?'700':'500')+';font-size:.82rem;cursor:pointer;transition:all .15s;">'+
              p.icon+' '+p.label+'</button>';
          }).join('')+
        '</div>'+
      '</div>'+
      '<div class="mf-field"><label>Meta quantitativa</label><input id="mf-target" type="text" placeholder="Ex: R$ 50.000, 10kg, 12 livros" value="'+esc(g?g.target:'')+'"/></div>'+
      '<div class="mf-field"><label>Rastreamento por dias / vezes</label>'+
        '<input type="number" id="mf-count" min="1" placeholder="Ex: 90 — ativa check-in diário por pessoa" value="'+esc(g&&g.target_count?g.target_count:'')+'"/>'+
        '<span style="font-size:.6rem;color:#aaa;margin-top:2px">Preencha para habilitar ✓ Registrar dia. Deixe vazio para usar progresso (%) manual.</span>'+
      '</div>'+
      parentSelect+
      '<div class="mf-field"><label>Progresso: <span id="mf-pct-val" style="color:#1D4ED8;font-weight:700">'+(g?g.progress:0)+'%</span></label>'+
        '<input type="range" id="mf-progress" min="0" max="100" step="5" value="'+(g?g.progress:0)+'" oninput="document.getElementById(\'mf-pct-val\').textContent=this.value+\'%\'"/></div>'+
      '<div class="mf-field"><label>Notas</label><textarea id="mf-notes" placeholder="Observações, próximos passos...">'+esc(g?g.notes:'')+'</textarea></div>'+
      '<div class="modal-actions">'+
        '<button class="btn-cancel" onclick="closeModal()">Cancelar</button>'+
        '<button class="btn-save" onclick="saveGoal()">'+(id?'Salvar alterações':'Criar meta')+'</button>'+
      '</div>'+
    '</div>';

  document.getElementById('modalBg').classList.remove('hidden');
  document.getElementById('mf-title').focus();
}

function openDailyModal() {
  editingId='__daily__';
  document.getElementById('modalTitle').textContent='➕ Nova tarefa recorrente';
  document.getElementById('modalForm').innerHTML=
    '<div class="mf">'+
      '<div class="mf-field"><label>Tarefa *</label><input id="mf-title" type="text" placeholder="O que você faz todo dia?"/></div>'+
      '<div class="mf-field"><label>Área</label><select id="mf-area">'+
        AREAS.map(function(a){return'<option value="'+a.id+'">'+a.label+'</option>';}).join('')+
      '</select></div>'+
      '<div class="mf-field"><label>Nota</label><input id="mf-note" type="text" placeholder="Contexto opcional"/></div>'+
      '<div class="modal-actions">'+
        '<button class="btn-cancel" onclick="closeModal()">Cancelar</button>'+
        '<button class="btn-save" onclick="saveDailyTask()">Adicionar</button>'+
      '</div></div>';
  document.getElementById('modalBg').classList.remove('hidden');
  document.getElementById('mf-title').focus();
}

function pickPerson(id){
  PERSONS.forEach(function(p){
    var btn=document.getElementById('pb-'+p.id);
    if(!btn) return;
    var sel=p.id===id;
    btn.style.borderColor=sel?p.color:'#e5e7eb';
    btn.style.background=sel?p.bg:'#fff';
    btn.style.color=sel?p.color:'#888';
    btn.style.fontWeight=sel?'700':'500';
  });
}
function getSelectedPerson(){
  var sel=PERSONS.find(function(p){ var b=document.getElementById('pb-'+p.id); return b&&b.style.fontWeight==='700'; });
  return sel?sel.id:'ambos';
}

function closeModal(){ document.getElementById('modalBg').classList.add('hidden'); editingId=null; }

/* ── CRUD with Supabase ── */
function saveGoal() {
  var title=(document.getElementById('mf-title').value||'').trim();
  if(!title){alert('Digite um título.');return;}
  var pe=document.getElementById('mf-parent');
  var data={
    hz:currentHz, title:title,
    description:(document.getElementById('mf-desc').value||'').trim(),
    area:document.getElementById('mf-area').value,
    deadline:(document.getElementById('mf-deadline').value||'').trim(),
    target:(document.getElementById('mf-target').value||'').trim(),
    progress:parseInt(document.getElementById('mf-progress').value)||0,
    notes:document.getElementById('mf-notes')?(document.getElementById('mf-notes').value||'').trim():'',
    parent_id:pe?(pe.value||null):null,
    person:getSelectedPerson(),
    target_count:parseInt(document.getElementById('mf-count').value)||null
  };

  var op;
  if(editingId){
    op = db.from('goals').eq('id',editingId).update(data);
  } else {
    data.id = uid();
    op = db.from('goals').insert(data);
  }

  document.querySelector('.btn-save').textContent='Salvando...';
  op.then(function(res){
    // update cache
    if(editingId){
      var idx=allGoals.findIndex(function(g){return g.id===editingId;});
      if(idx!==-1) allGoals[idx]=Object.assign(allGoals[idx],data);
    } else {
      allGoals.push(Array.isArray(res)?res[0]:data);
    }
    closeModal(); render();
  }).catch(function(e){ alert('Erro ao salvar: '+e.message); document.querySelector('.btn-save').textContent='Salvar'; });
}

function saveDailyTask() {
  var title=(document.getElementById('mf-title').value||'').trim();
  if(!title){alert('Digite uma tarefa.');return;}
  var data={id:uid(),title:title,area:document.getElementById('mf-area').value,note:(document.getElementById('mf-note').value||'').trim(),active:true,sort_order:allTasks.length};
  db.from('daily_tasks').insert(data).then(function(res){
    allTasks.push(Array.isArray(res)?res[0]:data);
    closeModal(); renderDailyPanel();
  }).catch(function(e){alert('Erro: '+e.message);});
}

function checkIn(goalId, personKey) {
  var today    = todayKey();
  var existing = allGoalLogs.find(function(l){ return l.goal_id===goalId && l.person===personKey && l.date===today; });
  if (existing) {
    db.from('goal_logs').eq('id',existing.id).delete().then(function(){
      allGoalLogs = allGoalLogs.filter(function(l){ return l.id!==existing.id; });
      render();
    }).catch(function(e){ alert('Erro: '+e.message); });
  } else {
    var row = { id:uid(), goal_id:goalId, date:today, person:personKey };
    db.from('goal_logs').insert(row).then(function(res){
      allGoalLogs.push(Array.isArray(res)?res[0]:row);
      render();
    }).catch(function(e){ alert('Erro: '+e.message); });
  }
}

function deleteGoal(id){
  if(!confirm('Remover esta meta?'))return;
  db.from('goals').eq('id',id).delete().then(function(){
    allGoals=allGoals.filter(function(g){return g.id!==id;});
    render();
  }).catch(function(e){alert('Erro: '+e.message);});
}

function deleteTask(id){
  if(!confirm('Remover esta tarefa?'))return;
  db.from('daily_tasks').eq('id',id).delete().then(function(){
    allTasks=allTasks.filter(function(t){return t.id!==id;});
    renderDailyPanel();
  }).catch(function(e){alert('Erro: '+e.message);});
}

function markDone(id){
  db.from('goals').eq('id',id).update({progress:100}).then(function(){
    var g=allGoals.find(function(x){return x.id===id;});
    if(g){ g.progress=100; celebrate(g.area||'pes'); }
    render();
  }).catch(function(e){alert('Erro: '+e.message);});
}

function toggleDaily(taskId){
  var today=todayKey();
  var isDone=!!todayChecks[taskId];
  var newDone=!isDone;
  // Upsert daily_check
  db.from('daily_checks').upsert({id:uid(),task_id:taskId,date:today,done:newDone})
    .then(function(){
      todayChecks[taskId]=newDone;
      renderDailyPanel();
    }).catch(function(e){alert('Erro: '+e.message);});
}

function quickProgress(id){
  var g=allGoals.find(function(x){return x.id===id;});
  if(!g)return;
  var newPct=Math.min(100,(g.progress||0)+10);
  db.from('goals').eq('id',id).update({progress:newPct}).then(function(){
    g.progress=newPct; renderDailyPanel(); renderOverview();
  }).catch(function(e){alert('Erro: '+e.message);});
}

/* ── Globals ── */
window.setHz=setHz;
window.openModal=openModal;
window.openDailyModal=openDailyModal;
window.closeModal=closeModal;
window.saveGoal=saveGoal;
window.saveDailyTask=saveDailyTask;
window.deleteGoal=deleteGoal;
window.deleteTask=deleteTask;
window.markDone=markDone;
window.toggleDaily=toggleDaily;
window.quickProgress=quickProgress;
window.pickPerson=pickPerson;
window.setPersonFilter=setPersonFilter;
window.checkIn=checkIn;

function setHz(id){ currentHz=id; render(); }
function setPersonFilter(id){ personFilter=(personFilter===id?'all':id); render(); }

document.getElementById('modalBg').addEventListener('click',function(e){if(e.target===this)closeModal();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});

/* ── Init ── */
loadAll();

}());
