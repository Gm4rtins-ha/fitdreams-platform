// frontend/src/utils/dateUtils.js
export const formatDate = (rawDate) => {
  if (!rawDate) return '--';

  const date = new Date(rawDate);
  if (isNaN(date.getTime())) {
    return String(rawDate);
  }

  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();

  const horas = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${ano} ${horas}:${min}`;
};
