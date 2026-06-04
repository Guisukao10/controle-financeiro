(function(){
'use strict';

/* ── Storage keys ── */
var KEYS = {
  goals:   'sgs_goals_v1',
  daily:   'sgs_daily_v1',
  checked: 'sgs_daily_checked_v1'
};

/* ── Areas config ── */
var AREAS = [
  { id:'fin', label:'Financeiro',       color:'#15803D', bg:'#F0FDF4' },
  { id:'sau', label:'Saúde',            color:'#E11D48', bg:'#FFF1F2' },
  { id:'apr', label:'Aprendizado',      color:'#1D4ED8', bg:'#EFF6FF' },
  { id:'rel', label:'Relacionamentos',  color:'#9333EA', bg:'#FDF4FF' },
  { id:'pes', label:'Pessoal',          color:'#EA580C', bg:'#FFF7ED' },
  { id:'pro', label:'Projetos',         color:'#0891B2', bg:'#F0FDFA' }
];

/* ── Horizons config ── */
var HORIZONS = [
  { id:'decada', icon:'🔭', label:'10 Anos',  title:'Visão de 10 Anos',  desc:'Onde você quer estar daqui a 10 anos?'      },
  { id:'anual',  icon:'📅', label:'Anual',    title:'Metas Anuais',      desc:'O que você vai conquistar este ano?'        },
  { id:'mensal', icon:'🗓', label:'Mensal',   title:'Compromissos do Mês',desc:'Foco e prioridades deste mês'               },
  { id:'semanal',icon:'📋', label:'Semanal',  title:'Semana em Foco',    desc:'Suas prioridades desta semana'              },
  { id:'diario', icon:'✅', label:'Hoje',     title:'Plano do Dia',      desc:'O que você vai fazer hoje?'                 }
];

/* ── State ── */
var currentHz  = 'decada';
var editingId  = null;

/* ── Data helpers ── */
function load()     { try { return JSON.parse(localStorage.getItem(KEYS.goals)||'[]'); } catch(e){ return []; } }
function save(d)    { localStorage.setItem(KEYS.goals, JSON.stringify(d)); }
function loadDaily(){ try { return JSON.parse(localStorage.getItem(KEYS.daily)||'[]'); } catch(e){ return []; } }
function saveDaily(d){ localStorage.setItem(KEYS.daily, JSON.stringify(d)); }
function loadChecked(){ try { return JSON.parse(localStorage.getItem(KEYS.checked)||'{}'); } catch(e){ return {}; } }
function saveChecked(d){ localStorage.setItem(KEYS.checked, JSON.stringify(d)); }
function todayKey() { var n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); }
function uid()      { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function areaInfo(id){ return AREAS.find(function(a){return a.id===id;})||AREAS[0]; }
function hzInfo(id) { return HORIZONS.find(function(h){return h.id===id;})||HORIZONS[0]; }

/* ── Financial connection ── */
function readFinancialData() {
  var simPlan = {};
  try { simPlan = JSON.parse(localStorage.getItem('cf_sim_plan_v1')||'{}'); } catch(e){}
  var ganhoOvr = parseFloat(localStorage.getItem('cf_sim_ganho_v1')||'0')||0;
  var simGanhoKey = 'cf_sim_ganho_v1';

  // Compute total planned monthly (average across months)
  var catTotals = {}, grandTotal=0, monthCount=0;
  Object.keys(simPlan).forEach(function(cat){
    Object.values(simPlan[cat]).forEach(function(v){ catTotals[cat]=(catTotals[cat]||0)+v; grandTotal+=v; monthCount++; });
  });
  var months = Object.values(simPlan)[0] ? Object.keys(Object.values(simPlan)[0]).length : 0;
  var avgMonthly = months > 0 ? grandTotal/months : 0;

  // Investment projections
  var investRows = {};
  try { investRows = JSON.parse(localStorage.getItem('cf_fc_overrides_v1')||'{}'); } catch(e){}

  return { ganho: ganhoOvr||0, avgMonthly: avgMonthly, months: months, grandTotal: grandTotal };
}

/* ── Render ── */
function render() {
  renderHorizonTabs();
  renderConnectionBar();
  renderOverview();
  renderCascade();
  if (currentHz === 'diario') {
    renderDailyPanel();
  } else {
    renderGoalsPanel();
  }
}

function renderHorizonTabs() {
  var el = document.getElementById('horizonTabs');
  el.innerHTML = HORIZONS.map(function(h){
    return '<button class="hz-btn'+(h.id===currentHz?' on':'')+'" onclick="setHz(\''+h.id+'\')">'+
      '<span class="hz-icon">'+h.icon+'</span>'+
      '<span class="hz-label">'+h.label+'</span>'+
    '</button>';
  }).join('');
}

function renderConnectionBar() {
  var fin = readFinancialData();
  var goals = load();
  var done  = goals.filter(function(g){ return g.hz===currentHz && g.progress>=100; }).length;
  var total = goals.filter(function(g){ return g.hz===currentHz; }).length;

  // Current year goal count
  var yr = new Date().getFullYear();
  var annualGoals = goals.filter(function(g){ return g.hz==='anual'; });
  var annualDone  = annualGoals.filter(function(g){ return g.progress>=100; }).length;

  document.getElementById('connBar').innerHTML =
    conn('💰','Financeiro',fin.ganho>0?brl(fin.ganho)+'/mês':'Não configurado', fin.ganho>0?'Receita planejada':'Conecte o módulo','#15803D')+
    conn('🎯','Metas Ativas',total,'no horizonte atual','#1D4ED8')+
    conn('✅','Concluídas',done+' / '+total,'horizonte atual','#9333EA')+
    conn('📅','Metas '+yr,annualGoals.length,(annualDone+' concluídas'),'#EA580C');
}

function conn(icon,lbl,val,sub,color){
  return '<div class="conn-card">'+
    '<div class="conn-dot" style="background:'+color+'"></div>'+
    '<div><div class="conn-lbl">'+icon+' '+lbl+'</div><div class="conn-val">'+val+'</div><div class="conn-sub">'+sub+'</div></div>'+
  '</div>';
}

function renderOverview(){
  var goals = load();
  var el = document.getElementById('overviewGrid');
  var hz = HORIZONS.map(function(h){
    var total = goals.filter(function(g){ return g.hz===h.id; }).length;
    var done  = goals.filter(function(g){ return g.hz===h.id && g.progress>=100; }).length;
    var pct   = total>0 ? Math.round(done/total*100) : 0;
    return '<div class="ov-card">'+
      '<div class="ov-num">'+total+'</div>'+
      '<div class="ov-lbl">'+h.icon+' '+h.label+'</div>'+
      '<div class="ov-bar"><div class="ov-bar-fill" style="width:'+pct+'%"></div></div>'+
    '</div>';
  });
  el.innerHTML = hz.join('');
}

function renderCascade() {
  var el = document.getElementById('cascade');
  el.innerHTML = '<div class="cascade-title">Hierarquia de metas — do macro ao micro</div>'+
    '<div class="cascade-row">'+
    HORIZONS.map(function(h,i){
      return (i>0?'<span class="cascade-arrow">→</span>':'')+
        '<span class="cascade-step'+(h.id===currentHz?' cur':'')+'" onclick="setHz(\''+h.id+'\')">'+h.icon+' '+h.label+'</span>';
    }).join('')+'</div>';
}

function renderGoalsPanel() {
  var hz    = hzInfo(currentHz);
  var goals = load().filter(function(g){ return g.hz===currentHz; });
  var panel = document.getElementById('mainPanel');

  var header = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">'+
    '<div><div style="font-size:1rem;font-weight:700">'+hz.icon+' '+hz.title+'</div>'+
    '<div style="font-size:.73rem;color:#aaa;margin-top:2px">'+hz.desc+'</div></div>'+
    '<button class="add-goal-btn" style="width:auto;padding:8px 16px" onclick="openModal(null)">+ Adicionar meta</button>'+
  '</div>';

  var cards = '';
  if (!goals.length) {
    cards = '<div class="no-goals">'+hz.icon+'<br><br>Nenhuma meta definida para <strong>'+hz.title+'</strong>.<br>'+
      '<button class="add-goal-btn" style="max-width:300px;margin:14px auto 0" onclick="openModal(null)">+ Criar primeira meta</button></div>';
  } else {
    // Sort: in-progress first, then by area
    var sorted = goals.slice().sort(function(a,b){
      if(a.progress>=100 && b.progress<100) return 1;
      if(b.progress>=100 && a.progress<100) return -1;
      return 0;
    });
    cards = '<div class="goals-grid">'+sorted.map(goalCard).join('')+'</div>';
  }

  panel.innerHTML = header + cards;
}

function goalCard(g) {
  var area  = areaInfo(g.area||'fin');
  var pct   = Math.min(g.progress||0, 100);
  var done  = pct >= 100;
  var statusClass = done ? 'status-done' : pct>=80?'status-close':pct>0?'status-active':'status-pending';

  // Find parent goal name
  var allGoals = load();
  var parent   = g.parentId ? allGoals.find(function(x){return x.id===g.parentId;}) : null;

  // Find connected goals count (children)
  var children = allGoals.filter(function(x){return x.parentId===g.id;});

  return '<div class="goal-card '+statusClass+(done?' done':'')+'" id="gc-'+g.id+'">'+
    '<div class="gc-area">'+
      '<div class="gc-area-dot" style="background:'+area.color+'"></div>'+
      '<span class="gc-area-name" style="color:'+area.color+'">'+area.label+'</span>'+
      (done?'<span style="margin-left:auto;font-size:.65rem;font-weight:700;color:#15803D">✓ Concluída</span>':'')+
    '</div>'+
    '<div class="gc-title">'+esc(g.title)+'</div>'+
    (g.desc?'<div class="gc-desc">'+esc(g.desc)+'</div>':'')+
    '<div class="gc-progress">'+
      '<div class="gc-prog-header">'+
        '<span style="font-size:.7rem;color:#888">Progresso</span>'+
        '<span class="gc-prog-pct" style="color:'+area.color+'">'+pct+'%</span>'+
      '</div>'+
      '<div class="gc-prog-track"><div class="gc-prog-fill" style="width:'+pct+'%;background:'+area.color+'"></div></div>'+
    '</div>'+
    '<div class="gc-meta">'+
      (g.target?'<span class="gc-tag">🎯 '+esc(g.target)+'</span>':'')+
      (g.deadline?'<span class="gc-date">📅 '+esc(g.deadline)+'</span>':'')+
      (children.length?'<span class="gc-tag linked">'+children.length+' sub-meta'+( children.length>1?'s':'')+'</span>':'')+
    '</div>'+
    (parent?'<div class="gc-linked-badge">↗ '+esc(parent.title)+'</div>':'')+
    '<div class="gc-actions">'+
      '<button class="gc-btn" onclick="openModal(\''+g.id+'\')">✏ Editar</button>'+
      (pct<100?'<button class="gc-btn done-btn" onclick="markDone(\''+g.id+'\')">✓ Concluir</button>':'')+
      '<button class="gc-btn del-btn" onclick="deleteGoal(\''+g.id+'\')">🗑</button>'+
    '</div>'+
  '</div>';
}

/* ── Daily panel ── */
function renderDailyPanel() {
  var panel = document.getElementById('mainPanel');
  var today = todayKey();
  var daily  = loadDaily();
  var checked= loadChecked();
  var todayChecks = checked[today]||{};

  // Group tasks by area
  var byArea = {};
  daily.forEach(function(t){
    var a = t.area||'pes';
    if(!byArea[a]) byArea[a]=[];
    byArea[a].push(t);
  });

  // Also show weekly goals as quick-check items
  var goals = load();
  var weeklyGoals = goals.filter(function(g){ return g.hz==='semanal' && g.progress<100; });

  var header = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">'+
    '<div>'+
      '<div style="font-size:1rem;font-weight:700">✅ Plano do Dia</div>'+
      '<div style="font-size:.73rem;color:#aaa;margin-top:2px">'+formatToday()+' — O que você vai fazer hoje?</div>'+
    '</div>'+
    '<button class="add-goal-btn" style="width:auto;padding:8px 16px" onclick="openDailyModal()">+ Adicionar tarefa</button>'+
  '</div>';

  var totalTasks = daily.length;
  var doneTasks  = daily.filter(function(t){ return todayChecks[t.id]; }).length;
  var pct        = totalTasks>0 ? Math.round(doneTasks/totalTasks*100) : 0;

  var progress = totalTasks>0 ? '<div style="background:#fff;border:1px solid #eaeaea;border-radius:10px;padding:14px;margin-bottom:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
      '<span style="font-size:.78rem;font-weight:600;color:#555">Progresso de hoje</span>'+
      '<span style="font-size:.88rem;font-weight:800;color:'+(pct>=100?'#15803D':pct>=50?'#EF9F27':'#1D4ED8')+'">'+doneTasks+'/'+totalTasks+' — '+pct+'%</span>'+
    '</div>'+
    '<div style="background:#f0f0f0;border-radius:5px;height:10px;overflow:hidden">'+
      '<div style="height:100%;border-radius:5px;background:'+(pct>=100?'#15803D':pct>=50?'#EF9F27':'#1D4ED8')+';width:'+pct+'%;transition:width .5s"></div>'+
    '</div>'+
    (pct>=100?'<div style="text-align:center;margin-top:8px;font-size:.75rem;font-weight:600;color:#15803D">🎉 Missão cumprida hoje!</div>':'')+
  '</div>' : '';

  // Build two columns
  var leftCol = '', rightCol = '';

  // Daily tasks
  var tasksHtml = '<div class="today-section">'+
    '<div class="ts-header">Tarefas do dia <span style="font-size:.7rem;font-weight:600;color:#1D4ED8">'+doneTasks+'/'+totalTasks+'</span></div>';
  if(!daily.length){
    tasksHtml += '<div class="no-goals" style="padding:12px">Nenhuma tarefa. Clique em + para adicionar.</div>';
  } else {
    daily.forEach(function(t){
      var isDone = !!todayChecks[t.id];
      var area   = areaInfo(t.area||'pes');
      tasksHtml += '<div class="task-item">'+
        '<div class="task-check'+(isDone?' checked':'')+'" onclick="toggleDaily(\''+t.id+'\')">'+( isDone?'✓':'')+'</div>'+
        '<div style="flex:1">'+
          '<div class="task-text'+(isDone?' checked':'')+'">'+esc(t.title)+'</div>'+
          (t.note?'<div style="font-size:.67rem;color:#bbb;margin-top:2px">'+esc(t.note)+'</div>':'')+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:5px">'+
          '<span class="task-area" style="background:'+area.bg+';color:'+area.color+'">'+area.label+'</span>'+
          '<button onclick="deleteDaily(\''+t.id+'\')" style="border:none;background:none;color:#ddd;cursor:pointer;font-size:.8rem;padding:2px">×</button>'+
        '</div>'+
      '</div>';
    });
  }
  tasksHtml += '</div>';
  leftCol = tasksHtml;

  // Weekly goals check-in
  var weekHtml = '<div class="today-section">'+
    '<div class="ts-header">Metas da semana <span style="font-size:.65rem;color:#aaa">progresso</span></div>';
  if(!weeklyGoals.length){
    weekHtml += '<div class="no-goals" style="padding:12px">Nenhuma meta semanal ativa.<br><a href="#" onclick="setHz(\'semanal\');return false" style="color:#1D4ED8;font-size:.75rem">Definir metas semanais →</a></div>';
  } else {
    weeklyGoals.slice(0,5).forEach(function(g){
      var area = areaInfo(g.area||'fin');
      var pct2 = g.progress||0;
      weekHtml += '<div class="task-item">'+
        '<div style="flex:1">'+
          '<div style="font-size:.78rem;font-weight:600;color:#333">'+esc(g.title)+'</div>'+
          '<div style="margin-top:5px;background:#f0f0f0;border-radius:4px;height:5px;overflow:hidden">'+
            '<div style="height:100%;border-radius:4px;background:'+area.color+';width:'+pct2+'%"></div></div>'+
        '</div>'+
        '<span style="font-size:.72rem;font-weight:700;color:'+area.color+';min-width:32px;text-align:right">'+pct2+'%</span>'+
        '<button onclick="quickProgress(\''+g.id+'\')" style="padding:3px 8px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font-size:.65rem;cursor:pointer;color:#555;font-family:inherit">+10%</button>'+
      '</div>';
    });
  }
  weekHtml += '</div>';
  rightCol = weekHtml;

  panel.innerHTML = header + progress +
    '<div class="today-grid">'+leftCol+rightCol+'</div>';
}

/* ── Modal ── */
function openModal(id) {
  editingId = id;
  var goals = load();
  var g = id ? goals.find(function(x){return x.id===id;}) : null;
  var hz = hzInfo(currentHz);

  // Build parent options (goals from parent horizon)
  var parentHzIdx = HORIZONS.findIndex(function(h){return h.id===currentHz;});
  var parentHz    = parentHzIdx>0 ? HORIZONS[parentHzIdx-1] : null;
  var parentGoals = parentHz ? goals.filter(function(x){return x.hz===parentHz.id;}) : [];

  var parentSelect = '';
  if (parentGoals.length) {
    parentSelect = '<div class="mf-field"><label>Vinculada a ('+parentHz.label+')</label>'+
      '<select id="mf-parent">'+
        '<option value="">— Não vinculada —</option>'+
        parentGoals.map(function(p){
          return '<option value="'+p.id+'"'+(g&&g.parentId===p.id?' selected':'')+'>'+esc(p.title)+'</option>';
        }).join('')+
      '</select></div>';
  }

  document.getElementById('modalTitle').textContent = (id?'Editar':'Nova')+' meta — '+hz.icon+' '+hz.label;
  document.getElementById('modalForm').innerHTML =
    '<div class="mf">'+
      '<div class="mf-field"><label>Título *</label><input id="mf-title" type="text" placeholder="O que você quer alcançar?" value="'+esc(g?g.title:'')+'"/></div>'+
      '<div class="mf-field"><label>Descrição</label><textarea id="mf-desc" placeholder="Detalhes, contexto, motivação...">'+esc(g?g.desc:'')+'</textarea></div>'+
      '<div class="mf-row">'+
        '<div class="mf-field"><label>Área</label><select id="mf-area">'+
          AREAS.map(function(a){return'<option value="'+a.id+'"'+(g&&g.area===a.id?' selected':'')+'>'+a.label+'</option>';}).join('')+
        '</select></div>'+
        '<div class="mf-field"><label>Prazo / Alvo</label><input id="mf-deadline" type="text" placeholder="Ex: Dez/2026, Q2 2025" value="'+esc(g?g.deadline:'')+'"/></div>'+
      '</div>'+
      '<div class="mf-field"><label>Meta quantitativa (opcional)</label><input id="mf-target" type="text" placeholder="Ex: R$ 50.000, 10kg, 12 livros" value="'+esc(g?g.target:'')+'"/></div>'+
      parentSelect+
      '<div class="mf-field"><label>Progresso: <span id="mf-pct-val" style="color:#1D4ED8;font-weight:700">'+(g?g.progress:0)+'%</span></label>'+
        '<div class="pct-range"><input type="range" id="mf-progress" min="0" max="100" step="5" value="'+(g?g.progress:0)+'" oninput="document.getElementById(\'mf-pct-val\').textContent=this.value+\'%\'"/></div>'+
      '</div>'+
      (currentHz!=='diario'?'<div class="mf-field"><label>Notas</label><textarea id="mf-notes" placeholder="Observações, próximos passos...">'+esc(g?g.notes:'')+'</textarea></div>':'')+
      '<div class="modal-actions">'+
        '<button class="btn-cancel" onclick="closeModal()">Cancelar</button>'+
        '<button class="btn-save" onclick="saveGoal()">'+( id?'Salvar':'Criar meta')+'</button>'+
      '</div>'+
    '</div>';

  document.getElementById('modalBg').classList.remove('hidden');
  document.getElementById('mf-title').focus();
}

function openDailyModal() {
  document.getElementById('modalTitle').textContent = '➕ Nova tarefa do dia';
  document.getElementById('modalForm').innerHTML =
    '<div class="mf">'+
      '<div class="mf-field"><label>Tarefa *</label><input id="mf-title" type="text" placeholder="O que você vai fazer hoje?"/></div>'+
      '<div class="mf-field"><label>Área</label><select id="mf-area">'+
        AREAS.map(function(a){return'<option value="'+a.id+'">'+a.label+'</option>';}).join('')+
      '</select></div>'+
      '<div class="mf-field"><label>Nota rápida</label><input id="mf-note" type="text" placeholder="Contexto ou detalhe opcional"/></div>'+
      '<div class="modal-actions">'+
        '<button class="btn-cancel" onclick="closeModal()">Cancelar</button>'+
        '<button class="btn-save" onclick="saveDailyTask()">Adicionar</button>'+
      '</div>'+
    '</div>';
  editingId = '__daily__';
  document.getElementById('modalBg').classList.remove('hidden');
  document.getElementById('mf-title').focus();
}

function closeModal() { document.getElementById('modalBg').classList.add('hidden'); editingId=null; }

function saveGoal() {
  var title = (document.getElementById('mf-title').value||'').trim();
  if(!title){ alert('Digite um título.'); return; }
  var goals = load();
  if (editingId) {
    var idx = goals.findIndex(function(g){return g.id===editingId;});
    if(idx!==-1){
      goals[idx].title    = title;
      goals[idx].desc     = (document.getElementById('mf-desc').value||'').trim();
      goals[idx].area     = document.getElementById('mf-area').value;
      goals[idx].deadline = (document.getElementById('mf-deadline').value||'').trim();
      goals[idx].target   = (document.getElementById('mf-target').value||'').trim();
      goals[idx].progress = parseInt(document.getElementById('mf-progress').value)||0;
      goals[idx].notes    = document.getElementById('mf-notes') ? (document.getElementById('mf-notes').value||'').trim() : '';
      var pe = document.getElementById('mf-parent');
      if(pe) goals[idx].parentId = pe.value||null;
    }
  } else {
    var pe2 = document.getElementById('mf-parent');
    goals.push({
      id: uid(), hz: currentHz, title: title,
      desc:     (document.getElementById('mf-desc').value||'').trim(),
      area:     document.getElementById('mf-area').value,
      deadline: (document.getElementById('mf-deadline').value||'').trim(),
      target:   (document.getElementById('mf-target').value||'').trim(),
      progress: parseInt(document.getElementById('mf-progress').value)||0,
      notes:    document.getElementById('mf-notes') ? (document.getElementById('mf-notes').value||'').trim() : '',
      parentId: pe2 ? (pe2.value||null) : null,
      createdAt: new Date().toISOString()
    });
  }
  save(goals);
  closeModal();
  render();
}

function saveDailyTask() {
  var title = (document.getElementById('mf-title').value||'').trim();
  if(!title){ alert('Digite uma tarefa.'); return; }
  var daily = loadDaily();
  daily.push({ id:uid(), title:title, area:document.getElementById('mf-area').value, note:(document.getElementById('mf-note').value||'').trim() });
  saveDaily(daily);
  closeModal();
  renderDailyPanel();
}

function deleteGoal(id) {
  if(!confirm('Remover esta meta?')) return;
  var goals = load().filter(function(g){ return g.id!==id; });
  save(goals); render();
}

function deleteDaily(id) {
  var daily = loadDaily().filter(function(t){ return t.id!==id; });
  saveDaily(daily); renderDailyPanel();
}

function markDone(id) {
  var goals = load();
  var g = goals.find(function(x){return x.id===id;});
  if(g){ g.progress=100; save(goals); render(); }
}

function toggleDaily(id) {
  var today   = todayKey();
  var checked = loadChecked();
  if(!checked[today]) checked[today]={};
  checked[today][id] = !checked[today][id];
  saveChecked(checked);
  renderDailyPanel();
}

function quickProgress(id) {
  var goals = load();
  var g = goals.find(function(x){return x.id===id;});
  if(g){ g.progress=Math.min(100,(g.progress||0)+10); save(goals); renderDailyPanel(); renderOverview(); }
}

/* ── Global helpers ── */
function setHz(id) { currentHz=id; render(); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function brl(v){ return (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function formatToday(){
  var n=new Date();
  return n.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
}

/* ── Close modal on bg click ── */
document.getElementById('modalBg').addEventListener('click', function(e){
  if(e.target===this) closeModal();
});

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', function(e){
  if(e.key==='Escape') closeModal();
  if(e.key==='n' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); openModal(null); }
});

/* ── Expose globals ── */
window.setHz        = setHz;
window.openModal    = openModal;
window.openDailyModal = openDailyModal;
window.closeModal   = closeModal;
window.saveGoal     = saveGoal;
window.saveDailyTask= saveDailyTask;
window.deleteGoal   = deleteGoal;
window.deleteDaily  = deleteDaily;
window.markDone     = markDone;
window.toggleDaily  = toggleDaily;
window.quickProgress= quickProgress;

/* ── Init ── */
render();

}());
