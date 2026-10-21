const fs = require('fs');

/**
 * Definition of the WhatsApp Promo List Template
 * Each item has:
 * - text: description
 * - code: internal code in sheet 'codigos' of Tablet ultima.xls
 * - fallbackPrice: fallback price if code is not present
 * - format: optional format rule (e.g. per unit or custom label)
 */
const PROMO_SECTIONS = [
  {
    icon: '🧻',
    title: 'ROLLOS ARRANQUE REFORZADOS',
    items: [
      { text: 'Rollos x 750gr 20x30// 25x35//30x40', code: '30R', fallbackPrice: 6920, prefix: '📦 ' },
      { text: 'Rollos x 1,50kg todas las medidas', code: 'R30R', fallbackPrice: 13840, prefix: '📦 ' }
    ]
  },
  {
    icon: '🧻',
    title: 'ROLLOS ARRANQUE RENDIDOR:',
    items: [
      { text: '15x20', code: 'R20', fallbackPrice: 3050, prefix: '🔺' },
      { text: '15x25', code: 'R15', fallbackPrice: 3790, prefix: '🔺' },
      { text: '20x30', code: 'R30', fallbackPrice: 6570, prefix: '🔺' },
      { text: '25x35', code: 'R35', fallbackPrice: 8520, prefix: '🔺' },
      { text: '30x40', code: 'R40', fallbackPrice: 11290, prefix: '🔺' },
      { text: '35x45', code: 'R45', fallbackPrice: 8520, prefix: '🔺' }
    ]
  },
  {
    icon: '🛍️',
    title: 'CAMISETAS ROLAN x 100:',
    items: [
      { text: '30x40 eco', code: 'C40E', fallbackPrice: 1720 },
      { text: '30x40 blanca', code: 'C40', fallbackPrice: 2420 },
      { text: '40x50 eco', code: 'C50E', fallbackPrice: 2550 },
      { text: '40x50 blanca', code: 'CCH', fallbackPrice: 3390 },
      { text: '40x50 rayada', code: 'CR', fallbackPrice: 3390 },
      { text: '40x50 gr.compra', code: 'CGS', fallbackPrice: 3390 },
      { text: '45x60 rayada', code: 'C60RR', fallbackPrice: 3940 },
      { text: '50x60 blanca', code: 'C50R', fallbackPrice: 5610 },
      { text: '50x70 blanca', code: 'C70B', fallbackPrice: 5670 },
      { text: '60x80 rayada', code: 'C80R', fallbackPrice: 11330 }
    ]
  },
  {
    icon: '🔺',
    title: '*CAMISETAS PERLA NEGRA*',
    items: [
      { text: '40x50', code: 'PN50', fallbackPrice: 4870 },
      { text: '45x60', code: 'PN60', fallbackPrice: 6470 },
      { text: '50x70', code: 'PN70', fallbackPrice: 9640 },
      { text: '60x80', code: 'PN80', fallbackPrice: 12920 }
    ]
  },
  {
    icon: '📄',
    title: 'FOLEX (separadores) x1kg',
    items: [
      { text: '20x25 /25x35', code: 'FR', fallbackPrice: 10200 },
      { text: '🍔 FOLEX (hamburg.)14X14x1kg', code: 'F14M', fallbackPrice: 12000, noPrefix: true }
    ]
  },
  {
    icon: '🎞️',
    title: 'FILM P.V.C.',
    items: [
      { text: 'FILM P.V.C. x300 mts:', code: 'REPC', fallbackPrice: 10150, prefix: '🎞️ ' },
      { text: 'FILM P.V.C Eco', code: 'REPC', fallbackPrice: 6890, prefix: '🎞️ ' },
      { text: 'FILM familiar x 30mts', code: 'PVCE', fallbackPrice: 1400, prefix: '🎞️ ' }
    ]
  },
  {
    icon: '📃',
    title: 'PAPEL',
    items: [
      { text: 'Prensa en resma o bobina', code: 'RPP30', fallbackPrice: 2675 }
    ]
  },
  {
    icon: '🛍️',
    title: 'BOLSAS PAPEL KRAFT x 100',
    items: [
      { text: 'Nº1', code: 'K1', fallbackPrice: 1260 },
      { text: 'Nº2', code: 'K2', fallbackPrice: 1460 },
      { text: 'Nº2L', code: 'K2L', fallbackPrice: 1870 },
      { text: 'Nº3', code: 'K3', fallbackPrice: 1890 },
      { text: 'Nº4A', code: 'K4A', fallbackPrice: 2230 },
      { text: 'Nº5', code: 'K5', fallbackPrice: 2410 },
      { text: 'N°6', code: 'K6', fallbackPrice: 2910 },
      { text: 'Nº6L', code: 'K6L', fallbackPrice: 3590 },
      { text: 'Nº7', code: 'K7', fallbackPrice: 4140 },
      { text: 'Nº8', code: 'K8', fallbackPrice: 4750 }
    ]
  },
  {
    icon: '🥤',
    title: 'SORBETES',
    items: [
      { text: 'SORBETES x 100', code: 'S100', fallbackPrice: 2410, prefix: '🥤 ' },
      { text: 'SORBETES x 1000', code: 'SO', fallbackPrice: 14000, prefix: '🥤 ' },
      { text: 'SORBETES Negros \n  x 1000', code: 'SON', fallbackPrice: 16000, prefix: '🥤 ' }
    ]
  },
  {
    icon: '🥛',
    title: 'VASOS',
    items: [
      { text: 'VASOS x 220cc x 100', code: 'V20', fallbackPrice: 4420, prefix: '🥛 ' },
      { text: 'VASOS x 330cc x 100', code: 'V30', fallbackPrice: 5420, prefix: '🥛 ' },
      { text: 'VASOS x 500cc', code: 'V50', fallbackPrice: 85, suffix: ' c/u', prefix: '🥛 ' },
      { text: 'VASOS x 800cc', code: 'V80B', fallbackPrice: 145, suffix: ' c/u', prefix: '🥛 ' },
      { text: 'VASOS x 1000cc', code: 'V10B', fallbackPrice: 185, suffix: ' c/u', prefix: '🥛 ' }
    ]
  },
  {
    icon: '🍴',
    title: 'CUBIERTOS',
    items: [
      { text: 'CUCHARITAS x 50', code: 'CU50', fallbackPrice: 1900, prefix: '🥄 ' },
      { text: 'CUBIERTOS x 50', code: 'TE50', fallbackPrice: 2330, prefix: '🍴 ' }
    ]
  },
  {
    icon: '🥡',
    title: 'POTES BISAGRA',
    items: [
      { text: 'POTES BISAGRA chico c/u', code: 'BCH', fallbackPrice: 230, prefix: '🥡 ' },
      { text: 'POTES BISAGRA mediano c/u', code: 'BM', fallbackPrice: 240, prefix: '🥡 ' },
      { text: 'POTES BISAGRA grande c/u', code: 'BG', fallbackPrice: 275, prefix: '🥡 ' }
    ]
  },
  {
    icon: '🍱',
    title: 'BANDEJAS MICRO ECO X 100:',
    items: [
      { text: 'Nº 102 C:', code: '102E', fallbackPrice: 10800 },
      { text: 'Nº 103 A:', code: '103E', fallbackPrice: 11680 },
      { text: 'Nº 105 A: ovalada', code: 'A105O', fallbackPrice: 15840 },
      { text: 'Nº 107 C:', code: '107E', fallbackPrice: 31530 }
    ]
  },
  {
    icon: '📦',
    title: 'BANDEJAS CARTÓN X 100:',
    items: [
      { text: 'Nº 2:', code: 'BC2', fallbackPrice: 3790 },
      { text: 'Nº 3:', code: 'BC3', fallbackPrice: 4690 },
      { text: 'Nº 4:', code: 'BC4', fallbackPrice: 5990 },
      { text: 'Nº 5:', code: 'BC5', fallbackPrice: 7560 },
      { text: 'Nº 6:', code: 'BC6', fallbackPrice: 9200 },
      { text: 'Nº12:', code: 'BC12', fallbackPrice: 4940 },
      { text: 'Nº13:', code: 'BC13', fallbackPrice: 7120 },
      { text: 'Nº14:', code: 'BC14', fallbackPrice: 9450 },
      { text: 'Nº15:', code: 'BC15', fallbackPrice: 13370 },
      { text: 'Nº16:', code: 'BC16', fallbackPrice: 15650 },
      { text: 'Gris N°4:', code: 'BCG4', fallbackPrice: 3360 },
      { text: 'Gris N°5:', code: 'BCG5', fallbackPrice: 4170 },
      { text: 'Gris N°14:', code: 'BCG14', fallbackPrice: 7320 }
    ]
  },
  {
    icon: '📦',
    title: 'BANDEJAS Doradas C/U',
    subsections: [
      {
        subtitle: 'REDONDAS:',
        items: [
          { text: 'N°14:', code: 'D14', fallbackPrice: 660 },
          { text: 'N°15:', code: 'D15', fallbackPrice: 1100 },
          { text: 'N°16:', code: 'D16', fallbackPrice: 1420 }
        ]
      },
      {
        subtitle: 'RECTANGULARES:',
        items: [
          { text: '3/4kg', code: 'PDI3/4', fallbackPrice: 500 },
          { text: '1kg', code: 'PDI1', fallbackPrice: 560 },
          { text: '2kg', code: 'PDI2', fallbackPrice: 850 },
          { text: '3kg', code: 'PDI3', fallbackPrice: 1050 }
        ]
      }
    ]
  },
  {
    icon: '🧻',
    title: 'SERVILLETAS',
    items: [
      { text: '18 x 18 x 2000', code: 'S18', fallbackPrice: 9300 },
      { text: '33x33 Costa Azul x 1000', code: 'S33O', fallbackPrice: 16500 },
      { text: 'Servibar Costa Azul x 10.000', code: 'SD', fallbackPrice: 16870 }
    ]
  },
  {
    icon: '🍕',
    title: 'CAJAS DE PIZZA',
    items: [
      { text: 'Marrón Grande x 50:', code: 'CPG', fallbackPrice: 15650 }
    ]
  },
  {
    icon: '🥟',
    title: 'CAJA DE EMPANADAS X 100',
    items: [
      { text: 'CAJA 1/2 Doc. :', code: 'CE1/2', fallbackPrice: 20420 },
      { text: 'CAJA 1 Doc. :', code: 'CE1', fallbackPrice: 28070 }
    ]
  },
  {
    icon: '🍝',
    title: 'GASTRONOMÍA Y DERIVADOS',
    items: [
      { text: 'CAJAS DE RAVIOLES x 100:', code: 'CRA', fallbackPrice: 25640, prefix: '🍝 ' },
      { text: 'Porta Panchos x 500', code: 'PPX500', fallbackPrice: 8680, prefix: '🌭 ' },
      { text: 'Porta Papas Fritas x 200', code: 'PPF', fallbackPrice: 15170, prefix: '🍟 ' }
    ]
  },
  {
    icon: '🧤',
    title: 'GUANTES:',
    items: [
      { text: 'Polietileno x 100:', code: 'GP', fallbackPrice: 1250 },
      { text: 'Nitrilo Negro x 100:', code: 'GNM', fallbackPrice: 11200 }
    ]
  },
  {
    icon: '🍱',
    title: 'Bandejas de expandido:',
    items: [
      { text: 'Bandeja 615 x 100: (14,5x27)', code: 'B15', fallbackPrice: 9650 },
      { text: 'Bandeja 617 x 100: (13,5x13,5cm)', code: 'B17', fallbackPrice: 5060 },
      { text: 'Obleas 618 x 100:', code: 'OB', fallbackPrice: 7490 },
      { text: 'Bandeja 618 x 100: (14,5x20cm)', code: 'B18', fallbackPrice: 8050 },
      { text: 'Bandeja 619 x 100: (19x23cm)', code: 'B19', fallbackPrice: 9700 },
      { text: 'Bandeja 625 x 100: (21,5x30cm)', code: 'B25', fallbackPrice: 18850 },
      { text: 'Bandeja 628 x 100: (31cm de diámetro)', code: 'B28', fallbackPrice: 23200 }
    ]
  },
  {
    icon: '🧻',
    title: 'ROLLOS PAPEL ALUMINIO',
    items: [
      { text: 'Aluminio x 5mts', code: 'AL5', fallbackPrice: 1200 },
      { text: 'Aluminio x 1kg', code: 'AL1', fallbackPrice: 12100 }
    ]
  },
  {
    icon: '📄',
    title: 'ROLLOS PAPEL MANTECA',
    items: [
      { text: 'Papel manteca x 5mts', code: 'MA', fallbackPrice: 2010 },
      { text: 'Papel manteca x 50mts', code: 'MA50', fallbackPrice: 15330 }
    ]
  },
  {
    icon: '🗑️',
    title: 'CONSORCIOS Y RESIDUOS',
    subsections: [
      {
        subtitle: '🗑️ CONSORCIOS en ROLLO',
        items: [
          { text: '60x90x10u c/rollo', code: 'COR90', fallbackPrice: 1080 },
          { text: '80x110x10u c/roll', code: 'COR80', fallbackPrice: 2180 },
          { text: '90x120x10u c/rollo', code: 'COR120', fallbackPrice: 3240 }
        ]
      },
      {
        subtitle: '🗑️ CONSORCIOS en PAQUETE',
        items: [
          { text: '60x90x 10u c/pte', code: 'CO90', fallbackPrice: 1500 },
          { text: '80x100x50u c/pte', code: 'CO80', fallbackPrice: 14300 }
        ]
      },
      {
        subtitle: '🚮 RESIDUOS en PAQUETE:',
        items: [
          { text: '45x60x 10u c/pte', code: 'RE60', fallbackPrice: 590 },
          { text: '50x70x 10u c/pte', code: 'RE70', fallbackPrice: 770 }
        ]
      }
    ]
  },
  {
    icon: '📦',
    title: 'CINTAS ADHESIVAS Y MOTEX',
    items: [
      { text: 'Cinta adhesiva 24x40 c/una', code: 'C2440', fallbackPrice: 520 },
      { text: 'Cinta adhesiva 48x40 c/una', code: 'C4840', fallbackPrice: 780 },
      { text: 'ROLLOS MOTEX FLUO x 5u\n  Amarillo/Naranja/Verde', code: 'RMA', fallbackPrice: 4330, prefix: '🏷️ ' }
    ]
  },
  {
    icon: '🧻',
    title: 'PAPEL HIGIENICO Y ROLLOS COCINA',
    subsections: [
      {
        subtitle: '🧻 PAPEL HIGIENICO x 4u',
        items: [
          { text: 'ELEGANTE s/h x30mts', code: 'PHV', fallbackPrice: 2240 },
          { text: 'FELPITA s/h x30mts', code: 'PHVF', fallbackPrice: 1980 },
          { text: 'ELEGANTE d/h x30mts', code: 'PH4', fallbackPrice: 3850 },
          { text: 'FELPITA Max. x80mts', code: 'PHMAXF', fallbackPrice: 4390 },
          { text: 'FELPITA d/h x30mts', code: 'PH4F', fallbackPrice: 3200 }
        ]
      },
      {
        subtitle: '🧻 ROLLOS COCINA x 3u',
        items: [
          { text: 'ELEGANTE x100 paños', code: 'RCEL', fallbackPrice: 4600 },
          { text: 'CARTABELLA x50 paños', code: 'RCD', fallbackPrice: 1900 }
        ]
      }
    ]
  },
  {
    icon: '🧻',
    title: 'ATENCIÓN OFERTA PAPEL HIGIÉNICO!!!',
    isSpecialAlert: true,
    items: [
      { text: 'FELPITA MAX de 80mts x 1Bulto de 10 rollos \n📣 al precio increíble de:', code: 'PHMAXF_BTO', fallbackPrice: 33850 }
    ]
  }
];

