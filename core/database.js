import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const CQO_FAZENDAS_TOME_ACU = ['FÉ EM DEUS', 'NOVA CONCEIÇÃO', 'VILA NOVA'];

const CQO_CORTE_FORM = {
  id: 'form_cqo_corte',
  area_id: 'campo',
  titulo: 'CQO Corte',
  descricao: 'Piloto digital do formulario Corte. Baseado no papel CQO Corte e Carreamento e alinhado a tabela dig_corte da planilha 1_Digitacao_CQO.',
  versao: 2,
  ativo: 1,
  campos_json: JSON.stringify([
    { id: 'nome_polo', tipo: 'selecao', titulo: 'Polo', opcoes: ['Tomé-Açu'], obrigatorio: 1, legado: 'NomePolo' },
    { id: 'nome_fazenda', tipo: 'selecao', titulo: 'Fazenda', opcoes: CQO_FAZENDAS_TOME_ACU, obrigatorio: 1, legado: 'NomeFazenda' },
    { id: 'parcela', tipo: 'texto', titulo: 'Parcela', placeholder: 'Parcela avaliada', obrigatorio: 1, legado: 'Parcela' },
    { id: 'data_avaliacao', tipo: 'data', titulo: 'Data da avaliacao', obrigatorio: 1, legado: 'DataAvaliacao' },
    { id: 'ciclo_mes', tipo: 'numero', titulo: 'Ciclo do mes', placeholder: 'Ex: 1', obrigatorio: 0, legado: 'ciclo_mes' },
    { id: 'matricula_avaliador', tipo: 'texto', titulo: 'Matricula do avaliador', placeholder: 'Ex: 2005', obrigatorio: 1, legado: 'MatriculaAvaliadores' },
    { id: 'fiscal_resp', tipo: 'texto', titulo: 'Fiscal responsavel', placeholder: 'Nome do fiscal', obrigatorio: 1, legado: 'Fiscal Resp' },
    { id: 'linhas_corte', tipo: 'linhas_cqo_corte', titulo: 'Linhas de avaliacao do corte', obrigatorio: 1, legado: 'linhas_raw' },
    { id: 'observacao', tipo: 'observacao', titulo: 'Observacao geral', placeholder: 'Registre observacoes sem aplicar regra automatica.', obrigatorio: 0, legado: 'Observacao' },
    { id: 'gps_cqo_corte', tipo: 'gps', titulo: 'Localizacao GPS', obrigatorio: 0 },
    { id: 'assinatura_manual', tipo: 'assinatura', titulo: 'Assinatura manual', obrigatorio: 0 }
  ]),
  atualizado_em: new Date().toISOString()
};

const CQO_CARREAMENTO_FORM = {
  id: 'form_cqo_carreamento_fruto_solto',
  area_id: 'campo',
  titulo: 'CQO Carreamento e Fruto Solto',
  descricao: 'Piloto digital do controle unico de Carreamento e Fruto Solto. Fruto solto pode ser preenchido quando a avaliacao ocorrer, mas normalmente fica opcional.',
  versao: 3,
  ativo: 1,
  campos_json: JSON.stringify([
    { id: 'nome_polo', tipo: 'selecao', titulo: 'Polo', opcoes: ['Tomé-Açu'], obrigatorio: 1, legado: 'NomePolo' },
    { id: 'nome_fazenda', tipo: 'selecao', titulo: 'Fazenda', opcoes: CQO_FAZENDAS_TOME_ACU, obrigatorio: 1, legado: 'NomeFazenda' },
    { id: 'parcela', tipo: 'texto', titulo: 'Parcela', placeholder: 'Parcela avaliada', obrigatorio: 1, legado: 'Parcela' },
    { id: 'ano_plantio', tipo: 'numero', titulo: 'Ano do plantio', placeholder: 'Ex: 2013', obrigatorio: 0 },
    { id: 'densidade', tipo: 'numero', titulo: 'Densidade', placeholder: 'Ex: 160', obrigatorio: 0 },
    { id: 'total_plantas_parcela', tipo: 'numero', titulo: 'Total de plantas da parcela', placeholder: 'Ex: 5067', obrigatorio: 0 },
    { id: 'total_cachos_carreados', tipo: 'numero', titulo: 'Total de cachos carreados', placeholder: 'Ex: 120', obrigatorio: 0 },
    { id: 'variedade', tipo: 'texto', titulo: 'Variedade', placeholder: 'Ex: cultivar/variedade', obrigatorio: 0 },
    { id: 'data_avaliacao', tipo: 'data', titulo: 'Data da avaliacao', obrigatorio: 1, legado: 'DataAvaliacao' },
    { id: 'ciclo_mes', tipo: 'numero', titulo: 'Ciclo do mes', placeholder: 'Ex: 1', obrigatorio: 0, legado: 'Ciclo_mes' },
    { id: 'matricula_avaliador', tipo: 'texto', titulo: 'Matricula do avaliador', placeholder: 'Ex: 2005', obrigatorio: 1, legado: 'MatriculaAvaliadores' },
    { id: 'fiscal_resp', tipo: 'texto', titulo: 'Fiscal responsavel', placeholder: 'Nome do fiscal', obrigatorio: 1, legado: 'Fiscal Resp' },
    { id: 'linhas_carreamento', tipo: 'linhas_cqo_carreamento', titulo: 'Linhas de avaliacao do carreamento', obrigatorio: 1, legado: 'linhas_raw' },
    { id: 'observacao', tipo: 'observacao', titulo: 'Observacao geral', placeholder: 'Registre observacoes sem aplicar regra automatica.', obrigatorio: 0 },
    { id: 'gps_cqo_carreamento', tipo: 'gps', titulo: 'Localizacao GPS', obrigatorio: 0 },
    { id: 'assinatura_manual', tipo: 'assinatura', titulo: 'Assinatura manual', obrigatorio: 0 }
  ]),
  atualizado_em: new Date().toISOString()
};

