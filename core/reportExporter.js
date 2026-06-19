import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const corteColumns = [
  'rua_index',
  'lado_linha',
  'linha',
  'matricula_colaborador',
  'numero_plantas_linha',
  'numero_plantas_observadas',
  'numero_cachos_observados_papel',
  'cacho_esquecido_ciclo',
  'cacho_verde',
  'cacho_maduro',
  'cacho_passado',
  'cacho_infermo',
  'bucha',
  'folha_mamando',
  'cacho_talo_comprido',
  'folha_cortada_indevida',
  'cacho_mal_posicionado',
  'cacho_estrela',
  'cacho_brocado',
  'cacho_avermelhado',
];

const corteHighlightColumns = new Set([
  'cacho_esquecido_ciclo',
  'cacho_verde',
  'cacho_maduro',
  'cacho_passado',
  'cacho_infermo',
  'bucha',
]);

const carreamentoColumns = [
  'linha',
  'numero_plantas_linha',
  'cacho_mal_posicionado',
  'cacho_nao_carreado',
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function numberValue(value) {
  const parsed = Number(String(value || '0').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return '____/____/______';
  const [year, month, day] = String(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatTotal(value) {
  if (!value) return '';
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(rounded);
}

function formatAvaliadores(values) {
  return [values.matricula_avaliador, values.matricula_avaliador_2]
    .filter((item) => item && item.toString().trim().length > 0)
    .join(' / ');
}

function observacaoTexto(value) {
  return value && typeof value === 'object' ? value.texto || '' : value || '';
}

function rowsFrom(values, key) {
  return Array.isArray(values?.[key]) ? values[key] : [];
}

function corteRows(values) {
  const rows = rowsFrom(values, 'linhas_corte').slice(0, 10);
  while (rows.length < 10) rows.push({});

  return rows.map((row) => `
    <tr class="data-row">
      ${corteColumns.map((column) => `<td class="${corteHighlightColumns.has(column) ? 'highlight-cell' : ''}">${escapeHtml(row[column])}</td>`).join('')}
    </tr>
  `).join('');
}

function corteTotals(values) {
  const rows = rowsFrom(values, 'linhas_corte');
  return corteColumns.map((column, index) => {
    if (index === 0) return '<td class="total">Total</td>';
    const total = rows.reduce((sum, row) => sum + numberValue(row[column]), 0);
    return `<td class="${corteHighlightColumns.has(column) ? 'highlight-cell' : ''}">${formatTotal(total)}</td>`;
  }).join('');
}

function carreamentoRows(values) {
  const sourceRows = rowsFrom(values, 'linhas_carreamento');
  const rows = sourceRows.slice(0, 11);
  while (rows.length < 11) rows.push({});

  return rows.map((row, index) => `
    <tr class="${[0, 4, 8].includes(index) ? 'row-large' : 'row-small'}">
      ${carreamentoColumns.map((column) => `<td class="${['numero_plantas_observadas', 'peso_medio'].includes(column) ? 'highlight-cell' : ''}">${escapeHtml(row[column])}</td>`).join('')}
    </tr>
  `).join('');
}

function carreamentoTotals(values) {
  const rows = rowsFrom(values, 'linhas_carreamento');
  const totals = {
    numero_plantas_linha: 0,
    cacho_mal_posicionado: 0,
    cacho_nao_carreado: 0,
  };

  rows.forEach((row) => {
    Object.keys(totals).forEach((key) => {
      totals[key] += numberValue(row[key]);
    });
  });

  return `
    <td class="total">Total</td>
    <td>${formatTotal(totals.numero_plantas_linha)}</td>
    <td>${formatTotal(totals.cacho_mal_posicionado)}</td>
    <td>${formatTotal(totals.cacho_nao_carreado)}</td>
  `;
}

function corteHtml(values) {
  return `
    <html><head><meta charset="utf-8"><style>
      @page{size:A4 landscape;margin:6mm}
      body{margin:0;font-family:Arial,sans-serif;font-size:9px;color:#000}
      .page{width:100%;border:2px solid #000;box-sizing:border-box}
      .title{text-align:center;font-size:14px;font-weight:bold;padding-bottom:4px}
      .info{height:28px;display:flex;align-items:center;gap:6px;border-bottom:1px solid #000;padding:0 3px;box-sizing:border-box;font-weight:bold}
      .center{justify-content:center}.line{display:inline-block;border-bottom:1px solid #000;min-width:100px;height:12px}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      th,td{border:1px solid #000;text-align:center;vertical-align:middle;padding:2px;word-break:break-word}
      th{height:42px;font-weight:bold}.gray{background:#8f8f8f}.highlight-cell{background:#eee}
      .data-row td,.total-row td{height:28px}.footer td{height:28px;text-align:left;vertical-align:top;font-weight:bold}.total{text-align:left;font-weight:bold}
    </style></head><body>
      <div class="page">
        <div class="title">Controle de Qualidade Agricola: Corte</div>
        <div class="info center"><span>Ciclo:<span class="line">${escapeHtml(values.ciclo_mes)}</span></span><span>Fazenda:<span class="line" style="min-width:260px">${escapeHtml(values.nome_fazenda)}</span></span><span>Data:${escapeHtml(formatDate(values.data_avaliacao))}</span></div>
        <div class="info"><span>Nome: Avaliador <span class="line" style="min-width:190px">${escapeHtml(formatAvaliadores(values))}</span></span><span>Parcela: <span class="line" style="min-width:35px">${escapeHtml(values.parcela)}</span></span></div>
        <div class="info"><span>Fiscal Resp.<span class="line" style="min-width:220px">${escapeHtml(values.fiscal_resp)}</span></span><span>Fiscal Resp. Equipe<span class="line" style="min-width:220px">${escapeHtml(values.fiscal_resp_equipe)}</span></span></div>
        <table><thead><tr>
          <th>Rua<br>avaliada</th><th>Lado<br>da rua</th><th>Linha</th><th>Matricula<br>colab.</th><th>No. de plantas<br>da linha</th><th>No. na<br>linha</th><th>Total cachos<br>observados</th>
          <th class="gray">Cacho<br>Esquecido</th><th class="gray">Cacho<br>Verde</th><th class="gray">Cacho<br>Maduro</th><th class="gray">Cacho<br>passado</th><th class="gray">Cacho<br>infermo</th><th class="gray">Bucha</th>
          <th>Folha<br>mamando</th><th>Cacho<br>Talo<br>Comprido</th><th>Folha<br>cortada<br>indevida</th><th>Palha mal<br>Posicionada</th><th>Cachos<br>Estrela</th><th>Cachos<br>Brocados</th><th>Cachos<br>Avermelhado</th>
        </tr></thead><tbody>${corteRows(values)}</tbody><tfoot><tr class="total-row">${corteTotals(values)}</tr><tr class="footer"><td colspan="7">Fiscal responsavel:<br>${escapeHtml(values.fiscal_resp)}</td><td colspan="7">Fiscal resp. equipe:<br>${escapeHtml(values.fiscal_resp_equipe)}</td><td colspan="6">Observacao:<br>${escapeHtml(observacaoTexto(values.observacao))}</td></tr></tfoot></table>
      </div>
    </body></html>
  `;
}
function carreamentoHtml(values) {
  return `
    <html><head><meta charset="utf-8"><style>
      @page{size:A4 portrait;margin:10mm}
      body{font-family:Arial,sans-serif;font-size:11px;color:#000;margin:0;background:#fff}
      .page{width:100%;border:2px solid #000;box-sizing:border-box}.title{text-align:center;font-weight:bold;padding:8px 0}
      .info{padding:3px 5px;display:flex;gap:8px;flex-wrap:wrap;font-weight:bold}.line{border-bottom:1px solid #000;display:inline-block;min-width:90px;min-height:12px}
      table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #000;text-align:center;vertical-align:middle;padding:3px}th{font-weight:bold}.gray{background:#8f8f8f}.highlight-cell{background:#eee}.row-small td{height:26px}.row-large td{height:56px}.footer td{height:44px;vertical-align:bottom;text-align:left;padding:5px}.assinatura{text-align:center}.total{font-weight:bold;text-align:left}
    </style></head><body>
      <div class="page">
        <div class="title">Controle de Qualidade Agrícola: Carreamento</div>
        <div class="info"><span>Polo: Tomé-Açu</span><span>Fazenda: <span class="line">${escapeHtml(values.nome_fazenda)}</span></span><span>Ano Plantio: <span class="line">${escapeHtml(values.ano_plantio)}</span></span><span>Data ${escapeHtml(formatDate(values.data_avaliacao))}</span></div>
        <div class="info"><span>Nome: Avaliador <span class="line">${escapeHtml(formatAvaliadores(values))}</span></span><span>Parcela:<span class="line">${escapeHtml(values.parcela)}</span></span><span>Densidade:<span class="line">${escapeHtml(values.densidade)}</span></span><span>Total de plantas da parcela:<span class="line">${escapeHtml(values.total_plantas_parcela)}</span></span></div>
        <div class="info"><span>Peso médio:<span class="line"></span></span><span>Total Cachos Carre.:<span class="line">${escapeHtml(values.total_cachos_carreados)}</span></span><span>Variedade:<span class="line">${escapeHtml(values.variedade)}</span></span><span>Ciclo:<span class="line">${escapeHtml(values.ciclo_mes)}</span></span><span>Fiscal:<span class="line">${escapeHtml(values.fiscal_resp)}</span></span><span>Fiscal equipe:<span class="line">${escapeHtml(values.fiscal_resp_equipe)}</span></span></div>
        <table><colgroup><col style="width:18%"><col style="width:22%"><col style="width:26%"><col style="width:34%"></colgroup>
          <thead><tr><th>Linha</th><th>Nº de<br>plantas<br>da linha</th><th>Cachos mal<br>posicionados</th><th>Nº de cachos não<br>carreados<br>observados</th></tr></thead>
          <tbody>${carreamentoRows(values)}</tbody><tfoot><tr>${carreamentoTotals(values)}</tr><tr class="footer"><td colspan="2" class="assinatura">Fiscal responsável<br>${escapeHtml(values.fiscal_resp)}</td><td>Fiscal resp. equipe:<br>${escapeHtml(values.fiscal_resp_equipe)}</td><td>Observação:<br>${escapeHtml(observacaoTexto(values.observacao))}</td></tr></tfoot>
        </table>
      </div>
    </body></html>
  `;
}

function htmlFor(type, values) {
  return type === 'carreamento' ? carreamentoHtml(values) : corteHtml(values);
}

function downloadWebFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function printWebHtml(html, name) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    downloadWebFile(html, `${name}.html`, 'text/html;charset=utf-8');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

export async function exportRecord({ type, values, format }) {
  const html = htmlFor(type, values);
  const name = `${type}-${new Date().toISOString().slice(0, 10)}`;

  if (Platform.OS === 'web') {
    if (format === 'pdf') {
      printWebHtml(html, name);
      return;
    }

    downloadWebFile(
      html,
      `${name}.xls`,
      'application/vnd.ms-excel;charset=utf-8'
    );
    return;
  }

  if (format === 'pdf') {
    const result = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Compartilhar ${name}.pdf`,
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${name}.xls`;
  await FileSystem.writeAsStringAsync(uri, html, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.ms-excel',
    dialogTitle: `Compartilhar ${name}.xls`,
  });
}

export async function exportJsonFile({ data, filename, dialogTitle = 'Compartilhar JSON' }) {
  const content = JSON.stringify(data, null, 2);

  if (Platform.OS === 'web') {
    downloadWebFile(content, filename, 'application/json;charset=utf-8');
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle,
    UTI: 'public.json',
  });
}
