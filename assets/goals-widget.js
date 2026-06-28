/* ── GoalsWidget — widget compartilhado de metas vinculadas ── */
(function(){
'use strict';

var _logs    = [];
var _widgets = {}; // { containerId: area }

var PS = {
  gui:   { color:'#1D4ED8', bg:'#EFF6FF', icon:'👤', label:'Gui'   },
  giu:   { color:'#9333EA', bg:'#FDF4FF', icon:'👤', label:'Giu'   },
  ambos: { color:'#15803D', bg:'#F0FDF4', icon:'👥', label:'Ambos' }
};

function todayStr(){
  var n=new Date();
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

function renderWidget(containerId, area){
  var el=document.getElementById(containerId);
  if(!el) return;
  _widgets[containerId]=area;

  el.innerHTML='<div style="color:#bbb;font-size:.74rem;text-align:center;padding:14px">⏳ Carregando metas...</div>';

  Promise.all([
    db.from('goals').eq('area',area).select('*'),
    db.from('goal_logs').select('*')
  ]).then(function(res){
    var goals=(res[0]||[]).filter(function(g){ return g.hz!=='diario'&&g.progress<100; });
    _logs=res[1]||[];
    _paint(el, goals);
  }).catch(function(e){
    el.innerHTML='<div style="color:#B91C1C;font-size:.74rem;text-align:center;padding:14px">⚠️ '+e.message+'</div>';
  });
}

function _paint(el, goals){
  if(!goals.length){
    el.innerHTML='<div style="color:#bbb;font-size:.74rem;text-align:center;padding:14px">'+
      'Nenhuma meta vinculada nesta área.<br>'+
      '<a href="../metas/" style="color:#1D4ED8;font-weight:600;font-size:.72rem">Criar no módulo Metas →</a></div>';
    return;
  }

  var today=todayStr();

  el.innerHTML=goals.map(function(g){
    var pi=PS[g.person||'ambos']||PS.ambos;
    var trackers=g.person==='ambos'?['gui','giu']:[g.person||'gui'];
    var isCount=g.target_count>0;

    var body='';
    if(isCount){
      body=trackers.map(function(pk){
        var ps=PS[pk]||PS.gui;
        var count=_logs.filter(function(l){return l.goal_id===g.id&&l.person===pk;}).length;
        var pct=Math.min(100,Math.round(count/g.target_count*100));
        var done=_logs.some(function(l){return l.goal_id===g.id&&l.person===pk&&l.date===today;});
        return '<div style="margin-bottom:7px">'+
          '<div style="display:flex;justify-content:space-between;font-size:.68rem;margin-bottom:3px">'+
            '<span style="color:'+ps.color+';font-weight:700">'+ps.icon+' '+ps.label+'</span>'+
            '<span style="font-weight:800;color:#1a1a1a">'+count+' <span style="font-weight:400;color:#bbb">/ '+g.target_count+' dias</span></span>'+
          '</div>'+
          '<div style="background:#f0f0f0;height:6px;border-radius:9999px;overflow:hidden;margin-bottom:5px">'+
            '<div style="background:'+ps.color+';height:100%;width:'+pct+'%;border-radius:9999px;transition:width .3s"></div>'+
          '</div>'+
          '<button onclick="GoalsWidget.checkIn(\''+g.id+'\',\''+pk+'\')" style="'+
            'width:100%;padding:6px 8px;border-radius:7px;cursor:pointer;font-family:inherit;font-size:.7rem;font-weight:700;transition:all .15s;'+
            'border:1.5px solid '+(done?ps.color:'#e5e7eb')+';'+
            'background:'+(done?ps.bg:'#fff')+';color:'+(done?ps.color:'#888')+'">'+
            (done?'✓ '+ps.label+' — registrado hoje':'+ Registrar dia ('+ps.label+')')+
          '</button>'+
        '</div>';
      }).join('');
    } else {
      var pct=g.progress||0;
      body='<div style="display:flex;justify-content:space-between;font-size:.7rem;margin-bottom:4px">'+
        '<span style="color:#aaa">Progresso</span><span style="font-weight:800;color:#1a1a1a">'+pct+'%</span></div>'+
        '<div style="background:#f0f0f0;height:6px;border-radius:9999px;overflow:hidden">'+
          '<div style="background:'+pi.color+';height:100%;width:'+pct+'%;border-radius:9999px"></div>'+
        '</div>';
    }

    return '<div style="border-left:3px solid '+pi.color+';background:#fff;border:1px solid #eaeaea;border-left:3px solid '+pi.color+';border-radius:8px;padding:12px 14px;margin-bottom:8px;">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;">'+
        '<div style="font-size:.8rem;font-weight:700;color:#1a1a1a;flex:1;margin-right:8px;line-height:1.3">'+g.title+'</div>'+
        '<span style="font-size:.6rem;padding:2px 7px;border-radius:9999px;background:'+pi.bg+';color:'+pi.color+';font-weight:700;white-space:nowrap">'+pi.icon+' '+pi.label+'</span>'+
      '</div>'+
      (g.deadline?'<div style="font-size:.63rem;color:#bbb;margin-bottom:8px">📅 '+g.deadline+'</div>':'')+
      body+
    '</div>';
  }).join('');
}

function checkIn(goalId, personKey){
  var today=todayStr();
  var existing=_logs.find(function(l){return l.goal_id===goalId&&l.person===personKey&&l.date===today;});
  if(existing){
    db.from('goal_logs').eq('id',existing.id).delete().then(function(){
      _logs=_logs.filter(function(l){return l.id!==existing.id;});
      _repaintAll();
    }).catch(function(e){alert('Erro: '+e.message);});
  } else {
    var row={id:uid(),goal_id:goalId,date:today,person:personKey};
    db.from('goal_logs').insert(row).then(function(res){
      _logs.push(Array.isArray(res)?res[0]:row);
      _repaintAll();
    }).catch(function(e){alert('Erro: '+e.message);});
  }
}

function _repaintAll(){
  // Reload all active widgets
  Object.keys(_widgets).forEach(function(cid){
    var el=document.getElementById(cid);
    if(!el) return;
    db.from('goals').eq('area',_widgets[cid]).select('*').then(function(res){
      var goals=(res||[]).filter(function(g){return g.hz!=='diario'&&g.progress<100;});
      _paint(el, goals);
    });
  });
}

window.GoalsWidget = { render: renderWidget, checkIn: checkIn };
}());
