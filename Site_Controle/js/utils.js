// utils.js - utilitários globais
function formatCurrency(value, locale='pt-BR', currency='BRL') {
  const number = Number(value) || 0;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(number);
}

function formatDate(dateInput, locale='pt-BR') {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

// Função robusta para parsear datas em múltiplos formatos
function parseBrazilianDate(dateStr) {
  if (!dateStr) return null;
  
  const str = String(dateStr).trim();
  
  // Padrão 1: DD/MM/YYYY
  const brazilPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const brazilMatch = str.match(brazilPattern);
  if (brazilMatch) {
    const [, day, month, year] = brazilMatch;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    
    // Validar dia e mês
    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;
    
    // Criar data UTC para evitar problemas de timezone
    const date = new Date(Date.UTC(y, m - 1, d));
    
    // Validar se o dia foi preservado (detecta datas inválidas como 31/02)
    if (date.getUTCDate() !== d) return null;
    
    return date.toISOString().split('T')[0]; // Retorna YYYY-MM-DD
  }
  
  // Padrão 2: YYYY-MM-DD (ISO)
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = str.match(isoPattern);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    
    // Validar
    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;
    
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCDate() !== d) return null;
    
    return date.toISOString().split('T')[0];
  }
  
  // Padrão 3: Tentar novo Date() como fallback para outros formatos
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  
  return null;
}

// Função para validar se uma string é uma data válida
function isValidDateString(dateStr) {
  return parseBrazilianDate(dateStr) !== null;
}

function parseDateToISO(value) {
  if (!value) return null;
  
  // Tentar parser brasileiro primeiro
  const result = parseBrazilianDate(value);
  if (result) return result;
  
  // Fallback para DATE nativo
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function generateId(prefix='id') {
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${Date.now()}-${random}`;
}

function calculateMonth(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return d.getMonth() + 1;
}

function calculateYear(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

function calculateCompetencia(dateInput) {
  const month = calculateMonth(dateInput);
  const year = calculateYear(dateInput);
  return month && year ? `${String(month).padStart(2, '0')}/${year}` : '';
}

function getWeekday(dateInput, locale='pt-BR') {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
}

function sortByDate(items, dateField='data', direction='asc') {
  const factor = direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const da = new Date(a[dateField]).getTime() || 0;
    const db = new Date(b[dateField]).getTime() || 0;
    return (da - db) * factor;
  });
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const rawData = entry.data || entry.date || entry.dataISO || entry.dateISO;
  const dateISO = parseDateToISO(rawData) || new Date().toISOString().split('T')[0];
  const month = calculateMonth(dateISO);
  const year = calculateYear(dateISO);
  const competence = calculateCompetencia(dateISO);
  const weekday = getWeekday(dateISO);

  const rawAmount = entry.amount != null ? entry.amount : entry.valor;
  const amount = Number(rawAmount || 0);

  const entryType = entry.entryType || entry.tipo || 'despesa';
  const recurring = typeof entry.recurring === 'boolean' ? entry.recurring : ['sim', 'true', '1', 'verdadeiro'].includes(String(entry.recorrente || '').toLowerCase());
  const fixedOrVariable = entry.fixedOrVariable || entry.fixoVariavel || 'variavel';

  const status = entry.status || (entry.statusId ? String(entry.statusId) : null);
  const paymentType = entry.paymentType || (entry.pagamentoId ? String(entry.pagamentoId) : null);

  const category = entry.category || (entry.categoriaId ? String(entry.categoriaId) : null);
  const subcategory = entry.subcategory || (entry.subcategoriaId ? String(entry.subcategoriaId) : null);
  const responsible = entry.responsible || (entry.responsavelId ? String(entry.responsavelId) : null);

  const normalized = {
    id: entry.id || generateId('l'),
    date: dateISO,
    data: dateISO,
    month,
    year,
    competence,
    weekday,
    entryType,
    tipo: entryType,
    responsible,
    responsavelId: entry.responsavelId || responsible,
    category,
    categoriaId: entry.categoriaId || category,
    subcategory,
    subcategoriaId: entry.subcategoriaId || subcategory,
    description: entry.description || entry.descricao || '',
    descricao: entry.descricao || entry.description || '',
    amount,
    valor: amount,
    notes: entry.notes || entry.observacao || entry.obs || '',
    observacao: entry.observacao || entry.notes || entry.obs || '',
    obs: entry.obs || entry.observacao || entry.notes || '',
    status,
    statusId: entry.statusId || status,
    recurring,
    recorrente: recurring,
    fixedOrVariable,
    fixoVariavel: fixedOrVariable,
    paymentType,
    pagamentoId: entry.pagamentoId || paymentType,
    criadoEm: entry.criadoEm || new Date().toISOString(),
    atualizadoEm: entry.atualizadoEm || new Date().toISOString(),
  };

  return normalized;
}

function createLancamento(payload) {
  const raw = {
    id: payload.id || generateId('l'),
    tipo: payload.tipo || 'despesa',
    categoriaId: payload.categoriaId || payload.category || null,
    subcategoriaId: payload.subcategoriaId || payload.subcategory || null,
    responsavelId: payload.responsavelId || payload.responsible || null,
    pagamentoId: payload.pagamentoId || payload.paymentType || null,
    statusId: payload.statusId || payload.status || null,
    descricao: payload.descricao || payload.description || '',
    valor: Number(payload.valor != null ? payload.valor : payload.amount || 0),
    data: parseDateToISO(payload.data || payload.date) || new Date().toISOString().split('T')[0],
    observacao: payload.observacao || payload.notes || payload.obs || '',
    recorrente: payload.recorrente != null ? payload.recorrente : payload.recurring === true,
    fixoVariavel: payload.fixoVariavel || payload.fixedOrVariable || 'variavel',
    criadoEm: payload.criadoEm || new Date().toISOString(),
    atualizadoEm: payload.atualizadoEm || new Date().toISOString(),
  };

  return normalizeEntry(raw);
}

window.Utils = {
  formatCurrency,
  formatDate,
  parseBrazilianDate,
  isValidDateString,
  parseDateToISO,
  generateId,
  calculateMonth,
  calculateYear,
  calculateCompetencia,
  getWeekday,
  sortByDate,
  createLancamento,
  normalizeEntry,
};
