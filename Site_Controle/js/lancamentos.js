// lancamentos.js - lógica de lançamentos
const LancamentosPage = (function () {
  const state = {
    sortField: 'data',
    sortDir: 'asc',
    editingId: null,
  };

  const dom = {
    form: document.getElementById('lancamentoForm'),
    data: document.getElementById('data'),
    tipo: document.getElementById('tipo'),
    responsavel: document.getElementById('responsavel'),
    categoria: document.getElementById('categoria'),
    subcategoria: document.getElementById('subcategoria'),
    subcategoriaNova: document.getElementById('subcategoriaNova'),
    descricao: document.getElementById('descricao'),
    valor: document.getElementById('valor'),
    obs: document.getElementById('obs'),
    status: document.getElementById('status'),
    recorrente: document.getElementById('recorrente'),
    fixoVariavel: document.getElementById('fixoVariavel'),
    pagamento: document.getElementById('pagamento'),
    contadorRegistros: document.getElementById('contadorRegistros'),
    totalFiltrado: document.getElementById('totalFiltrado'),
    tabelaCorpo: document.querySelector('#tabelaLancamentos tbody'),
    filtroTexto: document.getElementById('filtroTexto'),
    filtroCompetencia: document.getElementById('filtroCompetencia'),
    filtroResponsavel: document.getElementById('filtroResponsavel'),
    filtroTipo: document.getElementById('filtroTipo'),
    filtroCategoria: document.getElementById('filtroCategoria'),
    filtroSubcategoria: document.getElementById('filtroSubcategoria'),
    filtroStatus: document.getElementById('filtroStatus'),
    filtroFixoVariavel: document.getElementById('filtroFixoVariavel'),
    btnLimparFiltros: document.getElementById('btnLimparFiltros'),
    tblHead: document.querySelectorAll('#tabelaLancamentos th[data-sort]'),
  };

  function preencherSelect(element, items, textFn, valueFn, withAllOption = false, selectedValue = '') {
    element.innerHTML = '';
    if (withAllOption) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Todos';
      element.appendChild(option);
    }
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = valueFn ? valueFn(item) : item.id;
      opt.textContent = textFn(item);
      if (selectedValue && opt.value === selectedValue) opt.selected = true;
      element.appendChild(opt);
    });
  }

  function carregarDadosBasicos() {
    preencherSelect(dom.responsavel, StorageService.getResponsaveis(), (x) => x.nome, (x) => x.id);
    preencherSelect(dom.categoria, StorageService.getCategorias(), (x) => x.nome, (x) => x.id);
    preencherSelect(dom.status, StorageService.getStatus(), (x) => x.nome, (x) => x.id);
    preencherSelect(dom.pagamento, StorageService.getTiposPagamento(), (x) => x.nome, (x) => x.id);

    preencherSelect(dom.filtroResponsavel, StorageService.getResponsaveis(), (x) => x.nome, (x) => x.id, true);
    preencherSelect(dom.filtroCategoria, StorageService.getCategorias(), (x) => x.nome, (x) => x.id, true);
    preencherSelect(dom.filtroStatus, StorageService.getStatus(), (x) => x.nome, (x) => x.id, true);

    atualizarSubcategorias();
    atualizarFiltroSubcategorias();
  }

  function atualizarSubcategorias(categoriaId = '') {
    let subs = StorageService.getSubcategorias();
    if (categoriaId) subs = subs.filter((sub) => sub.categoriaId === categoriaId);
    const items = [...subs];
    items.push({ id: 'novo', nome: 'Criar nova subcategoria' });
    preencherSelect(dom.subcategoria, items, (x) => x.nome, (x) => x.id);
    dom.subcategoriaNova.value = '';
    dom.subcategoriaNova.disabled = true;
  }

  function atualizarFiltroSubcategorias() {
    const subs = StorageService.getSubcategorias();
    preencherSelect(dom.filtroSubcategoria, subs, (x) => x.nome, (x) => x.id, true);
  }

  function getFormData() {
    const categoriaId = dom.categoria.value;
    let subcategoriaId = dom.subcategoria.value;

    if (subcategoriaId === 'novo') {
      const nomeSub = dom.subcategoriaNova.value.trim();
      if (!nomeSub) {
        throw new Error('Informe o nome da nova subcategoria');
      }
      const nova = { id: Utils.generateId('sub'), categoriaId, nome: nomeSub };
      StorageService.addSubcategoria(nova);
      subcategoriaId = nova.id;
      atualizarSubcategorias(categoriaId);
      atualizarFiltroSubcategorias();
      dom.subcategoria.value = subcategoriaId;
      UI.showMessage('Subcategoria criada e usada no lançamento', 'success');
    }

    const rawValor = Number(dom.valor.value);
    if (Number.isNaN(rawValor) || rawValor <= 0) throw new Error('Valor deve ser maior que zero');

    const payload = {
      id: state.editingId || Utils.generateId('l'),
      data: dom.data.value || new Date().toISOString().split('T')[0],
      tipo: dom.tipo.value,
      responsavelId: dom.responsavel.value,
      categoriaId,
      subcategoriaId,
      descricao: dom.descricao.value.trim(),
      valor: rawValor,
      obs: dom.obs.value.trim(),
      statusId: dom.status.value,
      recorrente: dom.recorrente.value,
      fixoVariavel: dom.fixoVariavel.value,
      pagamentoId: dom.pagamento.value,
    };

    return Utils.createLancamento(payload);
  }

  function renderTable(lancamentos) {
    dom.tabelaCorpo.innerHTML = '';
    lancamentos.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${Utils.formatDate(item.data)}</td>
        <td>${item.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
        <td>${UI.mapResponsavelName(item.responsavelId)}</td>
        <td>${UI.mapCategoryName(item.categoriaId)}</td>
        <td>${UI.mapSubcategoryName(item.subcategoriaId)}</td>
        <td>${item.descricao}</td>
        <td>${Utils.formatCurrency(item.valor)}</td>
        <td>${UI.mapStatusName(item.statusId)}</td>
        <td>${item.recorrente === 'sim' ? 'Sim' : 'Não'}</td>
        <td>${item.fixoVariavel === 'fixo' ? 'Fixo' : 'Variável'}</td>
        <td>${UI.mapPagamentoName(item.pagamentoId)}</td>
        <td class="action-cell">
          <button class="btn-table" data-action="editar" data-id="${item.id}">Editar</button>
          <button class="btn-table" data-action="excluir" data-id="${item.id}">Excluir</button>
          <button class="btn-table" data-action="duplicar" data-id="${item.id}">Duplicar</button>
        </td>
      `;
      dom.tabelaCorpo.appendChild(tr);
    });
  }

  function getFiltros() {
    return {
      texto: dom.filtroTexto.value.trim().toLowerCase(),
      competencia: dom.filtroCompetencia.value,
      responsavelId: dom.filtroResponsavel.value,
      tipo: dom.filtroTipo.value,
      categoriaId: dom.filtroCategoria.value,
      subcategoriaId: dom.filtroSubcategoria.value,
      statusId: dom.filtroStatus.value,
      fixoVariavel: dom.filtroFixoVariavel.value,
    };
  }

  function filtrarLancamentos(lista) {
    const filtro = getFiltros();
    return lista.filter((item) => {
      if (filtro.texto && !item.descricao.toLowerCase().includes(filtro.texto)) return false;
      if (filtro.competencia && item.data.slice(0, 7) !== filtro.competencia) return false;
      if (filtro.responsavelId && item.responsavelId !== filtro.responsavelId) return false;
      if (filtro.tipo && item.tipo !== filtro.tipo) return false;
      if (filtro.categoriaId && item.categoriaId !== filtro.categoriaId) return false;
      if (filtro.subcategoriaId && item.subcategoriaId !== filtro.subcategoriaId) return false;
      if (filtro.statusId && item.statusId !== filtro.statusId) return false;
      if (filtro.fixoVariavel && item.fixoVariavel !== filtro.fixoVariavel) return false;
      return true;
    });
  }

  function ordenarLancamentos(lista) {
    if (state.sortField === 'valor') {
      const listaOrdenada = [...lista].sort((a, b) => {
        const diff = (a.valor || 0) - (b.valor || 0);
        return state.sortDir === 'asc' ? diff : -diff;
      });
      return listaOrdenada;
    }
    return Utils.sortByDate(lista, state.sortField, state.sortDir);
  }

  function atualizarResumo(lista) {
    dom.contadorRegistros.textContent = lista.length;
    const total = lista.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    dom.totalFiltrado.textContent = Utils.formatCurrency(total);
  }

  function updateTable() {
    let dados = StorageService.getLancamentos();
    dados = filtrarLancamentos(dados);
    dados = ordenarLancamentos(dados);
    renderTable(dados);
    atualizarResumo(dados);
  }

  function setEditState(item) {
    state.editingId = item.id;
    dom.data.value = item.data;
    dom.tipo.value = item.tipo;
    dom.responsavel.value = item.responsavelId;
    dom.categoria.value = item.categoriaId;
    atualizarSubcategorias(item.categoriaId);
    dom.subcategoria.value = item.subcategoriaId || 'novo';
    dom.descricao.value = item.descricao;
    dom.valor.value = item.valor;
    dom.obs.value = item.obs;
    dom.status.value = item.statusId;
    dom.recorrente.value = item.recorrente;
    dom.fixoVariavel.value = item.fixoVariavel;
    dom.pagamento.value = item.pagamentoId;
  }

  function resetForm() {
    state.editingId = null;
    dom.form.reset();
    dom.subcategoriaNova.value = '';
    dom.subcategoriaNova.disabled = true;
    dom.data.value = new Date().toISOString().substr(0, 10);
  }

  function registerEvents() {
    dom.categoria.addEventListener('change', (e) => atualizarSubcategorias(e.target.value));

    dom.subcategoria.addEventListener('change', (e) => {
      const isNovo = e.target.value === 'novo';
      dom.subcategoriaNova.disabled = !isNovo;
      if (!isNovo) dom.subcategoriaNova.value = '';
    });

    dom.form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      try {
        const data = getFormData();
        if (state.editingId) {
          StorageService.updateLancamento(state.editingId, data);
          UI.showMessage('Lançamento atualizado com sucesso.', 'success');
        } else {
          StorageService.addLancamento(data);
          UI.showMessage('Lançamento criado com sucesso.', 'success');
        }
        resetForm();
        updateTable();
      } catch (err) {
        UI.showMessage(err.message || 'Erro ao salvar lançamento', 'error');
      }
    });

    dom.btnLimparFiltros.addEventListener('click', () => {
      dom.filtroTexto.value = '';
      dom.filtroCompetencia.value = '';
      dom.filtroResponsavel.value = '';
      dom.filtroTipo.value = '';
      dom.filtroCategoria.value = '';
      dom.filtroSubcategoria.value = '';
      dom.filtroStatus.value = '';
      dom.filtroFixoVariavel.value = '';
      updateTable();
    });

    [
      dom.filtroTexto,
      dom.filtroCompetencia,
      dom.filtroResponsavel,
      dom.filtroTipo,
      dom.filtroCategoria,
      dom.filtroSubcategoria,
      dom.filtroStatus,
      dom.filtroFixoVariavel,
    ].forEach((el) => el.addEventListener('change', () => updateTable()));

    dom.tabelaCorpo.addEventListener('click', (ev) => {
      const button = ev.target.closest('button');
      if (!button) return;
      const action = button.dataset.action;
      const id = button.dataset.id;
      const lancamento = StorageService.getLancamentos().find((item) => item.id === id);
      if (!lancamento) return;

      if (action === 'editar') {
        setEditState(lancamento);
        UI.showMessage('Modo edição ativado para o lançamento selecionado', 'success');
      } else if (action === 'excluir') {
        if (confirm('Confirmar exclusão deste lançamento?')) {
          StorageService.removeLancamento(id);
          updateTable();
          UI.showMessage('Lançamento excluído.', 'success');
        }
      } else if (action === 'duplicar') {
        const clone = { ...lancamento, id: Utils.generateId('l'), criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
        StorageService.addLancamento(Utils.createLancamento(clone));
        updateTable();
        UI.showMessage('Lançamento duplicado.', 'success');
      }
    });

    dom.tblHead.forEach((th) => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (!field) return;
        if (state.sortField === field) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortField = field;
          state.sortDir = 'asc';
        }
        updateTable();
      });
    });
  }

  function init() {
    try {
      carregarDadosBasicos();
      resetForm();
      registerEvents();
      updateTable();
    } catch (error) {
      console.error('Erro inicializando página de lançamentos', error);
      UI.showMessage('Erro ao inicializar lançamentos', 'error');
    }
  }

  return { init };
})();

window.LancamentosPage = LancamentosPage;
