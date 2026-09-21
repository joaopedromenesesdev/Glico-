/**
 * Utilitários de data e hora formatados em português brasileiro (pt-BR)
 */

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

export function formatDateShort(isoString: string): string {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function formatTimeShort(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getRelativeTimeLabel(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMinutes = Math.round((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return 'Agora mesmo';
  if (diffMinutes < 60) return `Há ${diffMinutes} min`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return `Hoje às ${formatTimeShort(isoString)}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.getDate() === date.getDate()) {
    return `Ontem às ${formatTimeShort(isoString)}`;
  }

  return formatDateTime(isoString);
}

export function getCurrentTimeFormatted(date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function isValidTime(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return false;
  if (parts[0].length !== 2 || parts[1].length !== 2) return false;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return !isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function subtractMinutesFromNow(minutes: number, baseDate = new Date()): string {
  const target = new Date(baseDate.getTime() - minutes * 60 * 1000);
  return getCurrentTimeFormatted(target);
}

export function createIsoFromTime(timeStr: string, baseDate = new Date()): string {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  const d = new Date(baseDate);
  if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
    d.setHours(h, m, 0, 0);
    // Se o horário especificado for da noite (>= 18h) e a data/hora base for de manhã (< 12h),
    // e cair no futuro em relação à data base, consideramos que se refere à medição da noite anterior
    if (d.getTime() > baseDate.getTime() && baseDate.getHours() < 12 && h >= 18) {
      d.setDate(d.getDate() - 1);
    }
  }
  return d.toISOString();
}

/* ── Funções utilitárias de calendário ── */

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/**
 * Formata a data para exibição amigável ("Hoje, 21/09", "Ontem, 20/09" ou "21/09/2026")
 */
export function formatDateDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  if (isToday(date)) return `Hoje, ${day}/${month}`;
  if (isYesterday(date)) return `Ontem, ${day}/${month}`;
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Combina uma data selecionada no calendário com o horário digitado (HH:MM)
 */
export function createIsoFromDateAndTime(date: Date, timeStr: string): string {
  const d = new Date(date);
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
    d.setHours(h, m, 0, 0);
  }
  return d.toISOString();
}

/**
 * Número de dias no mês
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Dia da semana do 1º dia do mês (0 = Domingo, 6 = Sábado)
 */
export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function getMonthName(month: number): string {
  return MONTH_NAMES_PT[month] || '';
}
