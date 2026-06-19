const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = value.toString().replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumRows = (rows, fieldIds) => {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((total, row) => {
    const value = fieldIds.reduce((found, fieldId) => {
      if (found !== null && found !== undefined && found !== '') return found;
      return row?.[fieldId];
    }, null);
    return total + toNumber(value);
  }, 0);
};

const formatMatriculasAvaliadores = (values) => (
  [values.matricula_avaliador, values.matricula_avaliador_2]
    .filter((item) => item && item.toString().trim().length > 0)
    .join(' / ')
);

const observacaoTexto = (value) => (
  value && typeof value === 'object' ? value.texto || '' : value || ''
);

const cachoTotalRows = (rows) => sumRows(rows, [
  'cacho_esquecido_ciclo',
  'cacho_esquecido',
  'cacho_verde',
  'cacho_maduro',
  'cacho_passado',
  'cacho_infermo',
  'bucha',
  'cacho_talo_comprido',
  'cacho_estrela',
  'cachos_estrela',
  'cacho_avermelhado',
  'cachos_avermelhados',
]);

const buildCqoCorteLegacyPayload = (formId, values) => {
  if (formId !== 'form_cqo_corte') return null;

  const rows = Array.isArray(values.linhas_corte) ? values.linhas_corte : [];

  return {
    origem_formulario: 'CQO Corte e Carreamento.xlsx',
    destino_referencia: {
      arquivo: 'E:\\TECNICA\\Qualidade Agricola\\1_Digitacao_CQO.xlsx',
      aba: 'corte',
      tabela: 'dig_corte',
    },
    status: 'rascunho_tecnico_pendente_validacao',
    campos_digitados: {
      NomePolo: values.nome_polo || null,
      NomeFazenda: values.nome_fazenda || null,
      Parcela: values.parcela || null,
      DataAvaliacao: values.data_avaliacao || null,
      ciclo_mes: values.ciclo_mes || null,
      MatriculaAvaliadores: formatMatriculasAvaliadores(values) || null,
      MatriculaAvaliador2: values.matricula_avaliador_2 || null,
      'Fiscal Resp': values.fiscal_resp || null,
      'Fiscal Resp Equipe': values.fiscal_resp_equipe || null,
      MatriculaDigitador: values.matricula_avaliador || null,
      Observacao: observacaoTexto(values.observacao) || null,
      Acompanhamento: values.acompanhamento || null,
    },
    previa_agregada_linhas: {
      NumeroPlantasObservadas: sumRows(rows, ['numero_plantas_observadas', 'numero_na_linha']),
      NumeroCahosObservadosPapel: cachoTotalRows(rows),
      CachoEsquecidoCiclo: sumRows(rows, ['cacho_esquecido_ciclo', 'cacho_esquecido']),
      CachoVerde: sumRows(rows, ['cacho_verde']),
      CachoMaduro: sumRows(rows, ['cacho_maduro']),
      CachoPassado: sumRows(rows, ['cacho_passado']),
      CachoInfermo: sumRows(rows, ['cacho_infermo']),
      Bucha: sumRows(rows, ['bucha']),
      FolhaMamando: sumRows(rows, ['folha_mamando']),
      CachoTaloComprido: sumRows(rows, ['cacho_talo_comprido']),
      folhaCortadaIndev: sumRows(rows, ['folha_cortada_indevida']),
      cachoMalOosicionado: sumRows(rows, ['cacho_mal_posicionado']),
      CachoEstrela: sumRows(rows, ['cacho_estrela', 'cachos_estrela']),
      CachoBrocado: sumRows(rows, ['cacho_brocado', 'cachos_brocados']),
      CachoAvermelhado: sumRows(rows, ['cacho_avermelhado', 'cachos_avermelhados']),
    },
    formulas_referencia_nao_autoritativas: {
      NumeroCahosObservados: 'Soma dos tipos de cacho achados, exceto CachoBrocado e Palha mal posicionada',
      'estimativa de cacho perdido/pla': 'CachoEsquecidoCiclo / NumeroPlantasObservadas * N de plantas Atual',
      'perdas t': 'estimativa de cacho perdido/pla * Peso Kg CORTE / 1000',
    },
    linhas_raw: rows,
  };
};

const buildCqoCarreamentoLegacyPayload = (formId, values) => {
  if (formId !== 'form_cqo_carreamento_fruto_solto') return null;

  const rows = Array.isArray(values.linhas_carreamento) ? values.linhas_carreamento : [];

  return {
    origem_formulario: 'CQO Corte e Carreamento.xlsx',
    destino_referencia: {
      arquivo: 'E:\\TECNICA\\Qualidade Agricola\\1_Digitacao_CQO.xlsx',
      aba: 'carreamento',
      tabela: 'dig_carreamento',
    },
    status: 'rascunho_tecnico_pendente_validacao',
    campos_digitados: {
      NomePolo: values.nome_polo || null,
      NomeFazenda: values.nome_fazenda || null,
      Parcela: values.parcela || null,
      AnoPlantio: values.ano_plantio || null,
      Densidade: values.densidade || null,
      TotalPlantasParcela: values.total_plantas_parcela || null,
      TotalCachosCarreados: values.total_cachos_carreados || null,
      Variedade: values.variedade || null,
      DataAvaliacao: values.data_avaliacao || null,
      Ciclo_mes: values.ciclo_mes || null,
      MatriculaAvaliadores: formatMatriculasAvaliadores(values) || null,
      MatriculaAvaliador2: values.matricula_avaliador_2 || null,
      'Fiscal Resp': values.fiscal_resp || null,
      'Fiscal Resp Equipe': values.fiscal_resp_equipe || null,
      MatriculaDigitador: values.matricula_avaliador || null,
      Observacao: observacaoTexto(values.observacao) || null,
      Acompanhamento: values.acompanhamento || null,
    },
    previa_agregada_linhas: {
      NumeroPlantasObservadas: sumRows(rows, ['numero_plantas_observadas']),
      cachoMalPosicionado: sumRows(rows, ['cacho_mal_posicionado']),
      Cachonaocarreado: sumRows(rows, ['cacho_nao_carreado']),
      PesoMedio: sumRows(rows, ['peso_medio']),
    },
    formulas_referencia_nao_autoritativas: {
      Ano: 'ano(DataAvaliacao)',
      Mes: 'primeiro dia do mes da DataAvaliacao',
      CicloDoMes: 'mes(DataAvaliacao)',
      'estimativa de perdas cnc/pla': 'Cachonaocarreado / NumeroPlantasObservadas * N de plantas Atual',
      'perdas t': 'estimativa de perdas cnc/pla * Peso Kg carreamento / 1000',
    },
    linhas_raw: rows,
  };
};

export const buildLegacyPayload = (formId, values) => (
  buildCqoCorteLegacyPayload(formId, values)
  || buildCqoCarreamentoLegacyPayload(formId, values)
);

export const observacaoFotos = (values) => {
  const value = values?.observacao;
  return value && typeof value === 'object' && Array.isArray(value.fotos)
    ? value.fotos
    : [];
};
