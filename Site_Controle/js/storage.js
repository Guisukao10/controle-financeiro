// storage.js - persistência localStorage centralizada
const STORAGE_KEYS = {
  lancamentos: 'cf_lancamentos',
  categorias: 'cf_categorias',
  subcategorias: 'cf_subcategorias',
  responsaveis: 'cf_responsaveis',
  status: 'cf_status',
  tiposPagamento: 'cf_tiposPagamento',
  metas: 'cf_metas',
};

const MOCK = {
  categorias: [
    { id: 'cat-1', nome: 'Alimentação' },
    { id: 'cat-2', nome: 'Transporte' },
    { id: 'cat-3', nome: 'Salário' },
    { id: 'cat-4', nome: 'Lazer' },
  ],
  subcategorias: [
    { id: 'sub-1', categoriaId: 'cat-1', nome: 'Supermercado' },
    { id: 'sub-2', categoriaId: 'cat-1', nome: 'Restaurante' },
    { id: 'sub-3', categoriaId: 'cat-2', nome: 'Uber' },
    { id: 'sub-4', categoriaId: 'cat-3', nome: 'Salário CLT' },
  ],
  responsaveis: [
    { id: 'resp-1', nome: 'Eu' },
    { id: 'resp-2', nome: 'Casa' },
  ],
  status: [
    { id: 'st-1', nome: 'Pago' },
    { id: 'st-2', nome: 'Pendente' },
    { id: 'st-3', nome: 'Cancelado' },
  ],
  tiposPagamento: [
    { id: 'tp-1', nome: 'Dinheiro' },
    { id: 'tp-2', nome: 'Cartão Débito' },
    { id: 'tp-3', nome: 'Cartão Crédito' },
    { id: 'tp-4', nome: 'Pix' },
  ],
  lancamentos: [
    {
      id: 'l-1',
      tipo: 'receita',
      categoriaId: 'cat-3',
      subcategoriaId: 'sub-4',
      responsavelId: 'resp-1',
      pagamentoId: 'tp-4',
      statusId: 'st-1',
      descricao: 'Salário mensal',
      valor: 4500.0,
      data: '2026-03-05',
      criadoEm: new Date().toISOString(),
    },
    {
      id: 'l-2',
      tipo: 'despesa',
      categoriaId: 'cat-1',
      subcategoriaId: 'sub-1',
      responsavelId: 'resp-1',
      pagamentoId: 'tp-1',
      statusId: 'st-1',
      descricao: 'Compras supermercado',
      valor: 320.45,
      data: '2026-03-07',
      criadoEm: new Date().toISOString(),
    },
  ],
};

function getDataStorage(key) {
  const json = localStorage.getItem(key);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (er) {
    console.warn('Erro ao parsear localStorage', key, er);
    return null;
  }
}

function setDataStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initStorage() {
  if (!getDataStorage(STORAGE_KEYS.categorias)) setDataStorage(STORAGE_KEYS.categorias, MOCK.categorias);
  if (!getDataStorage(STORAGE_KEYS.subcategorias)) setDataStorage(STORAGE_KEYS.subcategorias, MOCK.subcategorias);
  if (!getDataStorage(STORAGE_KEYS.responsaveis)) setDataStorage(STORAGE_KEYS.responsaveis, MOCK.responsaveis);
  if (!getDataStorage(STORAGE_KEYS.status)) setDataStorage(STORAGE_KEYS.status, MOCK.status);
  if (!getDataStorage(STORAGE_KEYS.tiposPagamento)) setDataStorage(STORAGE_KEYS.tiposPagamento, MOCK.tiposPagamento);
  if (!getDataStorage(STORAGE_KEYS.lancamentos)) setDataStorage(STORAGE_KEYS.lancamentos, MOCK.lancamentos);
}

function getEntities(entityType) {
  const key = STORAGE_KEYS[entityType];
  if (!key) throw new Error('Entidade desconhecida: ' + entityType);
  return getDataStorage(key) || [];
}

