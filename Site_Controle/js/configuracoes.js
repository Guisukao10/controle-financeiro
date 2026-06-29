// configuracoes.js - backup, import, export e sistema
const ConfiguracoesPage = (function () {
  function getTamanhoBytesStorage() {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  function formatarTamanho(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function exportarJSON() {
    const backup = {
      versao: '1.0',
      dataExportacao: new Date().toISOString(),
      lancamentos: StorageService.getLancamentos(),
      categorias: StorageService.getCategorias(),
      subcategorias: StorageService.getSubcategorias(),
      responsaveis: StorageService.getResponsaveis(),
      status: StorageService.getStatus(),
      tiposPagamento: StorageService.getTiposPagamento(),
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-financeiro-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    UI.showMessage('Backup exportado com sucesso');
  }

  function importarJSON() {
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files || !fileInput.files[0]) {
      alert('Selecione um arquivo JSON.');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const backup = JSON.parse(e.target.result);

        if (backup.versao !== '1.0') {
          alert('Versão de backup incompatível.');
          return;
        }

        if (!confirm('Isso vai sobrescrever todos os dados atuais. Continuar?')) {
          return;
        }

        StorageService.saveLancamentos(backup.lancamentos || []);
        StorageService.saveEntities('categorias', backup.categorias || []);
        StorageService.saveEntities('subcategorias', backup.subcategorias || []);
        StorageService.saveEntities('responsaveis', backup.responsaveis || []);
        StorageService.saveEntities('status', backup.status || []);
        StorageService.saveEntities('tiposPagamento', backup.tiposPagamento || []);

        fileInput.value = '';
        UI.showMessage('Backup restaurado com sucesso');
        setTimeout(() => location.reload(), 1500);
      } catch (er) {
        console.error(er);
        alert('Erro ao processar arquivo: ' + er.message);
      }
    };

    reader.readAsText(file);
  }

  function carregarMockados() {
    if (!confirm('Carregar dados de teste? Isso vai adicionar/alterar dados.')) return;

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
    };

    StorageService.saveEntities('categorias', MOCK.categorias);
    StorageService.saveEntities('subcategorias', MOCK.subcategorias);
    StorageService.saveEntities('responsaveis', MOCK.responsaveis);
    StorageService.saveEntities('status', MOCK.status);
    StorageService.saveEntities('tiposPagamento', MOCK.tiposPagamento);

    UI.showMessage('Dados mockados carregados com sucesso');
  }

  function resetarStorage() {
    if (!confirm('⚠ ATENÇÃO: Isso vai limpar TODOS os dados e recarregar a página. Tem certeza?')) {
      return;
    }
    if (!confirm('SEGUNDA CONFIRMAÇÃO: Esta ação é irreversível. Continuar?')) {
      return;
    }

    StorageService.resetAllData();
    UI.showMessage('localStorage foi resetado');
    setTimeout(() => location.reload(), 1500);
  }

  function limparStorageSem() {
    if (!confirm('Limpar localStorage sem recarregar?')) return;
    localStorage.clear();
    UI.showMessage('localStorage limpo (sem reload)');
  }

  function renderStats() {
    const container = document.getElementById('statsStorage');
    const tamanho = getTamanhoBytesStorage();
    const lancamentos = StorageService.getLancamentos().length;
    const categorias = StorageService.getCategorias().length;
    const subcategorias = StorageService.getSubcategorias().length;
    const responsaveis = StorageService.getResponsaveis().length;
    const status = StorageService.getStatus().length;
    const pagamentos = StorageService.getTiposPagamento().length;

    const html = `
Tamanho total: ${formatarTamanho(tamanho)}<br>
Lançamentos: ${lancamentos}<br>
Categorias: ${categorias}<br>
Subcategorias: ${subcategorias}<br>
Responsáveis: ${responsaveis}<br>
Status: ${status}<br>
Tipos de pagamento: ${pagamentos}
    `;

    container.innerHTML = html;
  }

  function renderDataAtual() {
    const el = document.getElementById('dataAtual');
    if (el) el.textContent = new Date().toLocaleString('pt-BR');
  }

  function renderEspacoStorage() {
    const el = document.getElementById('espacoStorage');
    if (el) el.textContent = formatarTamanho(getTamanhoBytesStorage());
  }

  function init() {
    renderDataAtual();
    renderEspacoStorage();
    renderStats();
  }

  return {
    init,
    exportarJSON,
    importarJSON,
    carregarMockados,
    resetarStorage,
    limparStorageSem,
  };
})();

window.ConfiguracoesPage = ConfiguracoesPage;
