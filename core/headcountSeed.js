import headcountData from '../assets/data/headcount_colaboradores.json';

const DEFAULT_PASSWORD = '1234';

function normalizeMatricula(value) {
  return String(value || '').replace(/\D/g, '').trim();
}

export function getSeedCollaborators() {
  if (!Array.isArray(headcountData?.collaborators)) {
    return [];
  }

  return headcountData.collaborators
    .filter((item) => item?.matricula && item?.nome)
    .map((item) => ({
      matricula: normalizeMatricula(item.matricula),
      senha: item.senha || DEFAULT_PASSWORD,
      nome: item.nome,
      departamento: item.departamento || '',
      cargo: item.cargo || '',
      gestor: item.gestor || '',
      status: item.status || 'ATIVO',
      admissao_excel: item.admissao_excel || '',
      fonte_aba: item.fonte_aba || headcountData.source_sheet || '',
      fonte_arquivo: item.fonte_arquivo || headcountData.source_file || '',
      reference_date: headcountData.reference_date || '',
      imported_at: headcountData.imported_at || '',
    }));
}

export function findSeedCollaborator(matricula) {
  const normalized = normalizeMatricula(matricula);
  return getSeedCollaborators().find(
    (item) => item.matricula === normalized && item.status === 'ATIVO'
  ) || null;
}
