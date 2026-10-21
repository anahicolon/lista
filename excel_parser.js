const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Clean presentation badge extraction from description (e.g. "x 100", "x 50", "c/u", "x kg")
function extractPresentation(desc) {
  if (!desc) return '';
  if (/\bx\s*100\b/i.test(desc) || /\bcien\b/i.test(desc)) return 'x 100';
  if (/\bx\s*1000\b/i.test(desc) || /\bmil\b/i.test(desc)) return 'x 1000';
  if (/\bx\s*500\b/i.test(desc)) return 'x 500';
  if (/\bx\s*50\b/i.test(desc)) return 'x 50';
  if (/\bx\s*30\b/i.test(desc)) return 'x 30';
  if (/\bx\s*25\b/i.test(desc)) return 'x 25';
  if (/\bx\s*20\b/i.test(desc)) return 'x 20';
  if (/\bx\s*12\b/i.test(desc)) return 'x 12';
  if (/\bx\s*10\b/i.test(desc)) return 'x 10';
  if (/\bx\s*6\b/i.test(desc)) return 'x 6';
  if (/\bx\s*4\b/i.test(desc)) return 'x 4';
  if (/\bx\s*1kg\b/i.test(desc) || /\bx\s*kg\b/i.test(desc) || /\bx\s*kilo\b/i.test(desc)) return 'x kg';
  if (/\bc\/u\b/i.test(desc) || /\bx\s*unidad\b/i.test(desc) || /\bx\s*1\b/i.test(desc)) return 'c/u';

  const m = desc.match(/\bx\s*(\d+)\b/i);
  if (m) return 'x ' + m[1];
  return '';
}

// Map section headers and descriptions to standardized Rubros
function classifyRubro(section, desc) {
  const text = ((section || '') + ' ' + (desc || '')).toUpperCase();
  if (text.includes('ALUMINIO') || text.includes('ALUM')) return 'ALUMINIO';
  if (text.includes('BANDEJA') || text.includes('FAST FOOD') || text.includes('EXPANDIDO') || text.includes('PIM')) return 'BANDEJAS';
  if (text.includes('BLONDA')) return 'BLONDAS';
  if (text.includes('BOLSA') || text.includes('ROLLO') || text.includes('CAMI') || text.includes('RESIDUO') || text.includes('CONSORCIO') || text.includes('SULFITO') || text.includes('KRAFT') || text.includes('POLIPROPILENO') || text.includes('FRISELINA') || text.includes('MARKET')) return 'BOLSAS';
  if (text.includes('VASO') || text.includes('COPA')) return 'VASOS Y COPAS';
  if (text.includes('PLATO')) return 'PLATOS';
  if (text.includes('POTE')) return 'POTES';
  if (text.includes('CUBIERTO') || text.includes('SORBETE') || text.includes('ESPADITA') || text.includes('BROCHETTE') || text.includes('ESCARBADIENTE')) return 'CUBIERTOS Y SORBETES';
  if (text.includes('CAJA') || text.includes('PIZZA') || text.includes('EMPANADA') || text.includes('CARTON') || text.includes('CARTÓN') || text.includes('CARTULINA')) return 'CARTÓN Y CAJAS';
  if (text.includes('PAPEL') || text.includes('BOBINA') || text.includes('RESMA') || text.includes('MANTECA')) return 'PAPEL Y BOBINAS';
  if (text.includes('MOLDE') || text.includes('PIROTIN') || text.includes('BUDINERA')) return 'MOLDES Y PIROTINES';
  if (text.includes('FOLEX')) return 'FOLEX';
  if (text.includes('GUANTE')) return 'GUANTES';
  if (text.includes('HIGIENE') || text.includes('HIGIENICO') || text.includes('TOALLA') || text.includes('REJILLA') || text.includes('DISPENSER') || text.includes('FELPITA')) return 'HIGIENE Y LIMPIEZA';
  if (text.includes('LIBRERÍA') || text.includes('LIBRERIA') || text.includes('BOLÍGRAFO') || text.includes('ETIQUETA') || text.includes('MOTEX') || text.includes('MÁQUINA') || text.includes('SOBRE') || text.includes('CINTA') || text.includes('PORTA CINTA')) return 'LIBRERÍA Y ETIQUETAS';
  return 'VARIOS';
}

function findExcelFile(baseDir) {
  const primaryDir = 'D:\\DATOS\\Trabajo';
  const checkDirs = [];
  if (fs.existsSync(primaryDir)) {
    checkDirs.push(primaryDir);
  }
  if (baseDir && !checkDirs.includes(baseDir)) {
    checkDirs.push(baseDir);
  }

  const candidates = [];
  for (const dir of checkDirs) {
    const xlsxPath = path.join(dir, 'Tablet ultima.xlsx');
    const xlsPath = path.join(dir, 'Tablet ultima.xls');
    if (fs.existsSync(xlsxPath)) candidates.push(xlsxPath);
    if (fs.existsSync(xlsPath)) candidates.push(xlsPath);
  }

  if (candidates.length === 0) return null;

  // Return the file with the newest modification time
  candidates.sort((a, b) => {
    try {
      return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
    } catch (e) {
      return 0;
    }
  });

  return candidates[0];
}

/**
 * Parse products strictly from sheet 'codigos' (or 'Codigos')
 * Columns:
 * Internal unique code: Column A, E, I (indexes 0, 4, 8)
 * Supplier code (ref): Column B, F, J (indexes 1, 5, 9)
 * Price: Column C, G, K (indexes 2, 6, 10)
 * Description: Column D, H, L (indexes 3, 7, 11)
 */