function saveEntities(entityType, array) {
  const key = STORAGE_KEYS[entityType];
  if (!key) throw new Error('Entidade desconhecida: ' + entityType);
  setDataStorage(key, array);
}

function addEntity(entityType, entity) {
  const list = getEntities(entityType);
  list.push(entity);
  saveEntities(entityType, list);
  return entity;
}

function updateEntity(entityType, id, data) {
  const list = getEntities(entityType);
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data };
  saveEntities(entityType, list);
  return list[idx];
}

function removeEntity(entityType, id) {
  const list = getEntities(entityType);
  const filtered = list.filter((item) => item.id !== id);
  saveEntities(entityType, filtered);
  return filtered;
}

function getLancamentos() {
  const result = getEntities('lancamentos');
  // Normalizar todos os lançamentos para formato padronizado
  return (result || []).map((item) => Utils && Utils.normalizeEntry ? Utils.normalizeEntry(item) : item);
}

function saveLancamentos(items) {
  saveEntities('lancamentos', items);
}

function addLancamento(lancamento) {
  if (!lancamento) return null;
  const normalized = Utils && Utils.normalizeEntry ? Utils.normalizeEntry(lancamento) : lancamento;
  return addEntity('lancamentos', normalized);
}

function updateLancamento(id, data) {
  return updateEntity('lancamentos', id, data);
}

function removeLancamento(id) {
  return removeEntity('lancamentos', id);
}

function getCategorias() { return getEntities('categorias'); }
function addCategoria(categoria) { return addEntity('categorias', categoria); }
function updateCategoria(id, data) { return updateEntity('categorias', id, data); }
function removeCategoria(id) { return removeEntity('categorias', id); }

function getSubcategorias() { return getEntities('subcategorias'); }
function addSubcategoria(sub) { return addEntity('subcategorias', sub); }
function updateSubcategoria(id, data) { return updateEntity('subcategorias', id, data); }
function removeSubcategoria(id) { return removeEntity('subcategorias', id); }

function getResponsaveis() { return getEntities('responsaveis'); }
function addResponsavel(res) { return addEntity('responsaveis', res); }
function updateResponsavel(id, data) { return updateEntity('responsaveis', id, data); }
function removeResponsavel(id) { return removeEntity('responsaveis', id); }

function getStatus() { return getEntities('status'); }
function addStatus(st) { return addEntity('status', st); }
function updateStatus(id, data) { return updateEntity('status', id, data); }
function removeStatus(id) { return removeEntity('status', id); }

function getTiposPagamento() { return getEntities('tiposPagamento'); }
function addTipoPagamento(tp) { return addEntity('tiposPagamento', tp); }
function updateTipoPagamento(id, data) { return updateEntity('tiposPagamento', id, data); }
function removeTipoPagamento(id) { return removeEntity('tiposPagamento', id); }

function getMetas() { return getEntities('metas'); }
function addMeta(meta) { return addEntity('metas', meta); }
function updateMeta(id, data) { return updateEntity('metas', id, data); }
function removeMeta(id) { return removeEntity('metas', id); }

function resetAllData() {
  localStorage.clear();
  initStorage();
}

// Export (global)
window.StorageService = {
  initStorage,
  getCategorias,
  addCategoria,
  updateCategoria,
  removeCategoria,
  getSubcategorias,
  addSubcategoria,
  updateSubcategoria,
  removeSubcategoria,
  getResponsaveis,
  addResponsavel,
  updateResponsavel,
  removeResponsavel,
  getStatus,
  addStatus,
  updateStatus,
  removeStatus,
  getTiposPagamento,
  addTipoPagamento,
  updateTipoPagamento,
  removeTipoPagamento,
  getLancamentos,
  saveLancamentos,
  addLancamento,
  updateLancamento,
  removeLancamento,
  getMetas,
  addMeta,
  updateMeta,
  removeMeta,
  resetAllData,
};
