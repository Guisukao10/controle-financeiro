// analise.js - lógica do dashboard principal
const AnalisePage = (function () {
  function getLancamentos() {
    return StorageService.getLancamentos() || [];
  }

  function getMonthKey(data) {
    const dt = new Date(data);
    if (Number.isNaN(dt.getTime())) return null;
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  }

  function groupBy(list, keyFn) {
    return list.reduce((acc, item) => {
      const key = keyFn(item);
      if (!key) return acc;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  function summarize(list) {
    return list.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  }

  function makeCards(metrics) {
    const container = document.getElementById('analiseCards');
    container.innerHTML = '';
    if (!metrics) {
      container.textContent = 'Sem dados para análise';
      return;
    }

    const cards = [
      ['Gastos por categoria', Utils.formatCurrency(metrics.totalGastosCategoria || 0), 'danger'],
      ['Gastos por subcategoria', Utils.formatCurrency(metrics.totalGastosSubcategoria || 0), 'danger'],
      ['Ganhos por categoria', Utils.formatCurrency(metrics.totalGanhosCategoria || 0), 'success'],
      ['Comparação entre meses (variação)', metrics.variacaoMes || '-', 'info'],
      ['Top maiores gastos', metrics.topMaiorGasto ? Utils.formatCurrency(metrics.topMaiorGasto.valor) : '-', 'warning'],
    ];

    cards.forEach(([title, value, variant]) => {
      const card = document.createElement('div');
      card.className = `dashboard-card dashboard-card-${variant}`;
      card.innerHTML = `<div class="card-title">${title}</div><div class="card-value">${value}</div>`;
      container.appendChild(card);
    });
  }

  function generateInsights(metrics) {
    const list = document.getElementById('insightsList');
    list.innerHTML = '';
    if (!metrics) {
      list.innerHTML = '<li>Sem insights disponíveis</li>';
      return;
    }

    const insights = [
      `Categoria com maior peso no mês: ${metrics.maiorCategoria || 'N/A'}`,
      `Mês com maior gasto: ${metrics.mesMaiorGasto || 'N/A'}`,
      `Responsável com maior gasto: ${metrics.responsavelMaiorGasto || 'N/A'}`,
      `Tendência de gastos: ${metrics.tendencia || 'Estável'}`,
      `Diferença ganhos - gastos do mês atual: ${Utils.formatCurrency(metrics.diferencaAtual || 0)}`,
    ];

    insights.forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      list.appendChild(item);
    });
  }

  function plotBarChart(canvasId, labels, data, label, color) {
    if (!document.getElementById(canvasId)) return null;
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label, data, backgroundColor: color }] },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });
  }

  function plotPieChart(canvasId, labels, data, label) {
    if (!document.getElementById(canvasId)) return null;
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ label, data, backgroundColor: ['#ef476f', '#fca311', '#2ec4b6', '#3a86ff', '#8d99ae'] }] },
      options: { responsive: true },
    });
  }

  function renderCharts(metrics) {
    const gastosCat = metrics.gastosPorCategoria;
    plotPieChart('chartGastosCategoriaAnalise', Object.keys(gastosCat), Object.values(gastosCat), 'Gastos por categoria');

    const gastosSub = metrics.gastosPorSubcategoria;
    plotPieChart('chartGastosSubcategoriaAnalise', Object.keys(gastosSub), Object.values(gastosSub), 'Gastos por subcategoria');

    const ganhosCat = metrics.ganhosPorCategoria;
    plotBarChart('chartGanhosCategoriaAnalise', Object.keys(ganhosCat), Object.values(ganhosCat), 'Ganhos por categoria', '#2ec4b6');

    const meses = metrics.saldoMensal.map((item) => item.mes);
    const saldo = metrics.saldoMensal.map((item) => item.saldo);
    plotBarChart('chartComparacaoMesAnalise', meses, saldo, 'Saldo mensal consolidado', '#4361ee');

    const resp = metrics.gastosPorResponsavel;
    plotBarChart('chartComparacaoResponsavelAnalise', Object.keys(resp), Object.values(resp), 'Gastos por responsável', '#ffb703');

    const valoresFixos = metrics.fixoVariavel ? metrics.fixoVariavel.fixo : 0;
    const valoresVariaveis = metrics.fixoVariavel ? metrics.fixoVariavel.variavel : 0;
    plotPieChart('chartFixosVariaveisAnalise', ['Fixos', 'Variáveis'], [valoresFixos, valoresVariaveis], 'Fixos vs Variáveis');
  }

  function renderTableList(containerId, data) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (!data || !data.length) {
      container.textContent = 'Sem dados.';
      return;
    }

    const table = document.createElement('table');
    table.className = 'grid-table small-table';
    table.innerHTML = '<thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead>';
    const body = document.createElement('tbody');

    data.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${Utils.formatDate(item.data)}</td><td>${item.descricao}</td><td>${UI.mapCategoryName(item.categoriaId)}</td><td>${Utils.formatCurrency(item.valor)}</td>`;
      body.appendChild(tr);
    });

    table.appendChild(body);
    container.appendChild(table);
  }

  function renderTables(metrics) {
    renderTableList('tabelaTopGastos', metrics.top5Gastos);

    const containerSaldo = document.getElementById('tabelaSaldoMensal');
    containerSaldo.innerHTML = '';
    if (!metrics.saldoMensal || !metrics.saldoMensal.length) {
      containerSaldo.textContent = 'Sem dados de saldo mensal.';
      return;
    }

    const table = document.createElement('table');
    table.className = 'grid-table small-table';
    table.innerHTML = '<thead><tr><th>Mês</th><th>Receita</th><th>Despesa</th><th>Saldo</th></tr></thead>';
    const body = document.createElement('tbody');

    metrics.saldoMensal.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.mes}</td><td>${Utils.formatCurrency(item.receita)}</td><td>${Utils.formatCurrency(item.despesa)}</td><td>${Utils.formatCurrency(item.saldo)}</td>`;
      body.appendChild(tr);
    });

    table.appendChild(body);
    containerSaldo.appendChild(table);
  }

  function calculateMetrics() {
    const lancamentos = getLancamentos();
    if (!lancamentos.length) return null;

    const gastos = lancamentos.filter((l) => l.tipo === 'despesa');
    const ganhos = lancamentos.filter((l) => l.tipo === 'receita');

    const gastosPorCategoria = groupBy(gastos, (l) => UI.mapCategoryName(l.categoriaId));
    const gastosPorSubcategoria = groupBy(gastos, (l) => UI.mapSubcategoryName(l.subcategoriaId));
    const ganhosPorCategoria = groupBy(ganhos, (l) => UI.mapCategoryName(l.categoriaId));
    const gastosPorResponsavel = groupBy(gastos, (l) => UI.mapResponsavelName(l.responsavelId));

    const gastoCategoriaSum = Object.fromEntries(Object.entries(gastosPorCategoria).map(([k,v]) => [k,summarize(v)]));
    const gastoSubcategoriaSum = Object.fromEntries(Object.entries(gastosPorSubcategoria).map(([k,v]) => [k,summarize(v)]));
    const ganhoCategoriaSum = Object.fromEntries(Object.entries(ganhosPorCategoria).map(([k,v]) => [k,summarize(v)]));
    const gastoResponsavelSum = Object.fromEntries(Object.entries(gastosPorResponsavel).map(([k,v]) => [k,summarize(v)]));

    const meses = groupBy(lancamentos, (l) => getMonthKey(l.data));
    const saldoMensal = Object.entries(meses).sort(([a], [b]) => {
      const [ma,ya] = a.split('/').map(Number);
      const [mb,yb] = b.split('/').map(Number);
      return ya - yb || ma - mb;
    }).map(([mes, items]) => {
      const receita = summarize(items.filter((x) => x.tipo === 'receita'));
      const despesa = summarize(items.filter((x) => x.tipo === 'despesa'));
      return { mes, receita, despesa, saldo: receita - despesa };
    });

    const top5Gastos = gastos.slice().sort((a,b)=>b.valor-a.valor).slice(0,5);
    const atual = new Date();
    const atualKey = `${String(atual.getMonth()+1).padStart(2,'0')}/${atual.getFullYear()}`;
    const atualEntry = saldoMensal.find((x)=>x.mes===atualKey) || { receita:0, despesa:0, saldo:0 };

    const maiorCategoria = Object.entries(gastoCategoriaSum).sort((a,b)=>b[1]-a[1])[0];
    const mesMaiorGasto = saldoMensal.slice().sort((a,b)=>b.despesa-a.despesa)[0];
    const responsavelMaiorGasto = Object.entries(gastoResponsavelSum).sort((a,b)=>b[1]-a[1])[0];

    let tendencia = 'Estável';
    if (saldoMensal.length >= 2) {
      const ultimo = saldoMensal[saldoMensal.length-1].saldo;
      const anterior = saldoMensal[saldoMensal.length-2].saldo;
      tendencia = ultimo > anterior ? 'Crescimento' : ultimo < anterior ? 'Queda' : 'Estável';
    }

    const mediaMensal = saldoMensal.length ? saldoMensal.reduce((acc,x)=>acc + x.saldo, 0)/saldoMensal.length : 0;

    return {
      gastosPorCategoria: gastoCategoriaSum,
      gastosPorSubcategoria: gastoSubcategoriaSum,
      ganhosPorCategoria: ganhoCategoriaSum,
      gastosPorResponsavel: gastoResponsavelSum,
      saldoMensal,
      top5Gastos,
      totalGastosCategoria: Object.values(gastoCategoriaSum).reduce((a,b)=>a+b,0),
      totalGastosSubcategoria: Object.values(gastoSubcategoriaSum).reduce((a,b)=>a+b,0),
      totalGanhosCategoria: Object.values(ganhoCategoriaSum).reduce((a,b)=>a+b,0),
      maiorCategoria: maiorCategoria ? maiorCategoria[0] : 'N/A',
      mesMaiorGasto: mesMaiorGasto ? mesMaiorGasto.mes : 'N/A',
      responsavelMaiorGasto: responsavelMaiorGasto ? responsavelMaiorGasto[0] : 'N/A',
      tendencia,
      diferencaAtual: atualEntry.receita - atualEntry.despesa,
      saldoMensalConsolidado: atualEntry.saldo,
      mediaMensal,
      fixoVariavel: {
        fixo: gastos.filter((x)=>x.fixoVariavel==='fixo').reduce((a,b)=>a+Number(b.valor||0),0),
        variavel: gastos.filter((x)=>x.fixoVariavel==='variavel').reduce((a,b)=>a+Number(b.valor||0),0),
      },
    };
  }

  function renderSummary(metrics) {
    document.getElementById('saldoMensalConsolidado').textContent = Utils.formatCurrency(metrics.saldoMensalConsolidado);
    document.getElementById('mediaMensal').textContent = Utils.formatCurrency(metrics.mediaMensal);
  }

  function init() {
    const metrics = calculateMetrics();
    makeCards(metrics);
    generateInsights(metrics);
    if (metrics) {
      renderCharts(metrics);
      renderTables(metrics);
      renderSummary(metrics);
    }
  }

  return { init };
})();

window.AnalisePage = AnalisePage;