// Fallback in-memory/localStorage structure for web
const webStorage = {
  areas: [
    { id: 'campo', nome: 'Campo', descricao: 'Operações agrícolas de campo', icone: 'agriculture', cor: '#0B6B4A', ativo: 1, ordem: 0 },
    { id: 'producao', nome: 'Produção', descricao: 'Colheita e processamento de dendê', icone: 'grass', cor: '#084C35', ativo: 1, ordem: 1 },
    { id: 'industria', nome: 'Indústria', descricao: 'Extração e refinamento de óleo', icone: 'factory', cor: '#F05A00', ativo: 1, ordem: 2 },
    { id: 'ssma', nome: 'SSMA', descricao: 'Saúde, Segurança e Meio Ambiente', icone: 'health-and-safety', cor: '#EF4444', ativo: 1, ordem: 3 },
    { id: 'manutencao', nome: 'Manutenção', descricao: 'Equipamentos e maquinários', icone: 'build', cor: '#F59E0B', ativo: 1, ordem: 4 },
    { id: 'transporte', nome: 'Transporte', descricao: 'Logística e frota', icone: 'local-shipping', cor: '#3B82F6', ativo: 1, ordem: 5 },
    { id: 'almoxarifado', nome: 'Almoxarifado', descricao: 'Controle de estoque e materiais', icone: 'warehouse', cor: '#8B5CF6', ativo: 1, ordem: 6 },
    { id: 'administrativo', nome: 'Administrativo', descricao: 'Processos administrativos', icone: 'business', cor: '#64748B', ativo: 1, ordem: 7 }
  ],
  formularios: [
    {
      id: 'form_inspecao_campo',
      area_id: 'campo',
      titulo: 'Relatório de Inspeção Diária',
      descricao: 'Coleta de dados sobre saúde da plantação de palma e solo.',
      versao: 1,
      ativo: 1,
      campos_json: JSON.stringify([
        { id: 'talhao', tipo: 'texto', titulo: 'Número do Talhão', placeholder: 'Ex: Talhão 12B', obrigatorio: 1 },
        { id: 'umidade', tipo: 'numero', titulo: 'Umidade do Solo (%)', placeholder: 'Ex: 45', obrigatorio: 0 },
        { id: 'pragas', tipo: 'checkbox', titulo: 'Pragas Identificadas', opcoes: ['Cochonilha', 'Lagarta da Palma', 'Broca do Olho', 'Nenhuma'], obrigatorio: 0 },
        { id: 'observacao', tipo: 'observacao', titulo: 'Observações do Inspetor', placeholder: 'Descreva anomalias encontradas...', obrigatorio: 0 },
        { id: 'foto_talhao', tipo: 'foto', titulo: 'Foto do Talhão', obrigatorio: 1 },
        { id: 'gps_localizacao', tipo: 'gps', titulo: 'Coordenadas GPS', obrigatorio: 1 },
        { id: 'assinatura_inspetor', tipo: 'assinatura', titulo: 'Assinatura do Fiscal', obrigatorio: 1 }
      ]),
      atualizado_em: new Date().toISOString()
    },
    {
      id: 'form_colheita_dende',
      area_id: 'producao',
      titulo: 'Apontamento de Colheita',
      descricao: 'Registro de pesagem e qualidade dos cachos de dendê colhidos.',
      versao: 1,
      ativo: 1,
      campos_json: JSON.stringify([
        { id: 'peso_kg', tipo: 'numero', titulo: 'Peso Líquido da Carga (kg)', placeholder: 'Ex: 12500', obrigatorio: 1 },
        { id: 'qualidade', tipo: 'selecao', titulo: 'Qualidade dos Cachos', opcoes: ['Excelente', 'Boa', 'Regular', 'Ruim'], obrigatorio: 1 },
        { id: 'placa', tipo: 'texto', titulo: 'Placa do Caminhão', placeholder: 'Ex: ABC1D23', obrigatorio: 0 },
        { id: 'motorista', tipo: 'texto', titulo: 'Nome do Motorista', placeholder: 'Nome completo', obrigatorio: 0 },
        { id: 'gps_colheita', tipo: 'gps', titulo: 'Ponto de Colheita (GPS)', obrigatorio: 1 },
        { id: 'foto_cachos', tipo: 'foto', titulo: 'Foto dos Cachos', obrigatorio: 0 },
        { id: 'assinatura_motorista', tipo: 'assinatura', titulo: 'Assinatura do Motorista', obrigatorio: 1 }
      ]),
      atualizado_em: new Date().toISOString()
    },
    {
      id: 'form_controle_caldeira',
      area_id: 'industria',
      titulo: 'Controle de Caldeiras',
      descricao: 'Inspeção de rotina de temperatura, pressão e custos na caldeira industrial.',
      versao: 1,
      ativo: 1,
      campos_json: JSON.stringify([
        { id: 'temperatura', tipo: 'numero', titulo: 'Temperatura (°C)', placeholder: 'Ex: 115', obrigatorio: 1 },
        { id: 'pressao', tipo: 'numero', titulo: 'Pressão (bar)', placeholder: 'Ex: 3.8', obrigatorio: 1 },
        { id: 'turno', tipo: 'radio', titulo: 'Turno de Trabalho', opcoes: ['Manhã', 'Tarde', 'Noite'], obrigatorio: 1 },
        { id: 'ocorrencias', tipo: 'checkbox', titulo: 'Ocorrências no Turno', opcoes: ['Parada Técnica', 'Falta de Vapor', 'Vazamento', 'Nenhuma Ocorrência'], obrigatorio: 0 },
        { id: 'custo_peca', tipo: 'moeda', titulo: 'Custo Estimado de Reparo', placeholder: 'R$ 0,00', obrigatorio: 0 },
        { id: 'data_insp', tipo: 'data', titulo: 'Data da Medição', obrigatorio: 1 },
        { id: 'hora_insp', tipo: 'hora', titulo: 'Hora da Medição', obrigatorio: 1 },
        { id: 'foto_painel', tipo: 'foto', titulo: 'Foto do Painel de Controle', obrigatorio: 0 },
        { id: 'assinatura_operador', tipo: 'assinatura', titulo: 'Assinatura do Operador', obrigatorio: 1 }
      ]),
      atualizado_em: new Date().toISOString()
    },
    CQO_CORTE_FORM,
    CQO_CARREAMENTO_FORM
  ],
  respostas: [],
  anexos: [],
  assinaturas: [],
  gps: [],
  sync_queue: [],
  logs: [],
  usuarios: []
};

