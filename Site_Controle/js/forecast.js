// forecast.js - projeções financeiras do mês atual
const ForecastPage = (function () {
  let chartRealizadoPrevisto = null;
  let chartCategoriaProj = null;

  function getLancamentos() {
    return StorageService.getLancamentos() || [];
  }

  function getCurrentMonthPeriod() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0);
    return {
      inicio,
      fim,
      diaAtual: hoje.getDate(),
      diasNoMes: fim.getDate(),
      competencia: `${String(mes + 1).padStart(2, '0')}/${ano}`,
    };
  }

  function toDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function filterCurrentMonth(lancamentos) {
    const comp = getCurrentMonthPeriod().competencia;
    return lancamentos.filter((item) => Utils.calculateCompetencia(item.data) === comp);
  }

  function groupByCategoria(items) {
    return items.reduce((acc, item) => {
      const cat = UI.mapCategoryName(item.categoriaId || item.categoria || '');
      acc[cat] = (acc[cat] || 0) + Number(item.valor || 0);
      return acc;
    }, {});
  }

  function getRecorrentesAtuaisEProjetados(lancamentos) {
    const { inicio, fim } = getCurrentMonthPeriod();
    const recorrentes = lancamentos.filter((l) => l.recorrente || l.recorrencia);
    const atuais = [];
    const projetados = [];

    recorrentes.forEach((l) => {
      const baseDate = toDate(l.data);
      if (!baseDate) return;
      const intervalosDias = Number(l.intervaloDias || (l.recorrencia === 'mensal' ? 30 : 30));
      let data = new Date(baseDate);

      while (data <= fim) {
        if (data >= inicio && data <= fim) {
          const existente = lancamentos.some((x) => x.id !== l.id && x.recorrente && Utils.calculateCompetencia(x.data) === Utils.calculateCompetencia(data) && x.descricao === l.descricao && Number(x.valor) === Number(l.valor));
          if (!existente) {
            const instance = { ...l, data: Utils.parseDateToISO(data), id: `${l.id || 'recurr'}-${data.getTime()}` };
            projetados.push(instance);
          }
        }

        data = new Date(data);
        data.setDate(data.getDate() + intervalosDias);
      }

      if (baseDate >= inicio && baseDate <= fim) {
        atuais.push(l);
      }
    });

    return { atuais, projetados };
  }

  function calcularForecast() {
    const todos = getLancamentos();
    const mesAtual = filterCurrentMonth(todos);
    const { diaAtual, diasNoMes } = getCurrentMonthPeriod();

    const ganhosAtuais = mesAtual.filter((x) => x.tipo === 'receita').reduce((s, item) => s + Number(item.valor || 0), 0);
    const gastosAtuais = mesAtual.filter((x) => x.tipo === 'despesa').reduce((s, item) => s + Number(item.valor || 0), 0);

    const saldoAtual = ganhosAtuais - gastosAtuais;

    const { projetados: recorrentesProjetados } = getRecorrentesAtuaisEProjetados(todos);

    const ganhosRecorrentesProjetados = recorrentesProjetados.filter((x) => x.tipo === 'receita').reduce((s, x) => s + Number(x.valor || 0), 0);
    const gastosRecorrentesProjetados = recorrentesProjetados.filter((x) => x.tipo === 'despesa').reduce((s, x) => s + Number(x.valor || 0), 0);

    const diaPassado = Math.max(1, diaAtual);
    const mediaDiariaGastos = gastosAtuais / diaPassado;
    const diasRestantes = Math.max(0, diasNoMes - diaAtual);
    const projetadosVariavel = mediaDiariaGastos * diasRestantes;

    const gastoProjetadoTotal = gastosAtuais + projetadosVariavel + gastosRecorrentesProjetados;
    const ganhoProjetadoTotal = ganhosAtuais + ganhosRecorrentesProjetados;
    const saldoPrevisto = ganhoProjetadoTotal - gastoProjetadoTotal;

    const categoriasAtuais = groupByCategoria(mesAtual.filter((x) => x.tipo === 'despesa'));
    const totalGastosCategorias = Object.values(categoriasAtuais).reduce((s, v) => s + v, 0) || 0;

    const alocacaoPorCategoria = Object.fromEntries(
      Object.entries(categoriasAtuais).map(([cat, valor]) => {
        const proporcao = totalGastosCategorias > 0 ? valor / totalGastosCategorias : 0;
        const adicionalVariavel = projetadosVariavel * proporcao;
        return [cat, valor + adicionalVariavel];
      })
    );

    if (!Object.keys(alocacaoPorCategoria).length && projetadosVariavel > 0) {
      alocacaoPorCategoria['Outros'] = projetadosVariavel;
    }

    Object.keys(alocacaoPorCategoria).forEach((cat) => {
      const extra = totalGastosCategorias > 0 ? (gastosRecorrentesProjetados * (alocacaoPorCategoria[cat] / totalGastosCategorias)) : 0;
      alocacaoPorCategoria[cat] += extra;
    });

    return {
      ganhosAtuais,
      gastosAtuais,
      saldoAtual,
      gastoProjetadoTotal,
      ganhoProjetadoTotal,
      saldoPrevisto,
      projetadosVariavel,
      diasNoMes,
      diaAtual,
      categoriasAtuais,
      categoriasProjetadas: alocacaoPorCategoria,
      recorrentesProjetados,
    };
  }

  function renderKpis(data) {
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = Utils.formatCurrency(value);
    };

    setText('saldoAtual', data.saldoAtual);
    setText('gastoAtual', data.gastosAtuais);
    setText('ganhoAtual', data.ganhosAtuais);
    setText('gastoProjetado', data.gastoProjetadoTotal);
    setText('ganhoProjetado', data.ganhoProjetadoTotal);
    setText('saldoPrevisto', data.saldoPrevisto);

    const resumo = document.getElementById('forecastSummaryText');
    if (resumo) {
      resumo.textContent = `A previsão para o mês é ${Utils.formatCurrency(data.saldoPrevisto)}. ` +
        `Gasto atual: ${Utils.formatCurrency(data.gastosAtuais)}, ganho atual: ${Utils.formatCurrency(data.ganhosAtuais)}; estimamos o total de gasto como ${Utils.formatCurrency(data.gastoProjetadoTotal)} até o fim do mês.`;
    }
  }

  function renderCharts(data) {
    if (chartRealizadoPrevisto?.destroy) chartRealizadoPrevisto.destroy();
    if (chartCategoriaProj?.destroy) chartCategoriaProj.destroy();

    const ctx1 = document.getElementById('chartRealizadoPrevisto');
    if (ctx1) {
      chartRealizadoPrevisto = new Chart(ctx1.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Ganhos', 'Gastos'],
          datasets: [
            { label: 'Realizado', data: [data.ganhosAtuais, data.gastosAtuais], backgroundColor: ['#2ec4b6', '#ef476f'] },
            { label: 'Previsto', data: [data.ganhoProjetadoTotal, data.gastoProjetadoTotal], backgroundColor: ['#90e0ef', '#ffadad'] },
          ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
      });
    }

    const ctx2 = document.getElementById('chartCategoriaProj');
    if (ctx2) {
      chartCategoriaProj = new Chart(ctx2.getContext('2d'), {
        type: 'pie',
        data: {
          labels: Object.keys(data.categoriasProjetadas),
          datasets: [{
            label: 'Projeção por categoria',
            data: Object.values(data.categoriasProjetadas),
            backgroundColor: ['#f94144', '#f3722c', '#f8961e', '#90be6d', '#577590', '#43aa8b', '#4d908e', '#577590'],
          }],
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      });
    }
  }

  function init() {
    const forecastData = calcularForecast();
    renderKpis(forecastData);
    renderCharts(forecastData);
  }

  return { init };
})();

window.ForecastPage = ForecastPage;
