/**
 * Lista Oferta A - Frontend Application
 */

const STATE = {
  products: [],
  filteredProducts: [],
  rubros: [],
  selectedRubro: 'TODOS',
  searchTerm: '',
  hidePrices: false,
  cart: [],
  config: {},
  metadata: {},
  chunkSize: 100,
  renderedCount: 100
};

// Format currency in Argentine standard: $ 12.544,33
function formatMoney(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '$ 0,00';
  const parts = amount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${intPart},${parts[1]}`;
}

// Format date
function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Show Toast
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white';
  toast.className = `${bg} px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// Initialize Application
async function initApp() {
  loadLocalCart();
  loadHidePricePreference();
  setupEventListeners();
  setupSSE();
  await fetchCatalog();
}

// Setup Server-Sent Events for real-time Excel updates
function setupSSE() {
  try {
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'CATALOG_UPDATED') {
          showToast('🔄 ¡Precios actualizados desde Excel!', 'success');
          fetchCatalog(false);
        }
      } catch (err) {}
    };
  } catch (err) {
    console.warn('SSE no disponible:', err);
  }
}

// Load catalog from API
async function fetchCatalog(showLoading = true) {
  if (showLoading) {
    document.getElementById('loadingIndicator').classList.remove('hidden');
    document.getElementById('catalogContainer').innerHTML = '';
  }

  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Error al conectar con el servidor.');
    const data = await res.json();

    STATE.products = data.products || [];
    STATE.rubros = data.rubros || [];
    STATE.config = data.config || {};
    STATE.metadata = data.metadata || {};

    updateHeaderInfo();
    renderCategoryPills();
    applyFilter();
    updateSyncModalInfo();

  } catch (err) {
    console.error('Error cargando catálogo:', err);
    document.getElementById('loadingIndicator').innerHTML = `
      <div class="text-red-500 font-bold mb-2">Error al cargar productos</div>
      <p class="text-xs text-gray-500">${err.message}</p>
      <button onclick="fetchCatalog()" class="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded text-xs">Reintentar</button>
    `;
  } finally {
    document.getElementById('loadingIndicator').classList.add('hidden');
  }
}

// Update Top bar header
function updateHeaderInfo() {
  const cfg = STATE.config;
  if (cfg.title) document.getElementById('headerTitle').textContent = cfg.title;
  if (cfg.schedule) document.getElementById('headerSchedule').textContent = cfg.schedule;
  if (cfg.whatsappDisplay) document.getElementById('headerWhatsappText').textContent = cfg.whatsappDisplay;
  if (cfg.whatsappPhone) {
    document.getElementById('headerWhatsappLink').href = `https://wa.me/${cfg.whatsappPhone}`;
  }
  if (STATE.metadata.fileName) {
    document.getElementById('badgeFile').textContent = `Excel: ${STATE.metadata.fileName}`;
  }
}

// Render horizontal category pills
function renderCategoryPills() {
  const container = document.getElementById('categoryPills');
  let html = `
    <button data-rubro="TODOS" class="pill-btn ${STATE.selectedRubro === 'TODOS' ? 'active' : ''} flex-shrink-0 px-3.5 py-1.5 rounded-full font-bold transition">
      TODOS
    </button>
  `;

  STATE.rubros.forEach(rub => {
    const isActive = STATE.selectedRubro === rub;
    html += `
      <button data-rubro="${rub}" class="pill-btn ${isActive ? 'active' : ''} flex-shrink-0 px-3.5 py-1.5 rounded-full font-bold transition">
        ${rub}
      </button>
    `;
  });

  container.innerHTML = html;

  // Add click handlers
  container.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rubro = btn.getAttribute('data-rubro');
      setCategory(rubro);
    });
  });
}

function setCategory(rubro) {
  STATE.selectedRubro = rubro;
  document.querySelectorAll('#categoryPills .pill-btn').forEach(btn => {
    if (btn.getAttribute('data-rubro') === rubro) {
      btn.classList.add('active');
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      btn.classList.remove('active');
    }
  });

  applyFilter();
}

