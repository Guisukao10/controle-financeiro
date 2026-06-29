// ui.js - lógica JS a implementar\nfunction mapCategoryName(id) {
  const categorias = StorageService.getCategorias ? StorageService.getCategorias() : [];
  const cat = categorias.find((c) => c.id === id);
  return cat ? cat.nome : 'Não informado';
}

function mapSubcategoryName(id) {
  const subs = StorageService.getSubcategorias ? StorageService.getSubcategorias() : [];
  const sub = subs.find((s) => s.id === id);
  return sub ? sub.nome : 'Não informado';
}

function mapResponsavelName(id) {
  const resp = StorageService.getResponsaveis ? StorageService.getResponsaveis() : [];
  const r = resp.find((u) => u.id === id);
  return r ? r.nome : 'Não informado';
}

function showMessage(text, duration = 2000) {
  const msg = document.createElement('div');
  msg.className = 'message';
  msg.textContent = text;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), duration);
}

window.UI = {
  mapCategoryName,
  mapSubcategoryName,
  mapResponsavelName,
  showMessage,
};