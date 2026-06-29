// importar.js - importação de Excel/CSV
const ImportarPage = (function () {
  let rawData = [];
  let headers = [];
  let columnMapping = {};
  let tipoLancamento = 'despesa';

  function parseFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
      UI.showMessage('Selecione um arquivo');
      return;
    }

    // Verificar se a extensão é suportada
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
      alert('Formato não suportado. Use .xlsx, .xls ou .csv');
      return;
    }

    // Verificar se XLSX está carregado (necessário para Excel)
    if (isExcel && !window.XLSX) {
      alert(
        'Erro: Biblioteca XLSX não foi carregada.\n\n' +
        'Possíveis causas:\n' +
        '• Problema de conexão com internet\n' +
        '• CDN indisponível\n\n' +
        'Tente novamente ou use um arquivo CSV.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (isCSV) {
          parseCSV(e.target.result);
        } else {
          parseExcel(e.target.result);
        }

        if (rawData.length < 1) {
          alert('Arquivo vazio ou inválido');
          return;
        }

        headers = rawData[0];
        columnMapping = {};
        headers.forEach((_, idx) => {
          columnMapping[idx] = null;
        });

        showStep('type');
        UI.showMessage('Arquivo carregado com sucesso');
      } catch (err) {
        console.error(err);
        alert('Erro ao ler arquivo: ' + err.message);
      }
    };

    reader.onerror = () => {
      alert('Erro ao ler o arquivo. Tente novamente.');
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'utf-8');
    }
  }

  function parseExcel(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  }

  function parseCSV(text) {
    // Parser simples para CSV
    const lines = text.split('\n').filter((line) => line.trim());
    rawData = lines.map((line) => {
      // Suporta CSV com ou sem quotes
      const regex = /"([^"]*)"|([^,]+)/g;
      const cells = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        cells.push(match[1] !== undefined ? match[1] : match[2].trim());
      }
      return cells;
    });
  }

  function handleFileSelect() {
    parseFile();
  }

  function showStep(step) {
    document.getElementById('stepUpload').style.display = step === 'upload' ? 'block' : 'none';
    document.getElementById('stepType').style.display = step === 'type' ? 'block' : 'none';
    document.getElementById('stepPreview').style.display = step === 'preview' ? 'block' : 'none';
    document.getElementById('stepValidation').style.display = step === 'validation' ? 'block' : 'none';
    document.getElementById('stepResult').style.display = step === 'result' ? 'block' : 'none';

    if (step === 'preview') renderPreview();
    if (step === 'validation') renderValidation();
  }

  function proceedToPreview() {
    tipoLancamento = document.querySelector('input[name="tipoLancamento"]:checked').value;
    showStep('preview');
  }

  function renderPreview() {
    const preview = document.getElementById('previewTable');
    preview.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'grid-table small-table';
    const tbody = document.createElement('tbody');

    rawData.slice(0, 6).forEach((row, rowIdx) => {
      if (rowIdx === 0) {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        row.forEach((cell) => {
          const th = document.createElement('th');
          th.textContent = String(cell || '');
          tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.appendChild(thead);
        return;
      }

      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.textContent = String(cell || '');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    preview.appendChild(table);

    renderMappingUI();
  }

  function renderMappingUI() {
    const container = document.getElementById('mappingContainer');
    container.innerHTML = '';

    const fieldOptions = [
      { value: null, label: '— Ignorar —' },
      { value: 'data', label: 'Data' },
      { value: 'descricao', label: 'Descrição' },
      { value: 'categoria', label: 'Categoria' },
      { value: 'subcategoria', label: 'Subcategoria' },
      { value: 'responsavel', label: 'Responsável' },
      { value: 'valor', label: 'Valor' },
      { value: 'status', label: 'Status' },
      { value: 'pagamento', label: 'Tipo de Pagamento' },
      { value: 'observacao', label: 'Observação' },
      { value: 'recorrente', label: 'Recorrente (sim/não)' },
      { value: 'fixoVariavel', label: 'Fixo/Variável' },
    ];

    headers.forEach((header, idx) => {
      const div = document.createElement('div');
      div.style.padding = '0.75rem';
      div.style.background = '#f3f4f6';
      div.style.borderRadius = '0.5rem';

      const label = document.createElement('label');
      label.textContent = String(header || `Coluna ${idx + 1}`);
      label.style.display = 'block';
      label.style.fontSize = '0.875rem';
      label.style.fontWeight = '600';
      label.style.marginBottom = '0.5rem';

      const select = document.createElement('select');
      select.style.width = '100%';
      select.style.padding = '0.5rem';
      select.style.borderRadius = '0.375rem';
      select.style.border = '1px solid #d1d5db';
      select.onchange = (e) => {
        columnMapping[idx] = e.target.value || null;
      };

      fieldOptions.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value || '';
        option.textContent = opt.label;
        option.selected = columnMapping[idx] === opt.value;
        select.appendChild(option);
      });

      div.appendChild(label);
      div.appendChild(select);
      container.appendChild(div);
    });

    const btnNext = document.createElement('div');
    btnNext.style.gridColumn = '1 / -1';
    btnNext.style.marginTop = '1.5rem';
    btnNext.innerHTML = `
      <button class="btn btn-primary" onclick="ImportarPage.proceedToValidation()">Próximo: Validação</button>
    `;
    container.appendChild(btnNext);
  }

  function proceedToValidation() {
    showStep('validation');
  }

  function renderValidation() {
    const errors = validateData();
    const resultDiv = document.getElementById('validationResult');
    resultDiv.innerHTML = '';

    const summary = document.createElement('div');
    summary.style.padding = '1rem';
    summary.style.background = '#f3f4f6';
    summary.style.borderRadius = '0.5rem';
    summary.style.marginBottom = '1rem';

    const totalRows = rawData.length - 1;
    const validRows = errors.filter((e) => !e.hasErrors).length;
    const invalidRows = errors.filter((e) => e.hasErrors).length;

    summary.innerHTML = `
      <p><strong>Total de linhas:</strong> ${totalRows}</p>
      <p><strong>Válidas:</strong> <span style="color: #10b981; font-weight: 600;">${validRows}</span></p>
      <p><strong>Com erro:</strong> <span style="color: ${invalidRows > 0 ? '#ef4444' : '#10b981'}; font-weight: 600;">${invalidRows}</span></p>
    `;
    resultDiv.appendChild(summary);

    if (invalidRows > 0) {
      const errorsDiv = document.createElement('div');
      errorsDiv.style.marginBottom = '1rem';
      const errTitle = document.createElement('h4');
      errTitle.textContent = 'Linhas com erro:';
      errTitle.style.fontSize = '0.95rem';
      errTitle.style.marginBottom = '0.5rem';
      errorsDiv.appendChild(errTitle);

      const errorTable = document.createElement('table');
      errorTable.className = 'grid-table small-table';
      errorTable.innerHTML = '<thead><tr><th>Linha</th><th>Problemas</th></tr></thead>';
      const tbody = document.createElement('tbody');

      errors.forEach((err, idx) => {
        if (err.hasErrors) {
          const tr = document.createElement('tr');
          const tdLine = document.createElement('td');
          tdLine.textContent = idx + 2;
          const tdErr = document.createElement('td');
          tdErr.textContent = err.errors.join(', ');
          tr.appendChild(tdLine);
          tr.appendChild(tdErr);
          tbody.appendChild(tr);
        }
      });

      errorTable.appendChild(tbody);
      errorsDiv.appendChild(errorTable);
      resultDiv.appendChild(errorsDiv);
    }

    if (invalidRows === 0 || validRows > 0) {
      const btnImport = document.getElementById('btnImport');
      btnImport.disabled = false;
      btnImport.style.opacity = '1';
    } else {
      const btnImport = document.getElementById('btnImport');
      btnImport.disabled = true;
      btnImport.style.opacity = '0.5';
      btnImport.innerHTML = 'Nenhuma linha válida para importar';
    }
  }

  function validateData() {
    const errors = [];

    for (let rowIdx = 1; rowIdx < rawData.length; rowIdx++) {
      const row = rawData[rowIdx];
      const rowErrors = [];

      // Pular se a linha está vazia
      const isEmptyRow = !row || row.length === 0 || row.every((cell) => !cell || String(cell).trim() === '');
      if (isEmptyRow) {
        errors.push({ hasErrors: true, errors: ['Linha vazia'] });
        continue;
      }

      const mapped = mapRow(row);

      // Validar se a linha não é uma linha de soma/total
      const firstCell = String(row[0] || '').toLowerCase().trim();
      if (['soma', 'total', 'subtotal', 'sub-total'].includes(firstCell)) {
        rowErrors.push('Linha de soma/total - ignorada');
        errors.push({ hasErrors: true, errors: rowErrors });
        continue;
      }

      // Chekando se tem dados mínimos
      if (!mapped.valor && !mapped.data) {
        rowErrors.push('Data e valor obrigatórios');
      }

      if (!mapped.valor) rowErrors.push('Valor obrigatório');
      if (!mapped.data) rowErrors.push('Data obrigatória');

      if (mapped.valor && isNaN(parseFloat(normalizeNumber(mapped.valor || 0)))) {
        rowErrors.push('Valor inválido (não é numérico)');
      }

      if (mapped.data && !Utils.isValidDateString(mapped.data)) {
        rowErrors.push('Data inválida (use DD/MM/YYYY ou YYYY-MM-DD)');
      }

      errors.push({ hasErrors: rowErrors.length > 0, errors: rowErrors });
    }

    return errors;
  }

  function mapRow(row) {
    const mapped = {};
    for (const [colIdx, fieldName] of Object.entries(columnMapping)) {
      if (fieldName) {
        mapped[fieldName] = row[parseInt(colIdx)] || null;
      }
    }
    return mapped;
  }

  function isValidDate(dateStr) {
    if (!dateStr) return false;
    return Utils.isValidDateString(dateStr);
  }

  function normalizeNumber(val) {
    if (typeof val === 'number') return val;
    const str = String(val || '').replace(/\s/g, '');
    return str.replace(',', '.');
  }

  function performImport() {
    const errors = validateData();
    const validRows = [];

    for (let rowIdx = 1; rowIdx < rawData.length; rowIdx++) {
      if (!errors[rowIdx - 1].hasErrors) {
        const row = rawData[rowIdx];
        const mapped = mapRow(row);
        validRows.push(mapped);
      }
    }

    if (validRows.length === 0) {
      alert('Nenhuma linha válida para importar');
      return;
    }

    const imported = [];
    const failed = [];

    validRows.forEach((mapped) => {
      try {
        const lancamento = createLancamentoFromImport(mapped);
        StorageService.addLancamento(lancamento);
        imported.push(lancamento);
      } catch (err) {
        failed.push(err.message);
      }
    });

    showResult(validRows.length, imported.length, failed.length);
  }

  function createLancamentoFromImport(mapped) {
    const dataISO = Utils.parseDateToISO(mapped.data);
    if (!dataISO) throw new Error('Data inválida');

    const valor = parseFloat(normalizeNumber(mapped.valor));
    if (isNaN(valor) || valor <= 0) throw new Error('Valor deve ser um número maior que zero');

    const categoriaId = findCategoryId(mapped.categoria);
    const responsavelId = findResponsavelId(mapped.responsavel);
    const pagamentoId = findPaymentId(mapped.pagamento) || findPaymentId('Dinheiro');
    const statusId = findStatusId(mapped.status) || findStatusId('Pago');

    const raw = {
      id: Utils.generateId('l'),
      data: dataISO,
      tipo: tipoLancamento,
      entryType: tipoLancamento === 'despesa' ? 'Gasto' : 'Ganho',
      categoriaId,
      responsavelId,
      pagamentoId,
      statusId,
      descricao: String(mapped.descricao || ''),
      valor,
      observacao: String(mapped.observacao || ''),
      recorrente: isTrue(mapped.recorrente),
      fixoVariavel: normalizeBool(mapped.fixoVariavel),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    return Utils.createLancamento(raw);
  }

  function findCategoryId(categoryName) {
    if (!categoryName) return null;
    const cats = StorageService.getCategorias();
    const cat = cats.find((c) => c.nome.toLowerCase() === String(categoryName).toLowerCase());
    return cat ? cat.id : null;
  }

  function findSubcategoryId(subcatName) {
    if (!subcatName) return null;
    const subs = StorageService.getSubcategorias();
    const sub = subs.find((s) => s.nome.toLowerCase() === String(subcatName).toLowerCase());
    return sub ? sub.id : null;
  }

  function findResponsavelId(respName) {
    if (!respName) return null;
    const resps = StorageService.getResponsaveis();
    const resp = resps.find((r) => r.nome.toLowerCase() === String(respName).toLowerCase());
    return resp ? resp.id : null;
  }

  function findPaymentId(paymentName) {
    if (!paymentName) return null;
    const pays = StorageService.getTiposPagamento();
    const pay = pays.find((p) => p.nome.toLowerCase() === String(paymentName).toLowerCase());
    return pay ? pay.id : null;
  }

  function findStatusId(statusName) {
    if (!statusName) return null;
    const statuses = StorageService.getStatus();
    const st = statuses.find((s) => s.nome.toLowerCase() === String(statusName).toLowerCase());
    return st ? st.id : null;
  }

  function isTrue(val) {
    if (typeof val === 'boolean') return val;
    const str = String(val || '').toLowerCase();
    return ['sim', 'yes', 'true', '1', 'verdadeiro'].includes(str);
  }

  function normalizeBool(val) {
    const str = String(val || '').toLowerCase();
    if (['fixo', 'fixed', 'constante'].includes(str)) return 'fixo';
    return 'variavel';
  }

  function showResult(total, imported, failed) {
    const report = document.getElementById('resultReport');
    report.innerHTML = `
Resumo da importação:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total de linhas processadas: ${total}
Importadas com sucesso:     ${imported} ✓
Com erro:                    ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tipo de lançamento:          ${tipoLancamento === 'despesa' ? 'Gastos' : 'Ganhos'}
Data/Hora da importação:     ${new Date().toLocaleString('pt-BR')}
    `;

    showStep('result');
    UI.showMessage(`${imported} registro(s) importado(s) com sucesso!`);
  }

  function reset() {
    rawData = [];
    headers = [];
    columnMapping = {};
    tipoLancamento = 'despesa';
    document.getElementById('fileInput').value = '';
    showStep('upload');
  }

  function init() {
    showStep('upload');

    // Verificar se XLSX está disponível e mostrar aviso se não estiver
    if (!window.XLSX) {
      const uploadPanel = document.getElementById('stepUpload');
      if (uploadPanel) {
        const warning = document.createElement('div');
        warning.style.background = '#fef3c7';
        warning.style.border = '1px solid #fcd34d';
        warning.style.borderRadius = '0.5rem';
        warning.style.padding = '0.75rem';
        warning.style.marginBottom = '1rem';
        warning.style.color = '#92400e';
        warning.innerHTML =
          '⚠️ <strong>Aviso:</strong> Biblioteca XLSX não foi carregada. ' +
          'Use arquivos CSV ou verifique sua conexão com a internet.';
        uploadPanel.insertBefore(warning, uploadPanel.firstChild);
      }
    }

    const typeRadios = document.querySelectorAll('input[name="tipoLancamento"]');
    typeRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        tipoLancamento = e.target.value;
      });
    });

    const nextButton = document.querySelector('.panel#stepType .form-group');
    if (nextButton) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Próximo: Pré-visualização';
      btn.style.marginTop = '1rem';
      btn.onclick = () => proceedToPreview();
      nextButton.parentElement.appendChild(btn);
    }
  }

  return {
    init,
    handleFileSelect,
    proceedToPreview,
    proceedToValidation,
    performImport,
    reset,
  };
})();

window.ImportarPage = ImportarPage;