// Apply Search & Rubro filters
function applyFilter() {
  const search = STATE.searchTerm.trim().toLowerCase();
  const selected = STATE.selectedRubro;

  STATE.filteredProducts = STATE.products.filter(p => {
    // Rubro filter
    if (selected !== 'TODOS' && p.rubro !== selected) {
      return false;
    }

    // Search filter
    if (search) {
      const matchName = p.name && p.name.toLowerCase().includes(search);
      const matchFullName = p.fullName && p.fullName.toLowerCase().includes(search);
      const matchCode = p.code && p.code.toLowerCase().includes(search);
      const matchSupp = p.supplierCode && p.supplierCode.toLowerCase().includes(search);
      const matchSub = p.subrubro && p.subrubro.toLowerCase().includes(search);
      return matchName || matchFullName || matchCode || matchSupp || matchSub;
    }

    return true;
  });

  // Update counts
  const countEl = document.getElementById('articlesCount');
  const count = STATE.filteredProducts.length;
  countEl.textContent = `${count.toLocaleString('es-AR')} artículos`;

  const emptyEl = document.getElementById('emptyState');
  if (count === 0) {
    emptyEl.classList.remove('hidden');
    document.getElementById('catalogContainer').innerHTML = '';
  } else {
    emptyEl.classList.add('hidden');
    renderCatalog();
  }
}

// Group products by Rubro and Subrubro
function groupProducts(products) {
  const map = new Map(); // Rubro -> Map(Subrubro -> [products])

  products.forEach(p => {
    if (!map.has(p.rubro)) {
      map.set(p.rubro, new Map());
    }
    const subMap = map.get(p.rubro);
    const sub = p.subrubro || 'General';
    if (!subMap.has(sub)) {
      subMap.set(sub, []);
    }
    subMap.get(sub).push(p);
  });

  return map;
}

