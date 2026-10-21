const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const parser = require('./excel_parser');
const promoModule = require('./promo_list');

const app = express();
const BASE_DIR = __dirname;
const CONFIG_PATH = path.join(BASE_DIR, 'config.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(BASE_DIR, 'public')));

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading config.json:', err);
  }
  return {
    title: 'LISTA OFERTA A',
    businessName: 'COLÓN ANAHÍ EMBALAJES',
    schedule: 'Lun a Vie 08:00–16:00 · Sáb 08:00–13:00',
    whatsappPhone: '5493442466032',
    whatsappDisplay: '3442 46-6032',
    altWhatsapp: '11 2568-7346',
    currencySymbol: '$ ',
    port: 3000
  };
}

let config = loadConfig();
let catalogCache = null;
let promoCache = null;
let clientsSSE = [];

function reloadCatalog() {
  try {
    delete require.cache[require.resolve('./excel_parser')];
    delete require.cache[require.resolve('./promo_list')];
    const currentParser = require('./excel_parser');
    const currentPromo = require('./promo_list');

    const filePath = currentParser.findExcelFile(BASE_DIR);
    if (!filePath) {
      console.warn('Advertencia: No se encontró Tablet ultima.xlsx ni Tablet ultima.xls');
      return false;
    }
    console.log('Cargando catálogo desde:', filePath);
    catalogCache = currentParser.parseCatalog(filePath);
    promoCache = currentPromo.buildPromoList(catalogCache.products, {
      lastModified: catalogCache.lastModified
    });
    console.log(`Catálogo cargado: ${catalogCache.totalProducts} productos, ${catalogCache.matchedFromCodigos || catalogCache.totalProducts} códigos internos.`);
    console.log(`Lista Promo WhatsApp generada con ${promoCache.totalItemsCount} artículos.`);

    // Notify connected SSE clients
    notifyClients({
      type: 'CATALOG_UPDATED',
      totalProducts: catalogCache.totalProducts,
      lastModified: catalogCache.lastModified,
      fileName: catalogCache.fileName
    });
    return true;
  } catch (err) {
    console.error('Error al cargar catálogo desde Excel:', err);
    return false;
  }
}

function notifyClients(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clientsSSE.forEach(res => res.write(payload));
}

// Initial load
reloadCatalog();

// Watch for file modifications
function setupFileWatcher() {
  const watchFiles = ['Tablet ultima.xlsx', 'Tablet ultima.xls'];
  watchFiles.forEach(fn => {
    const fp = path.join(BASE_DIR, fn);
    if (fs.existsSync(fp)) {
      let fsTimeout = null;
      fs.watch(fp, (eventType) => {
        if (!fsTimeout) {
          fsTimeout = setTimeout(() => {
            fsTimeout = null;
            console.log(`Detectado cambio en ${fn}, recargando precios...`);
            reloadCatalog();
          }, 1000);
        }
      });
      console.log('Vigilando cambios en:', fp);
    }
  });
}
setupFileWatcher();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, BASE_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    // Save as Tablet ultima.xlsx or Tablet ultima.xls
    if (ext === '.xls') {
      cb(null, 'Tablet ultima.xls');
    } else {
      cb(null, 'Tablet ultima.xlsx');
    }
  }
});
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx o .xls)'));
    }
  }
});

// SSE endpoint for auto-updating browser in real-time
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clientsSSE.push(res);
  req.on('close', () => {
    clientsSSE = clientsSSE.filter(c => c !== res);
  });
});

// API: Get full catalog
app.get('/api/products', (req, res) => {
  if (!catalogCache) {
    const ok = reloadCatalog();
    if (!ok || !catalogCache) {
      return res.status(500).json({ error: 'No se pudo cargar el archivo Excel. Asegúrese de que Tablet ultima.xlsx o Tablet ultima.xls exista en c:\\gestion.' });
    }
  }

  res.json({
    config,
    metadata: {
      fileName: catalogCache.fileName,
      lastModified: catalogCache.lastModified,
      totalProducts: catalogCache.totalProducts,
      sheetName: catalogCache.sheetName
    },
    rubros: catalogCache.rubros,
    products: catalogCache.products
  });
});

// API: Get formatted WhatsApp promo list with live prices
app.get('/api/promolist', (req, res) => {
  if (!catalogCache || !promoCache) {
    const ok = reloadCatalog();
    if (!ok || !promoCache) {
      return res.status(500).json({ error: 'No se pudo cargar la lista. Asegúrese de que Tablet ultima.xlsx o Tablet ultima.xls exista en c:\\gestion.' });
    }
  }

  res.json({
    config,
    metadata: {
      fileName: catalogCache.fileName,
      lastModified: catalogCache.lastModified,
      totalProducts: catalogCache.totalProducts,
      sheetName: catalogCache.sheetName
    },
    promo: promoCache
  });
});

// API: System info
app.get('/api/info', (req, res) => {
  res.json({
    config,
    loaded: !!catalogCache,
    fileName: catalogCache ? catalogCache.fileName : null,
    totalProducts: catalogCache ? catalogCache.totalProducts : 0,
    lastModified: catalogCache ? catalogCache.lastModified : null,
    sheetName: catalogCache ? catalogCache.sheetName : null
  });
});

// API: Manual sync from local file
app.post('/api/sync', (req, res) => {
  const ok = reloadCatalog();
  if (ok) {
    res.json({
      success: true,
      message: 'Catálogo sincronizado exitosamente con la hoja "codigos" del Excel.',
      totalProducts: catalogCache.totalProducts,
      sheetName: catalogCache.sheetName,
      fileName: catalogCache.fileName
    });
  } else {
    res.status(500).json({ success: false, error: 'Error al leer el archivo Excel.' });
  }
});

// API: Upload Excel file (for localhost or web deployment)
app.post('/api/upload', upload.single('excel'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se subió ningún archivo.' });
    }
    console.log('Nuevo archivo Excel subido:', req.file.filename);
    const ok = reloadCatalog();
    if (ok) {
      setupFileWatcher();
      res.json({
        success: true,
        message: 'Archivo Excel subido y precios actualizados correctamente.',
        fileName: req.file.filename,
        totalProducts: catalogCache.totalProducts,
        matchedFromCodigos: catalogCache.matchedFromCodigos
      });
    } else {
      res.status(500).json({ success: false, error: 'Archivo subido pero ocurrió un error al procesarlo.' });
    }
  } catch (err) {
    console.error('Error al procesar subida de Excel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Update config
app.post('/api/config', (req, res) => {
  try {
    const { title, schedule, whatsappPhone, whatsappDisplay } = req.body;
    if (title) config.title = title;
    if (schedule) config.schedule = schedule;
    if (whatsappPhone) config.whatsappPhone = whatsappPhone;
    if (whatsappDisplay) config.whatsappDisplay = whatsappDisplay;

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    notifyClients({ type: 'CONFIG_UPDATED', config });
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || config.port || 3000;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Servidor iniciado exitosamente en: http://localhost:${PORT}`);
  console.log(`Listo para usar en localhost y luego desplegar en la web.`);
  console.log(`=======================================================`);
});
