/* ── Suks & Giu System — Mobile enhancements ── */
(function(){
'use strict';

/* Detect base path */
var path = window.location.pathname;
var isRoot = !path.includes('/metas/') && !path.includes('/saude/') &&
             !path.includes('/habitos/') && !path.includes('/nutricao/') &&
             !path.includes('/financeiro/') && !path.includes('/hoje');
var base = isRoot ? '/controle-financeiro/' : '../';

/* ── Mode toggle ── */
function getMode(){ return localStorage.getItem('sgs-mode') || 'auto'; }
function setMode(m){ localStorage.setItem('sgs-mode', m); applyMode(m); }

function applyMode(m){
  var isMobile = window.innerWidth <= 768;
  var compact = m === 'compact' || (m === 'auto' && isMobile);
  document.body.classList.toggle('sgs-compact', compact);
  var btn = document.getElementById('sgsModeBtn');
  if(btn) btn.textContent = compact ? '🖥️' : '📱';
  btn && (btn.title = compact ? 'Modo Desktop' : 'Modo Mobile');
}

/* ── Inject mode button into nav ── */
function injectModeBtn(){
  var nav = document.querySelector('.sgs-nav');
  if(!nav || document.getElementById('sgsModeBtn')) return;
  var btn = document.createElement('button');
  btn.id = 'sgsModeBtn';
  btn.className = 'sgs-mode-btn';
  btn.onclick = function(){
    var cur = getMode();
    var isCom = document.body.classList.contains('sgs-compact');
    setMode(isCom ? 'full' : 'compact');
  };
  nav.appendChild(btn);
}

/* ── Bottom navigation ── */
var NAV_ITEMS = [
  { icon:'🏠', label:'Início',     url: base + (isRoot ? '' : ''), href: '/controle-financeiro/' },
  { icon:'⚡', label:'Hoje',       href: '/controle-financeiro/hoje.html', active: path.includes('/hoje') },
  { icon:'🎯', label:'Metas',      href: '/controle-financeiro/metas/' },
  { icon:'❤️', label:'Saúde',     href: '/controle-financeiro/saude/' },
  { icon:'✅', label:'Hábitos',   href: '/controle-financeiro/habitos/' },
  { icon:'💰', label:'Finanças',  href: '/controle-financeiro/financeiro/' }
];

function injectBottomNav(){
  if(document.getElementById('sgsBottomNav')) return;
  var nav = document.createElement('nav');
  nav.id = 'sgsBottomNav';
  nav.className = 'sgs-bottom-nav';
  nav.innerHTML = NAV_ITEMS.map(function(item){
    var isActive = path === item.href || path === item.href + 'index.html' || item.active;
    var cls = 'sbn-item' + (isActive?' active':'') + (item.label==='Hoje'?' sbn-hoje-pill':'');
    return '<a class="'+cls+'" href="'+item.href+'">'+
      '<span class="sbn-icon">'+item.icon+'</span>'+
      '<span>'+item.label+'</span>'+
    '</a>';
  }).join('');
  document.body.appendChild(nav);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function(){
  injectModeBtn();
  injectBottomNav();
  applyMode(getMode());
});

window.addEventListener('resize', function(){
  if(getMode() === 'auto') applyMode('auto');
});

}());