function parseCatalog(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Archivo no encontrado: ' + filePath);
  }

  const stat = fs.statSync(filePath);
  const wb = XLSX.readFile(filePath, { cellFormula: false });

  // Locate sheet 'codigos' (case-insensitive)
  const sheetName = wb.SheetNames.find(s => s.toLowerCase() === 'codigos');
  if (!sheetName) {
    throw new Error('No se encontró la hoja "codigos" en el libro Excel: ' + filePath);
  }

  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Define column blocks as requested:
  // Bloque 1: Code=A (0), Supp=B (1), Price=C (2), Desc=D (3)
  // Bloque 2: Code=E (4), Supp=F (5), Price=G (6), Desc=H (7)
  // Bloque 3: Code=I (8), Supp=J (9), Price=K (10), Desc=L (11)
  const blocks = [
    { name: 'Bloque 1', codeCol: 0, suppCol: 1, priceCol: 2, descCol: 3, defaultSection: 'Bolsas y Rollos' },
    { name: 'Bloque 2', codeCol: 4, suppCol: 5, priceCol: 6, descCol: 7, defaultSection: 'Bolsas y Rollos' },
    { name: 'Bloque 3', codeCol: 8, suppCol: 9, priceCol: 10, descCol: 11, defaultSection: 'Bolsas y Rollos' },
  ];

  const currentSection = {
    'Bloque 1': 'Bolsas y Rollos',
    'Bloque 2': 'Bolsas y Rollos',
    'Bloque 3': 'Bolsas y Rollos'
  };

  const products = [];

  for (let r = 0; r < data.length; r++) {
    const row = data[r] || [];

    blocks.forEach(b => {
      let code = row[b.codeCol] !== undefined && row[b.codeCol] !== null ? String(row[b.codeCol]).trim() : '';
      const supp = row[b.suppCol] !== undefined && row[b.suppCol] !== null ? String(row[b.suppCol]).trim() : '';
      const priceVal = row[b.priceCol];
      const desc = row[b.descCol] !== undefined && row[b.descCol] !== null ? String(row[b.descCol]).trim() : '';

      // Check if this row is a Section / Subcategory header
      const isHeaderRow = (!code || code.toLowerCase().includes('rollo') || code.toLowerCase().includes('bolsa') || code.toLowerCase().includes('vaso') || code.toLowerCase().includes('bandeja'))
        && (typeof priceVal !== 'number' || priceVal === 0 || priceVal === undefined || priceVal === null || priceVal === '');

      if (isHeaderRow) {
        const potentialTitle = [code, supp, typeof priceVal === 'string' ? priceVal : '', desc].filter(Boolean).join(' ').trim();
        if (potentialTitle && !potentialTitle.includes('COLÓN') && !potentialTitle.includes('Whatsapp') && !potentialTitle.includes('Fecha:') && !potentialTitle.includes('Comprobante')) {
          currentSection[b.name] = potentialTitle;
        }
      }

      // If code in A/E/I is blank but B/F/J has code and D/H/L has desc & price
      if (!code && supp && desc && typeof priceVal === 'number' && priceVal > 0) {
        code = supp;
      }

      // Valid product condition: must have Code and Description
      if (code && desc && priceVal !== undefined && priceVal !== null && priceVal !== '') {
        let price = 0;
        if (typeof priceVal === 'number') {
          price = priceVal;
        } else {
          const clean = String(priceVal).replace(/\./g, '').replace(',', '.');
          price = parseFloat(clean) || 0;
        }

        if (price > 0) {
          const section = currentSection[b.name] || 'General';
          const rubro = classifyRubro(section, desc);
          const presentation = extractPresentation(desc);

          products.push({
            id: 'item_' + (products.length + 1),
            code: code, // Internal code from column A, E, or I
            internalCode: code,
            supplierCode: supp || code,
            name: desc,
            fullName: desc,
            rubro: rubro,
            subrubro: section,
            presentation: presentation || 'x unid',
            price: Math.round(price * 100) / 100,
            source: 'codigos'
          });
        }
      }
    });
  }

  // Define logical order of category pills
  const rubroSet = new Set(products.map(p => p.rubro));
  const preferredOrder = [
    'ALUMINIO',
    'BANDEJAS',
    'BOLSAS',
    'VASOS Y COPAS',
    'PLATOS',
    'POTES',
    'PAPEL Y BOBINAS',
    'BLONDAS',
    'CUBIERTOS Y SORBETES',
    'CARTÓN Y CAJAS',
    'MOLDES Y PIROTINES',
    'FOLEX',
    'GUANTES',
    'HIGIENE Y LIMPIEZA',
    'LIBRERÍA Y ETIQUETAS',
    'VARIOS'
  ];

  const sortedRubros = [];
  preferredOrder.forEach(r => {
    if (rubroSet.has(r)) {
      sortedRubros.push(r);
      rubroSet.delete(r);
    }
  });
  sortedRubros.push(...Array.from(rubroSet).sort());

  return {
    fileName: path.basename(filePath),
    lastModified: stat.mtime.toISOString(),
    totalProducts: products.length,
    sheetName: sheetName,
    rubros: sortedRubros,
    products
  };
}

module.exports = {
  findExcelFile,
  parseCatalog
};
