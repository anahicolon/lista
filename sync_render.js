const fs = require('fs');
const path = require('path');
const parser = require('./excel_parser');

const RENDER_URL = process.env.RENDER_URL || 'https://lista-rpuy.onrender.com';

async function uploadToRender(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('No se encontró el archivo Excel a subir: ' + filePath);
  }

  const fileName = path.basename(filePath);
  const fileStats = fs.statSync(filePath);
  const fileBytes = fs.readFileSync(filePath);

  console.log(`Subiendo "${fileName}" (${(fileBytes.length / 1024).toFixed(1)} KB) a ${RENDER_URL}...`);

  const form = new FormData();
  form.append('excel', new Blob([fileBytes]), fileName);

  const res = await fetch(`${RENDER_URL}/api/upload`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error ${res.status}: ${errorText}`);
  }

  const json = await res.json();
  return {
    ...json,
    localFile: filePath,
    localModified: fileStats.mtime
  };
}

// CLI runner
async function main() {
  console.log('============================================================');
  console.log('  ACTUALIZADOR AUTOMÁTICO DE PRECIOS A LA WEB (RENDER)');
  console.log(`  Destino: ${RENDER_URL}`);
  console.log('============================================================\n');

  try {
    const targetFile = parser.findExcelFile(__dirname);
    if (!targetFile) {
      console.error('❌ ERROR: No se encontró Tablet ultima.xlsx ni Tablet ultima.xls');
      console.error('   Buscado en: D:\\DATOS\\Trabajo y en ' + __dirname);
      process.exit(1);
    }

    console.log(`📂 Archivo detectado: ${targetFile}`);
    const result = await uploadToRender(targetFile);

    console.log('\n✅ ¡ÉXITO! Los precios fueron actualizados online en vivo:');
    console.log(`   - Artículos procesados: ${result.totalProducts}`);
    console.log(`   - Archivo: ${result.fileName}`);
    console.log(`   - Catálogo web: ${RENDER_URL}`);
    console.log(`   - Lista WhatsApp: ${RENDER_URL}/lista.html\n`);
    console.log('============================================================');
  } catch (err) {
    console.error('\n❌ ERROR AL SINCRONIZAR:', err.message);
    console.log('Verifique su conexión a internet y vuelva a intentar.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  uploadToRender,
  RENDER_URL
};