// Render Catalog DOM
function renderCatalog() {
  const container = document.getElementById('catalogContainer');
  const grouped = groupProducts(STATE.filteredProducts);

  let html = '';

  grouped.forEach((subMap, rubro) => {
    let totalInRubro = 0;
    subMap.forEach(prods => totalInRubro += prods.length);

    html += `
      <section class="catalog-rubro-section" id="rubro_${encodeURIComponent(rubro)}">
        <!-- Rubro Header -->
        <div class="flex items-center gap-3 mb-3 pt-2">
          <h2 class="category-title">${rubro}</h2>
          <span class="text-xs text-gray-400 font-medium whitespace-nowrap">${totalInRubro} artículos</span>
          <div class="flex-1 h-px bg-blue-200"></div>
        </div>
    `;

    subMap.forEach((prods, subrubro) => {
      html += `
        <div class="mb-5 bg-white rounded-md shadow-xs border border-gray-200 overflow-hidden">
          <!-- Subrubro Banner -->
          <div class="subcategory-banner flex items-center justify-between">
            <span>${subrubro}</span>
            <span class="text-xs opacity-80 font-normal">${prods.length} u.</span>
          </div>
          <!-- Product Cards List -->
          <div class="divide-y divide-gray-100">
      `;

      prods.forEach(p => {
        const priceDisplay = STATE.hidePrices 
          ? '<span class="text-xs text-gray-400 font-semibold italic">Consultar</span>'
          : `<span class="price-tag">${formatMoney(p.price)}</span>`;

        // Thumbnail fallback icon
        const thumbHtml = `
          <div class="product-img-box text-blue-400">
            <svg class="w-7 h-7 stroke-current" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
        `;

        html += `
          <div class="product-card" data-id="${p.id}">
            <!-- Left: Image -->
            ${thumbHtml}

            <!-- Center: Info -->
            <div class="flex-1 min-w-0 pr-1">
              <div class="flex items-center flex-wrap gap-1">
                <span class="font-bold text-gray-800 text-xs sm:text-sm tracking-tight leading-snug">
                  ${p.name}
                </span>
                ${p.presentation ? `<span class="presentation-badge">${p.presentation}</span>` : ''}
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="font-mono text-[11px] sm:text-xs text-gray-500 font-semibold">
                  ${p.code}
                </span>
                ${p.isInternal && p.supplierCode !== p.code ? `
                  <span class="text-[10px] text-gray-400" title="Código original del proveedor">
                    (ref: ${p.supplierCode})
                  </span>
                ` : ''}
              </div>
            </div>

            <!-- Right: Price & Pedir -->
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              ${priceDisplay}
              <button 
                onclick="addToCart('${p.id}')"
                class="btn-pedir flex items-center gap-1 active:scale-95"
              >
                + PEDIR
              </button>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `</section>`;
  });

  container.innerHTML = html;
}

// Setup Event Listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');

  searchInput.addEventListener('input', (e) => {
    STATE.searchTerm = e.target.value;
    if (STATE.searchTerm) {
      btnClearSearch.classList.remove('hidden');
    } else {
      btnClearSearch.classList.add('hidden');
    }
    applyFilter();
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    STATE.searchTerm = '';
    btnClearSearch.classList.add('hidden');
    searchInput.focus();
    applyFilter();
  });

  // "Ver sin precio" checkbox
  const checkSinPrecio = document.getElementById('checkSinPrecio');
  checkSinPrecio.addEventListener('change', (e) => {
    STATE.hidePrices = e.target.checked;
    localStorage.setItem('hidePricesPref', STATE.hidePrices ? 'true' : 'false');
    renderCatalog();
  });

  // Cart Modal Toggle
  document.getElementById('btnOpenCart').addEventListener('click', openCartModal);
  document.getElementById('btnCloseCart').addEventListener('click', closeCartModal);
  document.getElementById('btnClearCart').addEventListener('click', clearCart);
  document.getElementById('btnSendWhatsapp').addEventListener('click', sendOrderWhatsapp);

  // Sync Modal Toggle
  document.getElementById('btnOpenSync').addEventListener('click', openSyncModal);
  document.getElementById('btnCloseSync').addEventListener('click', closeSyncModal);
  document.getElementById('btnTriggerSync').addEventListener('click', triggerLocalSync);

  // Upload Excel drag & drop
  setupExcelUploader();
}

function loadHidePricePreference() {
  const pref = localStorage.getItem('hidePricesPref');
  if (pref === 'true') {
    STATE.hidePrices = true;
    document.getElementById('checkSinPrecio').checked = true;
  }
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  STATE.searchTerm = '';
  document.getElementById('btnClearSearch').classList.add('hidden');
  setCategory('TODOS');
}

// ---------------------------------------------------------------------
// Cart Logic
// ---------------------------------------------------------------------

function loadLocalCart() {
  try {
    const raw = localStorage.getItem('userCart');
    if (raw) STATE.cart = JSON.parse(raw);
  } catch (e) {
    STATE.cart = [];
  }
  updateCartBadge();
}

function saveLocalCart() {
  try {
    localStorage.setItem('userCart', JSON.stringify(STATE.cart));
  } catch (e) {}
  updateCartBadge();
}

function addToCart(productId) {
  const prod = STATE.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = STATE.cart.find(item => item.product.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    STATE.cart.push({
      product: prod,
      quantity: 1
    });
  }

  saveLocalCart();
  showToast(`¡Agregado!: ${prod.name}`, 'success');

  // Small bounce effect on cart button
  const btn = document.getElementById('floatingCart');
  btn.classList.add('scale-110');
  setTimeout(() => btn.classList.remove('scale-110'), 200);
}

function updateCartQuantity(productId, delta) {
  const item = STATE.cart.find(i => i.product.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    STATE.cart = STATE.cart.filter(i => i.product.id !== productId);
  }

  saveLocalCart();
  renderCartModal();
}

function removeFromCart(productId) {
  STATE.cart = STATE.cart.filter(i => i.product.id !== productId);
  saveLocalCart();
  renderCartModal();
}

function clearCart() {
  if (confirm('¿Desea vaciar el pedido completo?')) {
    STATE.cart = [];
    // Clear client name and notes fields
    const nameInput = document.getElementById('orderClientName');
    const notesInput = document.getElementById('orderNotes');
    if (nameInput) nameInput.value = '';
    if (notesInput) notesInput.value = '';
    saveLocalCart();
    renderCartModal();
  }
}


function updateCartBadge() {
  const totalCount = STATE.cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = STATE.cart.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);

  document.getElementById('cartCountBadge').textContent = totalCount;
  document.getElementById('cartTotalText').textContent = formatMoney(totalPrice);
}

function openCartModal() {
  renderCartModal();
  document.getElementById('cartModal').classList.remove('hidden');
}

function closeCartModal() {
  document.getElementById('cartModal').classList.add('hidden');
}

function renderCartModal() {
  const listEl = document.getElementById('cartItemsList');
  const totalEl = document.getElementById('cartModalTotal');

  if (STATE.cart.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <svg class="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        <p class="text-xs">Tu pedido está vacío</p>
        <p class="text-[11px] text-gray-400 mt-1">Presioná "+ PEDIR" en cualquier artículo para agregarlo.</p>
      </div>
    `;
    totalEl.textContent = '$ 0,00';
    return;
  }

  let total = 0;
  let html = '';

  STATE.cart.forEach(item => {
    const subtotal = item.quantity * item.product.price;
    total += subtotal;

    html += `
      <div class="pt-3 pb-3 flex items-center justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="font-bold text-gray-800 text-xs leading-tight">
            ${item.product.name}
          </div>
          <div class="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 font-mono">
            <span>[${item.product.code}]</span>
            ${item.product.presentation ? `<span class="bg-gray-100 px-1 rounded">${item.product.presentation}</span>` : ''}
            <span>${formatMoney(item.product.price)} c/u</span>
          </div>
        </div>

        <!-- Quantity Controls -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button onclick="updateCartQuantity('${item.product.id}', -1)" class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center">
            -
          </button>
          <span class="w-6 text-center text-xs font-bold text-gray-800">${item.quantity}</span>
          <button onclick="updateCartQuantity('${item.product.id}', 1)" class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center">
            +
          </button>
          <button onclick="removeFromCart('${item.product.id}')" title="Eliminar" class="ml-1 text-gray-400 hover:text-red-500 p-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>

        <div class="font-bold text-xs text-gray-900 w-20 text-right">
          ${formatMoney(subtotal)}
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
  totalEl.textContent = formatMoney(total);
}

function sendOrderWhatsapp() {
  if (STATE.cart.length === 0) {
    showToast('El pedido está vacío', 'error');
    return;
  }

  const clientName = document.getElementById('orderClientName').value.trim();
  const notes = document.getElementById('orderNotes').value.trim();
  const phone = STATE.config.whatsappPhone || '5493442466032';

  let msg = `🛒 *PEDIDO - ${STATE.config.title || 'LISTA OFERTA A'}*\n`;
  msg += `--------------------------------------\n`;

  let total = 0;
  STATE.cart.forEach(item => {
    const sub = item.quantity * item.product.price;
    total += sub;
    const pack = item.product.presentation ? ` (${item.product.presentation})` : '';
    msg += `• *${item.quantity}x* [${item.product.code}] ${item.product.name}${pack}\n  Subtotal: ${formatMoney(sub)}\n`;
  });

  msg += `--------------------------------------\n`;
  msg += `*Total Estimado:* ${formatMoney(total)}\n\n`;

  if (clientName) msg += `👤 *Cliente:* ${clientName}\n`;
  if (notes) msg += `📝 *Notas:* ${notes}\n`;

  // Descuento del 5% para compras mayores a $50.000
  if (total > 50000) {
    const discount = total * 0.05;
    const totalWithDiscount = total - discount;
    msg += `\n* 5% de descuento pagando en efectivo por compras mayores a $50.000*\n`;
    msg += `Descuento de -5%= ${formatMoney(totalWithDiscount)} Total\n`;
  }

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ---------------------------------------------------------------------
// Sync & Excel Update Logic
// ---------------------------------------------------------------------

function openSyncModal() {
  updateSyncModalInfo();
  document.getElementById('syncFeedback').classList.add('hidden');
  document.getElementById('syncModal').classList.remove('hidden');
}

function closeSyncModal() {
  document.getElementById('syncModal').classList.add('hidden');
}

function updateSyncModalInfo() {
  const meta = STATE.metadata;
  document.getElementById('syncModalFileName').textContent = meta.fileName || 'Tablet ultima.xls';
  document.getElementById('syncModalDate').textContent = formatDate(meta.lastModified);
  document.getElementById('syncModalCount').textContent = `${(meta.totalProducts || 0).toLocaleString('es-AR')} artículos`;
  document.getElementById('syncModalCodigos').textContent = `Hoja "${meta.sheetName || 'codigos'}" (Columnas A, E, I / C, G, K / D, H, L)`;
}

async function triggerLocalSync() {
  const spinner = document.getElementById('syncSpinner');
  const btn = document.getElementById('btnTriggerSync');
  const feedback = document.getElementById('syncFeedback');

  spinner.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await fetch('/api/sync', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      feedback.className = 'p-2 rounded text-xs text-center font-medium bg-emerald-100 text-emerald-800';
      feedback.textContent = `¡Sincronizado! Se cargaron ${json.totalProducts} productos y ${json.matchedFromCodigos} códigos de 'codigos'.`;
      feedback.classList.remove('hidden');
      showToast('¡Catálogo sincronizado con Excel!', 'success');
      await fetchCatalog(false);
    } else {
      throw new Error(json.error || 'Error al sincronizar');
    }
  } catch (err) {
    feedback.className = 'p-2 rounded text-xs text-center font-medium bg-red-100 text-red-800';
    feedback.textContent = 'Error: ' + err.message;
    feedback.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
    btn.disabled = false;
  }
}

function setupExcelUploader() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('excelFileInput');
  const btnUpload = document.getElementById('btnUploadExcel');
  const dropText = document.getElementById('dropZoneText');
  let selectedFile = null;

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  function handleFileSelected(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      alert('Solo se aceptan archivos Excel (.xlsx o .xls)');
      return;
    }
    selectedFile = file;
    dropText.textContent = `Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    btnUpload.disabled = false;
  }

  btnUpload.addEventListener('click', async () => {
    if (!selectedFile) return;

    btnUpload.disabled = true;
    btnUpload.textContent = 'Subiendo y procesando Excel...';
    const feedback = document.getElementById('syncFeedback');

    const formData = new FormData();
    formData.append('excel', selectedFile);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        feedback.className = 'p-2 rounded text-xs text-center font-medium bg-emerald-100 text-emerald-800';
        feedback.textContent = `¡Excel actualizado con éxito! ${json.totalProducts} productos procesados.`;
        feedback.classList.remove('hidden');
        showToast('¡Excel subido y precios actualizados!', 'success');
        selectedFile = null;
        fileInput.value = '';
        dropText.textContent = 'Hacé clic para seleccionar o arrastrá el Excel aquí';
        btnUpload.disabled = true;
        btnUpload.textContent = 'Subir y actualizar precios';
        await fetchCatalog(false);
      } else {
        throw new Error(json.error || 'Error al subir');
      }
    } catch (err) {
      feedback.className = 'p-2 rounded text-xs text-center font-medium bg-red-100 text-red-800';
      feedback.textContent = 'Error: ' + err.message;
      feedback.classList.remove('hidden');
      btnUpload.disabled = false;
      btnUpload.textContent = 'Subir y actualizar precios';
    }
  });
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