// Helper to format currency: $6.920
function formatPrice(val) {
  if (typeof val !== 'number' || isNaN(val)) return '$0';
  // Round to nearest integer or integer display if no decimal cents needed
  const rounded = Math.round(val);
  const str = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${str}`;
}

/**
 * Builds the Promo List with live prices from the parsed catalog products
 * @param {Array} catalogProducts - products from excel_parser
 * @param {Object} metadata - excel metadata
 */
function buildPromoList(catalogProducts, metadata = {}) {
  // Map code -> product with internalCode having highest priority
  const productMap = new Map();
  (catalogProducts || []).forEach(p => {
    if (p.supplierCode) productMap.set(String(p.supplierCode).trim().toUpperCase(), p);
  });
  (catalogProducts || []).forEach(p => {
    if (p.code) productMap.set(String(p.code).trim().toUpperCase(), p);
    if (p.internalCode) productMap.set(String(p.internalCode).trim().toUpperCase(), p);
  });

  // Date determination: format date from metadata or today
  let listDate = '11/09/2026';
  if (metadata.lastModified) {
    const d = new Date(metadata.lastModified);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    listDate = `${day}/${month}/${year}`;
  }

  const resultSections = [];
  let plainText = `*LISTA PRECIOS COLÓN ANAHÍ EMBALAJES* *Lista del ${listDate}*\n\n`;

  PROMO_SECTIONS.forEach(sec => {
    const processedSec = {
      icon: sec.icon,
      title: sec.title,
      isSpecialAlert: sec.isSpecialAlert || false,
      items: [],
      subsections: []
    };

    if (sec.isSpecialAlert) {
      plainText += `🧻${sec.title}\n`;
    } else if (sec.title.startsWith('*')) {
      plainText += `${sec.icon}${sec.title}\n`;
    } else {
      plainText += `${sec.icon} ${sec.title}\n`;
    }

    if (sec.items) {
      sec.items.forEach(item => {
        const prod = item.code ? productMap.get(item.code.toUpperCase()) : null;
        let finalPriceNum = item.fallbackPrice;

        if (prod && typeof prod.price === 'number' && prod.price > 0) {
          finalPriceNum = prod.price;
        }

        const formattedPrice = formatPrice(finalPriceNum);
        const prefix = item.prefix || '';
        const suffix = item.suffix || '';

        processedSec.items.push({
          text: item.text,
          code: item.code,
          price: finalPriceNum,
          priceFormatted: formattedPrice,
          prefix,
          suffix,
          fromExcel: !!prod
        });

        // Add to plain text
        if (prefix) {
          plainText += `${prefix}${item.text}: ${formattedPrice}${suffix}\n`;
        } else {
          plainText += `${item.text} ${formattedPrice}${suffix}\n`;
        }
      });
      plainText += `\n`;
    }

    if (sec.subsections) {
      sec.subsections.forEach(sub => {
        plainText += `${sub.subtitle}\n`;
        const subItems = [];

        sub.items.forEach(item => {
          const prod = item.code ? productMap.get(item.code.toUpperCase()) : null;
          let finalPriceNum = item.fallbackPrice;

          if (prod && typeof prod.price === 'number' && prod.price > 0) {
            finalPriceNum = prod.price;
          }

          const formattedPrice = formatPrice(finalPriceNum);
          const prefix = item.prefix || '';
          const suffix = item.suffix || '';

          subItems.push({
            text: item.text,
            code: item.code,
            price: finalPriceNum,
            priceFormatted: formattedPrice,
            prefix,
            suffix,
            fromExcel: !!prod
          });

          if (prefix) {
            plainText += `${prefix}${item.text}: ${formattedPrice}${suffix}\n`;
          } else {
            plainText += `${item.text} ${formattedPrice}${suffix}\n`;
          }
        });

        processedSec.subsections.push({
          subtitle: sub.subtitle,
          items: subItems
        });
      });
      plainText += `\n`;
    }

    resultSections.push(processedSec);
  });

  // Footer text
  const footerText = `🔍 CONSULTAR por otros artículos:
Rollos Térmicos para Registradoras y Posnet. Tacos de Papel. Banditas Elásticas. Abrochadora y Broches.
Bolígrafos. Marcadores.
Bolsas Polipropileno varias medidas. Bolsas papel regalo. Moños Mágicos. Bolsas riñón fantasía
Y muchas cosas más...!!!
🛒 La compra mínima para el reparto es de $15.000.
🏪 COLON ANAHÍ EMBALAJES
📱 WHATSAPP: 3442-466032
📅 Lista del ${listDate}`;

  plainText += footerText;

  return {
    title: 'LISTA PRECIOS COLÓN ANAHÍ EMBALAJES',
    date: listDate,
    sections: resultSections,
    footer: footerText,
    plainText: plainText.trim(),
    totalItemsCount: resultSections.reduce((acc, s) => {
      let count = (s.items || []).length;
      if (s.subsections) {
        s.subsections.forEach(sub => count += (sub.items || []).length);
      }
      return acc + count;
    }, 0)
  };
}

module.exports = {
  buildPromoList,
  formatPrice
};