// Initial Sync with LocalStorage for Web
if (Platform.OS === 'web') {
  try {
    const savedRespostas = localStorage.getItem('vilanova_respostas');
    if (savedRespostas) webStorage.respostas = JSON.parse(savedRespostas);
    const savedSync = localStorage.getItem('vilanova_sync_queue');
    if (savedSync) webStorage.sync_queue = JSON.parse(savedSync);
    const savedUsuarios = localStorage.getItem('vilanova_usuarios');
    if (savedUsuarios) webStorage.usuarios = JSON.parse(savedUsuarios);
  } catch (e) {
    console.error('Erro ao ler do localStorage:', e);
  }
}

const db = Platform.OS === 'web' ? null : SQLite.openDatabaseSync('vilanova_agro.db');

export const AppDatabase = {
  db,

  // Initialize DB schemas and seeds
  initialize() {
    if (Platform.OS === 'web') {
      console.log('AppDatabase: rodando em modo web. Tabelas mockadas em memória / localStorage.');
      return;
    }

    // 1. Create Tables
    db.execSync(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT NOT NULL,
        cargo TEXT,
        area_id TEXT,
        jwt_token TEXT,
        refresh_token TEXT,
        criado_em TEXT NOT NULL,
        ultimo_acesso TEXT
      );

      CREATE TABLE IF NOT EXISTS areas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT,
        icone TEXT,
        cor TEXT,
        ativo INTEGER DEFAULT 1,
        ordem INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS formularios (
        id TEXT PRIMARY KEY,
        area_id TEXT NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT,
        versao INTEGER DEFAULT 1,
        ativo INTEGER DEFAULT 1,
        campos_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS respostas (
        id TEXT PRIMARY KEY,
        formulario_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        dados_json TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        criado_em TEXT NOT NULL,
        enviado_em TEXT,
        erro_msg TEXT,
        tentativas INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS anexos (
        id TEXT PRIMARY KEY,
        resposta_id TEXT NOT NULL,
        campo_id TEXT NOT NULL,
        caminho_local TEXT NOT NULL,
        nome_arquivo TEXT NOT NULL,
        tamanho_bytes INTEGER,
        tipo_mime TEXT DEFAULT 'image/jpeg',
        enviado INTEGER DEFAULT 0,
        criado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assinaturas (
        id TEXT PRIMARY KEY,
        resposta_id TEXT NOT NULL,
        campo_id TEXT NOT NULL,
        caminho_png TEXT NOT NULL,
        enviado INTEGER DEFAULT 0,
        criado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gps (
        id TEXT PRIMARY KEY,
        resposta_id TEXT NOT NULL,
        campo_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        precisao REAL,
        altitude REAL,
        capturado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        referencia_id TEXT NOT NULL,
        payload_json TEXT,
        status TEXT DEFAULT 'pendente',
        tentativas INTEGER DEFAULT 0,
        max_tentativas INTEGER DEFAULT 3,
        criado_em TEXT NOT NULL,
        processado_em TEXT,
        erro_msg TEXT
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nivel TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        stacktrace TEXT,
        usuario_id TEXT,
        criado_em TEXT NOT NULL
      );
    `);

    // 2. Seed Default Areas if empty
    const areaCount = db.getFirstSync('SELECT COUNT(*) as count FROM areas');
    if (areaCount.count === 0) {
      const areas = [
        ['campo', 'Campo', 'Operações agrícolas de campo', 'agriculture', '#0B6B4A', 1, 0],
        ['producao', 'Produção', 'Colheita e processamento de dendê', 'grass', '#084C35', 1, 1],
        ['industria', 'Indústria', 'Extração e refinamento de óleo', 'factory', '#F05A00', 1, 2],
        ['ssma', 'SSMA', 'Saúde, Segurança e Meio Ambiente', 'health-and-safety', '#EF4444', 1, 3],
        ['manutencao', 'Manutenção', 'Equipamentos e maquinários', 'build', '#F59E0B', 1, 4],
        ['transporte', 'Transporte', 'Logística e frota', 'local-shipping', '#3B82F6', 1, 5],
        ['almoxarifado', 'Almoxarifado', 'Controle de estoque e materiais', 'warehouse', '#8B5CF6', 1, 6],
        ['administrativo', 'Administrativo', 'Processos administrativos', 'business', '#64748B', 1, 7],
      ];

      for (const area of areas) {
        db.runSync(
          'INSERT OR IGNORE INTO areas (id, nome, descricao, icone, cor, ativo, ordem) VALUES (?, ?, ?, ?, ?, ?, ?)',
          area
        );
      }
    }

    // 3. Seed Default Forms if empty
    const formCount = db.getFirstSync('SELECT COUNT(*) as count FROM formularios');
    if (formCount.count === 0) {
      const dateStr = new Date().toISOString();
      const forms = [
        {
          id: 'form_inspecao_campo',
          area_id: 'campo',
          titulo: 'Relatório de Inspeção Diária',
          descricao: 'Coleta de dados sobre saúde da plantação de palma e solo.',
          campos_json: JSON.stringify([
            { id: 'talhao', tipo: 'texto', titulo: 'Número do Talhão', placeholder: 'Ex: Talhão 12B', obrigatorio: 1 },
            { id: 'umidade', tipo: 'numero', titulo: 'Umidade do Solo (%)', placeholder: 'Ex: 45', obrigatorio: 0 },
            { id: 'pragas', tipo: 'checkbox', titulo: 'Pragas Identificadas', opcoes: ['Cochonilha', 'Lagarta da Palma', 'Broca do Olho', 'Nenhuma'], obrigatorio: 0 },
            { id: 'observacao', tipo: 'observacao', titulo: 'Observações do Inspetor', placeholder: 'Descreva anomalias encontradas...', obrigatorio: 0 },
            { id: 'foto_talhao', tipo: 'foto', titulo: 'Foto do Talhão', obrigatorio: 1 },
            { id: 'gps_localizacao', tipo: 'gps', titulo: 'Coordenadas GPS', obrigatorio: 1 },
            { id: 'assinatura_inspetor', tipo: 'assinatura', titulo: 'Assinatura do Fiscal', obrigatorio: 1 }
          ])
        },
        {
          id: 'form_colheita_dende',
          area_id: 'producao',
          titulo: 'Apontamento de Colheita',
          descricao: 'Registro de pesagem e qualidade dos cachos de dendê colhidos.',
          campos_json: JSON.stringify([
            { id: 'peso_kg', tipo: 'numero', titulo: 'Peso Líquido da Carga (kg)', placeholder: 'Ex: 12500', obrigatorio: 1 },
            { id: 'qualidade', tipo: 'selecao', titulo: 'Qualidade dos Cachos', opcoes: ['Excelente', 'Boa', 'Regular', 'Ruim'], obrigatorio: 1 },
            { id: 'placa', tipo: 'texto', titulo: 'Placa do Caminhão', placeholder: 'Ex: ABC1D23', obrigatorio: 0 },
            { id: 'motorista', tipo: 'texto', titulo: 'Nome do Motorista', placeholder: 'Nome completo', obrigatorio: 0 },
            { id: 'gps_colheita', tipo: 'gps', titulo: 'Ponto de Colheita (GPS)', obrigatorio: 1 },
            { id: 'foto_cachos', tipo: 'foto', titulo: 'Foto dos Cachos', obrigatorio: 0 },
            { id: 'assinatura_motorista', tipo: 'assinatura', titulo: 'Assinatura do Motorista', obrigatorio: 1 }
          ])
        },
        {
          id: 'form_controle_caldeira',
          area_id: 'industria',
          titulo: 'Controle de Caldeiras',
          descricao: 'Inspeção de rotina de temperatura, pressão e custos na caldeira industrial.',
          campos_json: JSON.stringify([
            { id: 'temperatura', tipo: 'numero', titulo: 'Temperatura (°C)', placeholder: 'Ex: 115', obrigatorio: 1 },
            { id: 'pressao', tipo: 'numero', titulo: 'Pressão (bar)', placeholder: 'Ex: 3.8', obrigatorio: 1 },
            { id: 'turno', tipo: 'radio', titulo: 'Turno de Trabalho', opcoes: ['Manhã', 'Tarde', 'Noite'], obrigatorio: 1 },
            { id: 'ocorrencias', tipo: 'checkbox', titulo: 'Ocorrências no Turno', opcoes: ['Parada Técnica', 'Falta de Vapor', 'Vazamento', 'Nenhuma Ocorrência'], obrigatorio: 0 },
            { id: 'custo_peca', tipo: 'moeda', titulo: 'Custo Estimado de Reparo', placeholder: 'R$ 0,00', obrigatorio: 0 },
            { id: 'data_insp', tipo: 'data', titulo: 'Data da Medição', obrigatorio: 1 },
            { id: 'hora_insp', tipo: 'hora', titulo: 'Hora da Medição', obrigatorio: 1 },
            { id: 'foto_painel', tipo: 'foto', titulo: 'Foto do Painel de Controle', obrigatorio: 0 },
            { id: 'assinatura_operador', tipo: 'assinatura', titulo: 'Assinatura do Operador', obrigatorio: 1 }
          ])
        }
      ];

      for (const form of forms) {
        db.runSync(
          'INSERT OR IGNORE INTO formularios (id, area_id, titulo, descricao, versao, ativo, campos_json, atualizado_em) VALUES (?, ?, ?, ?, 1, 1, ?, ?)',
          [form.id, form.area_id, form.titulo, form.descricao, form.campos_json, dateStr]
        );
      }
    }

    db.runSync(
      'INSERT OR REPLACE INTO formularios (id, area_id, titulo, descricao, versao, ativo, campos_json, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        CQO_CORTE_FORM.id,
        CQO_CORTE_FORM.area_id,
        CQO_CORTE_FORM.titulo,
        CQO_CORTE_FORM.descricao,
        CQO_CORTE_FORM.versao,
        CQO_CORTE_FORM.ativo,
        CQO_CORTE_FORM.campos_json,
        new Date().toISOString(),
      ]
    );

    db.runSync(
      'INSERT OR REPLACE INTO formularios (id, area_id, titulo, descricao, versao, ativo, campos_json, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        CQO_CARREAMENTO_FORM.id,
        CQO_CARREAMENTO_FORM.area_id,
        CQO_CARREAMENTO_FORM.titulo,
        CQO_CARREAMENTO_FORM.descricao,
        CQO_CARREAMENTO_FORM.versao,
        CQO_CARREAMENTO_FORM.ativo,
        CQO_CARREAMENTO_FORM.campos_json,
        new Date().toISOString(),
      ]
    );
  },

  // Helper CRUD methods
  getAll(sql, params = []) {
    if (Platform.OS === 'web') {
      if (sql.includes('SELECT * FROM areas')) {
        return webStorage.areas;
      }
      if (sql.includes('SELECT * FROM formularios WHERE area_id = ?')) {
        return webStorage.formularios.filter(f => f.area_id === params[0]);
      }
      if (sql.includes('SELECT * FROM formularios')) {
        return webStorage.formularios;
      }
      if (sql.includes('SELECT * FROM respostas')) {
        return webStorage.respostas;
      }
      if (sql.includes('SELECT * FROM sync_queue WHERE status = ?')) {
        return webStorage.sync_queue.filter(q => q.status === params[0]);
      }
      return [];
    }
    return db.getAllSync(sql, params);
  },

  getFirst(sql, params = []) {
    if (Platform.OS === 'web') {
      if (sql.includes('SELECT COUNT(*) as count FROM areas')) {
        return { count: webStorage.areas.length };
      }
      if (sql.includes('SELECT COUNT(*) as count FROM formularios')) {
        if (sql.includes('WHERE area_id = ?')) {
          return {
            count: webStorage.formularios.filter(f => f.area_id === params[0] && f.ativo === 1).length,
          };
        }
        return { count: webStorage.formularios.length };
      }
      if (sql.includes('SELECT * FROM formularios WHERE id = ?')) {
        return webStorage.formularios.find(f => f.id === params[0]) || null;
      }
      if (sql.includes('SELECT * FROM usuarios') || sql.includes('FROM usuarios WHERE')) {
        if (params[0]) {
          return webStorage.usuarios.find(u => u.email === params[0] || u.id === params[0]) || null;
        }
        return webStorage.usuarios[0] || null;
      }
      return null;
    }
    return db.getFirstSync(sql, params);
  },

  run(sql, params = []) {
    if (Platform.OS === 'web') {
      return { lastInsertRowId: Date.now(), changes: 1 };
    }
    return db.runSync(sql, params);
  },

  insert(table, data) {
    if (Platform.OS === 'web') {
      if (table === 'respostas') {
        const index = webStorage.respostas.findIndex(r => r.id === data.id);
        if (index >= 0) webStorage.respostas[index] = data;
        else webStorage.respostas.push(data);
        localStorage.setItem('vilanova_respostas', JSON.stringify(webStorage.respostas));
      } else if (table === 'sync_queue') {
        const index = webStorage.sync_queue.findIndex(s => s.id === data.id);
        if (index >= 0) webStorage.sync_queue[index] = data;
        else webStorage.sync_queue.push(data);
        localStorage.setItem('vilanova_sync_queue', JSON.stringify(webStorage.sync_queue));
      } else if (table === 'usuarios') {
        const index = webStorage.usuarios.findIndex(u => u.id === data.id);
        if (index >= 0) webStorage.usuarios[index] = data;
        else webStorage.usuarios.push(data);
        localStorage.setItem('vilanova_usuarios', JSON.stringify(webStorage.usuarios));
      }
      return { lastInsertRowId: data.id || Date.now(), changes: 1 };
    }
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const params = Object.values(data);
    return db.runSync(sql, params);
  }
};
