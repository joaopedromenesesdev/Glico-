import {
  formatDateTime,
  formatDateShort,
  formatTimeShort,
  getRelativeTimeLabel,
  getCurrentTimeFormatted,
  isValidTime,
  subtractMinutesFromNow,
  createIsoFromTime,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('getCurrentTimeFormatted', () => {
    it('formats given date correctly to HH:mm', () => {
      const d = new Date(2026, 8, 13, 9, 5);
      expect(getCurrentTimeFormatted(d)).toBe('09:05');

      const d2 = new Date(2026, 8, 13, 21, 45);
      expect(getCurrentTimeFormatted(d2)).toBe('21:45');
    });
  });

  describe('isValidTime', () => {
    it('validates 24-hour time strings correctly', () => {
      expect(isValidTime('00:00')).toBe(true);
      expect(isValidTime('08:30')).toBe(true);
      expect(isValidTime('23:59')).toBe(true);
      expect(isValidTime('12:00')).toBe(true);
    });

    it('rejects invalid time strings', () => {
      expect(isValidTime('')).toBe(false);
      expect(isValidTime('24:00')).toBe(false);
      expect(isValidTime('12:60')).toBe(false);
      expect(isValidTime('8:30')).toBe(false);
      expect(isValidTime('12:5')).toBe(false);
      expect(isValidTime('abc')).toBe(false);
      expect(isValidTime('25:00')).toBe(false);
      expect(isValidTime('12:-5')).toBe(false);
    });
  });

  describe('subtractMinutesFromNow', () => {
    it('subtracts minutes accurately from base date', () => {
      const base = new Date(2026, 8, 13, 14, 30);
      expect(subtractMinutesFromNow(15, base)).toBe('14:15');
      expect(subtractMinutesFromNow(30, base)).toBe('14:00');
      expect(subtractMinutesFromNow(60, base)).toBe('13:30');
      expect(subtractMinutesFromNow(45, base)).toBe('13:45');
    });
  });

  describe('createIsoFromTime', () => {
    it('creates accurate ISO string for given time on base date', () => {
      const base = new Date(2026, 8, 13, 15, 0);
      const iso = createIsoFromTime('10:30', base);
      const parsed = new Date(iso);
      expect(parsed.getHours()).toBe(10);
      expect(parsed.getMinutes()).toBe(30);
      expect(parsed.getDate()).toBe(13);
    });

    it('handles overnight registration if measuring late at night and registering in morning', () => {
      // Simula 07:00 da manhã do dia 14
      const morningBase = new Date(2026, 8, 14, 7, 0);
      // Registrando medição feita às 23:30 (da noite anterior)
      const iso = createIsoFromTime('23:30', morningBase);
      const parsed = new Date(iso);
      expect(parsed.getHours()).toBe(23);
      expect(parsed.getMinutes()).toBe(30);
      expect(parsed.getDate()).toBe(13); // Dia anterior
    });

    it('falls back safely if given malformed time string', () => {
      const base = new Date(2026, 8, 13, 12, 0);
      const iso = createIsoFromTime('invalid', base);
      expect(new Date(iso).getTime()).toBe(base.getTime());
    });
  });
});
