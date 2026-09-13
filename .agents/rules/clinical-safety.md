---
description: Diretrizes de Segurança Clínica e Validação Algorítmica para o App de Glicemia
globs: ["**/*"]
always_on: true
---

# Diretrizes de Segurança Clínica (Clinical Safety Rules)

1. **Proibição Estrita de Doses Arbitrárias (No Hardcoded Insulin Doses):**
   - NUNCA assuma ou fixe no código uma dose de insulina ultrarrápida.
   - O aplicativo NUNCA deve calcular ou sugerir doses se não houver uma configuração médica ativa e confirmada no perfil da paciente.
   - Qualquer cálculo deve ser 100% determinístico e auditável.

2. **Trava Máxima de Dose (Dose Capping):**
   - Toda sugestão de dose gerada pelo motor DEVE ser limitada pela `maxDoseCap` configurada pelo médico.
   - Se o cálculo exceder a trava de segurança, a dose exibida deve ser truncada para a trava máxima e um alerta crítico deve ser emitido.

3. **Validação de Limites Biológicos de Entrada:**
   - Valores de glicemia $< 20\text{ mg/dL}$ ou $> 700\text{ mg/dL}$ devem exigir confirmação explícita de digitação.
   - Valores negativos, strings alfanuméricas e vazios devem ser terminantemente bloqueados.

4. **Transparência de HbA1c:**
   - A estimativa de HbA1c deve sempre ser rotulada como "Estimativa Matemática Estatística (ADAG/Nathan et al.)".
   - Deve conter o disclaimer informando que não substitui o exame laboratorial de sangue venoso por HPLC.
