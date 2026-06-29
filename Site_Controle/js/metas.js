// metas.js - lógica da página de metas financeiras
const MetasPage = (function () {
  const TIPOS = [
    { value: 'poupanca', label: 'Poupança / Reserva' },
    { value: 'viagem', label: 'Viagem' },
    { value: 'compra', label: 'Compra de Bem' },
    { value: 'quitacao', label: 'Quitação de Dívida' },
    { value: 'educacao', label: 'Educação' },
    { value: 'outro', label: 'Outro' },
  ];

  const state = {
    editingId: null,
    formVisible: false,
  };

  function getMetas() {
    return StorageService.getMetas();
  }

  function calcProgresso(meta) {
    if (!meta.valorMeta || meta.valorMeta <= 0) return 0;
    return Math.min(100, Math.round(((meta.valorAtual || 0) / meta.valorMeta) * 100));
  }

  function getDiasRestantes(prazo) {
    if (!prazo) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const deadline = new Date(prazo + 'T00:00:00');
    return Math.floor((deadline - hoje) / (1000 * 60 * 60 * 24));
  }

  function tipoLabel(tipo) {
    const found = TIPOS.find(t => t.value === tipo);
    return found ? found.label : (tipo || 'Outro');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderSummary() {
    const metas = getMetas();
    const ativas = metas.filter(m => m.status === 'ativa');
    const concluidas = metas.filter(m => m.status === 'concluida');
    const totalPoupado = ativas.reduce((s, m) => s + (m.valorAtual || 0), 0);
    const totalMeta = ativas.reduce((s, m) => s + (m.valorMeta || 0), 0);
    const progressoMedio = totalMeta > 0 ? Math.round((totalPoupado / totalMeta) * 100) : 0;

    document.getElementById('metasSummary').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem;">
        <div class="dashboard-card dashboard-card-primary">
          <div class="card-title">Total de Metas</div>
          <div class="card-value">${metas.length}</div>
        </div>
        <div class="dashboard-card dashboard-card-info">
          <div class="card-title">Metas Ativas</div>
          <div class="card-value">${ativas.length}</div>
        </div>
        <div class="dashboard-card dashboard-card-success">
          <div class="card-title">Concluídas</div>
          <div class="card-value">${concluidas.length}</div>
        </div>
        <div class="dashboard-card dashboard-card-warning">
          <div class="card-title">Total Poupado (ativas)</div>
          <div class="card-value" style="font-size:1.3rem;">${Utils.formatCurrency(totalPoupado)}</div>
          ${totalMeta > 0 ? `<div style="font-size:0.78rem;color:var(--color-text-secondary);margin-top:0.25rem;">${progressoMedio}% de ${Utils.formatCurrency(totalMeta)}</div>` : ''}
        </div>
      </div>
    `;
  }

  function renderFormPanel(meta) {
    const isEdit = !!meta;
    return `
      <div class="panel" id="metaFormPanel" style="margin-bottom:1.5rem;">
        <h3>${isEdit ? 'Editar Meta' : 'Nova Meta'}</h3>
        <div class="form-group">
          <div style="flex:2;min-width:200px;">
            <label>Nome da Meta *</label>
            <input type="text" id="mfNome" placeholder="Ex: Viagem para Europa" value="${isEdit ? escapeHtml(meta.nome) : ''}" />
          </div>
          <div style="flex:1;min-width:160px;">
            <label>Tipo</label>
            <select id="mfTipo">
              ${TIPOS.map(t => `<option value="${t.value}"${isEdit && meta.tipo === t.value ? ' selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <div style="flex:1;min-width:160px;">
            <label>Valor da Meta (R$) *</label>
            <input type="number" id="mfValorMeta" placeholder="0,00" min="0" step="0.01" value="${isEdit ? meta.valorMeta : ''}" />
          </div>
          <div style="flex:1;min-width:160px;">
            <label>Valor Atual (R$)</label>
            <input type="number" id="mfValorAtual" placeholder="0,00" min="0" step="0.01" value="${isEdit ? (meta.valorAtual || 0) : 0}" />
          </div>
          <div style="flex:1;min-width:150px;">
            <label>Data de Início</label>
            <input type="date" id="mfDataInicio" value="${isEdit ? (meta.dataInicio || '') : new Date().toISOString().slice(0, 10)}" />
          </div>
          <div style="flex:1;min-width:150px;">
            <label>Prazo</label>
            <input type="date" id="mfPrazo" value="${isEdit ? (meta.prazo || '') : ''}" />
          </div>
        </div>
        <div class="form-group">
          <div style="flex:1;">
            <label>Descrição</label>
            <textarea id="mfDescricao" rows="2" placeholder="Detalhes sobre a meta...">${isEdit ? escapeHtml(meta.descricao || '') : ''}</textarea>
          </div>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:0.25rem;">
          <button class="btn btn-primary" onclick="MetasPage.salvarMeta()">${isEdit ? 'Salvar Alterações' : 'Criar Meta'}</button>
          <button class="btn" style="background:var(--color-gray-200);color:var(--color-gray-700);" onclick="MetasPage.cancelarForm()">Cancelar</button>
        </div>
      </div>
    `;
  }

  function renderDeadlineBadge(prazo) {
    if (!prazo) return '';
    const dias = getDiasRestantes(prazo);
    if (dias < 0) {
      return `<div style="margin-bottom:0.6rem;"><span style="color:var(--color-danger);font-size:0.78rem;font-weight:500;">&#9888; Prazo vencido há ${Math.abs(dias)} dia(s)</span></div>`;
    }
    if (dias === 0) {
      return `<div style="margin-bottom:0.6rem;"><span style="color:var(--color-danger);font-size:0.78rem;font-weight:600;">&#9888; Vence hoje!</span></div>`;
    }
    if (dias <= 30) {
      return `<div style="margin-bottom:0.6rem;"><span style="color:var(--color-warning);font-size:0.78rem;font-weight:500;">&#8987; ${dias} dias restantes</span></div>`;
    }
    return `<div style="margin-bottom:0.6rem;"><span style="color:var(--color-text-secondary);font-size:0.78rem;">Prazo: ${Utils.formatDate(prazo)}</span></div>`;
  }

  function renderMetaCard(meta) {
    const progresso = calcProgresso(meta);
    const faltam = Math.max(0, meta.valorMeta - (meta.valorAtual || 0));
    const isConcluida = meta.status === 'concluida';
    const isCancelada = meta.status === 'cancelada';

    let statusBg, statusColor, statusLabel, borderColor, progressColor;

    if (isConcluida) {
      statusBg = 'var(--color-success-light)'; statusColor = 'var(--color-success)';
      statusLabel = 'Concluída'; borderColor = 'var(--color-success)';
      progressColor = 'var(--color-success)';
    } else if (isCancelada) {
      statusBg = 'var(--color-danger-light)'; statusColor = 'var(--color-danger)';
      statusLabel = 'Cancelada'; borderColor = 'var(--color-gray-300)';
      progressColor = 'var(--color-gray-400)';
    } else {
      const diasRestantes = getDiasRestantes(meta.prazo);
      const prazoUrgente = diasRestantes !== null && diasRestantes < 30 && progresso < 70;
      statusBg = 'var(--color-primary-light)'; statusColor = 'var(--color-primary)';
      statusLabel = 'Ativa'; borderColor = 'var(--color-primary)';
      progressColor = progresso >= 100 ? 'var(--color-success)' : (prazoUrgente ? 'var(--color-warning)' : 'var(--color-primary)');
    }

    const acoesHtml = !isConcluida && !isCancelada ? `
      <button class="btn btn-small btn-primary" onclick="MetasPage.editarMeta('${meta.id}')">Editar</button>
      <button class="btn btn-small btn-success" onclick="MetasPage.aportarValor('${meta.id}')">Aportar</button>
      ${progresso >= 100 ? `<button class="btn btn-small btn-success" onclick="MetasPage.concluirMeta('${meta.id}')">Concluir</button>` : ''}
      <button class="btn btn-small" style="background:var(--color-gray-100);color:var(--color-gray-600);" onclick="MetasPage.cancelarMeta('${meta.id}')">Cancelar Meta</button>
    ` : `
      <button class="btn btn-small" style="background:var(--color-danger-light);color:var(--color-danger);" onclick="MetasPage.removerMeta('${meta.id}')">Remover</button>
    `;

    return `
      <div class="panel" style="border-left:4px solid ${borderColor};margin-bottom:0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
          <div>
            <div style="font-size:1rem;font-weight:600;color:var(--color-text);margin-bottom:0.15rem;">${escapeHtml(meta.nome)}</div>
            <span style="font-size:0.75rem;color:var(--color-text-secondary);">${tipoLabel(meta.tipo)}</span>
          </div>
          <span style="font-size:0.72rem;padding:0.2rem 0.65rem;border-radius:9999px;background:${statusBg};color:${statusColor};font-weight:600;white-space:nowrap;margin-left:0.5rem;">${statusLabel}</span>
        </div>
        ${meta.descricao ? `<p style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:0.75rem;">${escapeHtml(meta.descricao)}</p>` : ''}
        <div style="margin-bottom:0.6rem;">
          <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:0.3rem;">
            <span style="color:var(--color-text-secondary);">Progresso</span>
            <span style="font-weight:700;color:${progressColor};">${progresso}%</span>
          </div>
          <div style="height:8px;background:var(--color-gray-200);border-radius:9999px;overflow:hidden;">
            <div style="height:100%;width:${progresso}%;background:${progressColor};border-radius:9999px;transition:width 0.4s ease;"></div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.6rem;">
          <span>
            <strong style="color:${progressColor};">${Utils.formatCurrency(meta.valorAtual || 0)}</strong>
            <span style="color:var(--color-text-secondary);"> de ${Utils.formatCurrency(meta.valorMeta)}</span>
          </span>
          ${!isConcluida && !isCancelada ? `<span style="color:var(--color-text-secondary);">Faltam: <strong>${Utils.formatCurrency(faltam)}</strong></span>` : ''}
        </div>
        ${renderDeadlineBadge(meta.prazo)}
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem;">
          ${acoesHtml}
        </div>
      </div>
    `;
  }

  function renderMetas() {
    const metas = getMetas();
    const container = document.getElementById('metasList');

    if (metas.length === 0) {
      container.innerHTML = `
        <div class="panel" style="text-align:center;padding:2.5rem;color:var(--color-text-secondary);">
          <div style="font-size:2.5rem;margin-bottom:0.75rem;">&#127919;</div>
          <p style="font-size:1rem;font-weight:500;margin-bottom:0.4rem;">Nenhuma meta cadastrada ainda.</p>
          <p style="font-size:0.875rem;">Clique em <strong>+ Nova Meta</strong> para começar.</p>
        </div>
      `;
      return;
    }

    const ativas = metas.filter(m => m.status === 'ativa');
    const historico = metas.filter(m => m.status !== 'ativa');
    let html = '';

    if (ativas.length > 0) {
      html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1rem;margin-bottom:1rem;">${ativas.map(renderMetaCard).join('')}</div>`;
    } else {
      html += `<div class="panel" style="text-align:center;padding:1.5rem;color:var(--color-text-secondary);">
        <p style="font-size:0.9rem;">Nenhuma meta ativa no momento.</p>
      </div>`;
    }

    if (historico.length > 0) {
      html += `
        <div style="margin:1.5rem 0 0.75rem;display:flex;align-items:center;gap:0.75rem;">
          <span style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--color-text-secondary);font-weight:600;">Histórico</span>
          <div style="flex:1;height:1px;background:var(--color-border);"></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1rem;">${historico.map(renderMetaCard).join('')}</div>
      `;
    }

    container.innerHTML = html;
  }

  function renderAll() {
    renderSummary();
    renderMetas();
  }

  function showForm(meta) {
    state.formVisible = true;
    const formEl = document.getElementById('metasForm');
    formEl.innerHTML = renderFormPanel(meta || null);
    formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelarForm() {
    state.editingId = null;
    state.formVisible = false;
    document.getElementById('metasForm').innerHTML = '';
  }

  function salvarMeta() {
    const nome = document.getElementById('mfNome')?.value.trim();
    const tipo = document.getElementById('mfTipo')?.value;
    const valorMeta = parseFloat(document.getElementById('mfValorMeta')?.value || 0);
    const valorAtual = parseFloat(document.getElementById('mfValorAtual')?.value || 0);
    const dataInicio = document.getElementById('mfDataInicio')?.value;
    const prazo = document.getElementById('mfPrazo')?.value || '';
    const descricao = document.getElementById('mfDescricao')?.value.trim();

    if (!nome) { UI.showMessage('Informe o nome da meta'); return; }
    if (!valorMeta || valorMeta <= 0) { UI.showMessage('Informe um valor de meta válido'); return; }

    const now = new Date().toISOString();

    if (state.editingId) {
      StorageService.updateMeta(state.editingId, { nome, tipo, valorMeta, valorAtual, dataInicio, prazo, descricao: descricao || '', atualizadoEm: now });
      state.editingId = null;
      UI.showMessage('Meta atualizada com sucesso!');
    } else {
      StorageService.addMeta({
        id: Utils.generateId('meta'),
        nome, tipo, valorMeta,
        valorAtual: valorAtual || 0,
        dataInicio: dataInicio || now.slice(0, 10),
        prazo,
        descricao: descricao || '',
        status: 'ativa',
        criadoEm: now,
        atualizadoEm: now,
      });
      UI.showMessage('Meta criada com sucesso!');
    }

    cancelarForm();
    renderAll();
  }

  function editarMeta(id) {
    const meta = getMetas().find(m => m.id === id);
    if (!meta) return;
    state.editingId = id;
    showForm(meta);
  }

  function aportarValor(id) {
    const meta = getMetas().find(m => m.id === id);
    if (!meta) return;
    const input = prompt(
      `Aporte para "${meta.nome}"\nValor atual: ${Utils.formatCurrency(meta.valorAtual || 0)}\n\nInforme o valor do aporte (R$):`
    );
    if (input === null) return;
    const aporte = parseFloat(input.replace(',', '.'));
    if (isNaN(aporte) || aporte <= 0) { UI.showMessage('Valor inválido'); return; }
    StorageService.updateMeta(id, { valorAtual: (meta.valorAtual || 0) + aporte, atualizadoEm: new Date().toISOString() });
    UI.showMessage(`Aporte de ${Utils.formatCurrency(aporte)} registrado!`);
    renderAll();
  }

  function concluirMeta(id) {
    if (!confirm('Marcar esta meta como concluída?')) return;
    StorageService.updateMeta(id, { status: 'concluida', atualizadoEm: new Date().toISOString() });
    UI.showMessage('Meta concluída! Parabéns!');
    renderAll();
  }

  function cancelarMeta(id) {
    if (!confirm('Cancelar esta meta?')) return;
    StorageService.updateMeta(id, { status: 'cancelada', atualizadoEm: new Date().toISOString() });
    UI.showMessage('Meta cancelada.');
    renderAll();
  }

  function removerMeta(id) {
    if (!confirm('Remover esta meta permanentemente?')) return;
    StorageService.removeMeta(id);
    UI.showMessage('Meta removida.');
    renderAll();
  }

  function init() {
    document.getElementById('metasContent').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h2 style="font-size:1rem;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Suas Metas</h2>
        <button class="btn btn-primary" onclick="MetasPage.showForm()">+ Nova Meta</button>
      </div>
      <div id="metasForm"></div>
      <div id="metasList"></div>
    `;
    renderAll();
  }

  return { init, showForm, cancelarForm, salvarMeta, editarMeta, aportarValor, concluirMeta, cancelarMeta, removerMeta };
})();

window.MetasPage = MetasPage;
