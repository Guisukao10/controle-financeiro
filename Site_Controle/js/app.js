// app.js - inicialização e integrações
function highlightActiveRoute() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-link');
  links.forEach((link) => {
    const isActive = link.getAttribute('href') === path;
    link.classList.toggle('active', isActive);
  });
}

function initApp() {
  try {
    if (window.StorageService && typeof window.StorageService.initStorage === 'function') {
      window.StorageService.initStorage();
    }
    highlightActiveRoute();

    if (document.getElementById('lancamentoForm') && window.LancamentosPage && typeof window.LancamentosPage.init === 'function') {
      window.LancamentosPage.init();
    }

    if (document.getElementById('summaryCards') && window.DashboardPage && typeof window.DashboardPage.init === 'function') {
      window.DashboardPage.init();
    }

    const pageTitle = document.querySelector('.page-header h1')?.textContent.trim();
    if (pageTitle === 'Análise' && window.AnalisePage && typeof window.AnalisePage.init === 'function') {
      window.AnalisePage.init();
    }
    if (pageTitle === 'Forecast' && window.ForecastPage && typeof window.ForecastPage.init === 'function') {
      window.ForecastPage.init();
    }
    if (pageTitle === 'Cadastros' && window.CadastrosPage && typeof window.CadastrosPage.init === 'function') {
      window.CadastrosPage.init();
    }
    if (pageTitle === 'Configurações' && window.ConfiguracoesPage && typeof window.ConfiguracoesPage.init === 'function') {
      window.ConfiguracoesPage.init();
    }
    if (pageTitle === 'Importação de Dados' && window.ImportarPage && typeof window.ImportarPage.init === 'function') {
      window.ImportarPage.init();
    }
    if (pageTitle === 'Metas' && window.MetasPage && typeof window.MetasPage.init === 'function') {
      window.MetasPage.init();
    }

    console.info('App inicializado com sucesso');
  } catch (err) {
    console.error('Falha ao inicializar app', err);
  }
}

document.addEventListener('DOMContentLoaded', initApp);
