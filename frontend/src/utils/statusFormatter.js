/**
 * Utilitário para formatar status do sistema
 */

/**
 * Formata um status para exibição
 * @param {string} status - Status no formato do banco (ex: PENDENTE_DESMEMBRAMENTO)
 * @returns {string} - Status formatado (ex: PENDENTE DE DESMEMBRAMENTO)
 */
export function formatarStatus(status) {
  if (!status) return status;
  
  // Substituir underscores por espaços e capitalizar
  return status
    .split('_')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Retorna a classe CSS para badge de status
 * @param {string} status - Status do item
 * @returns {string} - Nome da classe CSS
 */
export function getStatusBadge(status) {
  if (!status) return 'badge-secondary';
  
  const statusUpper = status.toUpperCase();
  
  if (statusUpper.includes('PENDENTE')) {
    return 'badge-warning';
  }
  if (statusUpper.includes('CRIADA') || statusUpper.includes('ABERTO')) {
    return 'badge-info';
  }
  if (statusUpper.includes('SEPARADA') || statusUpper.includes('EM_ANDAMENTO')) {
    return 'badge-primary';
  }
  if (statusUpper.includes('ENVIADA') || statusUpper.includes('FINALIZADA') || statusUpper.includes('CONCLUIDO')) {
    return 'badge-success';
  }
  if (statusUpper.includes('CANCELADA') || statusUpper.includes('ERRO')) {
    return 'badge-danger';
  }
  
  return 'badge-secondary';
}










