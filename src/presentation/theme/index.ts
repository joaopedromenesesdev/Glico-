export const THEME = {
  colors: {
    // Cores de fundo e superfícies
    background: '#F8FAFC',       // Fundo claro e limpo
    surface: '#FFFFFF',          // Superfície de cartões
    surfaceElevated: '#FFFFFF',
    border: '#E2E8F0',           // Bordas suaves
    borderLight: '#F1F5F9',
    
    // Tipografia de alto contraste (WCAG AAA)
    textPrimary: '#0F172A',      // Quase preto para máxima legibilidade
    textSecondary: '#475569',    // Cinza escuro para instruções
    textMuted: '#64748B',        // Cinza neutro para detalhes secundários
    
    // Cores de marca acolhedoras (Sem tons agressivos)
    primary: '#0D9488',          // Verde-azulado medicinal acolhedor (Teal 600)
    primaryDark: '#0F766E',      // Teal 700
    primaryLight: '#CCFBF1',     // Fundo suave de destaque
    
    // Cores de status clínico (Acolhedoras, sem induzir pânico)
    hypo: '#F59E0B',             // Âmbar suave para hipoglicemia (< 70)
    hypoBg: '#FEF3C7',
    hypoText: '#92400E',
    
    target: '#10B981',           // Verde esmeralda para meta (70-139)
    targetBg: '#D1FAE5',
    targetText: '#065F46',
    
    elevated: '#6366F1',         // Azul arroxeado sereno para 140-179
    elevatedBg: '#EEF2FF',
    elevatedText: '#3730A3',
    
    high: '#EF4444',             // Vermelho suave/coral para >= 180
    highBg: '#FEE2E2',
    highText: '#991B1B',
    
    danger: '#DC2626',
    dangerBg: '#FEE2E2',
  },
  
  // Acessibilidade sênior: alvos grandes e toques confortáveis
  sizing: {
    minTouchTarget: 48,          // WCAG 2.1 AA
    primaryButtonHeight: 64,     // Botão principal gigante para fácil toque
    keypadButtonHeight: 68,      // Teclas numéricas grandes
    borderRadiusCard: 18,
    borderRadiusButton: 16,
    borderRadiusPill: 999,
  },
  
  // Espaçamentos confortáveis
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  
  // Tipografia ampliada para idosos
  typography: {
    heroNumber: 44,              // Valor principal de glicemia
    title1: 26,                  // Títulos de seção
    title2: 20,                  // Subtítulos
    bodyLarge: 18,               // Textos principais
    body: 16,                    // Textos comuns
    caption: 14,                 // Rótulos secundários
  },
};
