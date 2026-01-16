//domain/interpretation/index.js

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function roundTo(n, decimals = 1) {
  if (n == null || !Number.isFinite(n)) return null;
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

function normalizeSex(sex) {
  const s = String(sex || '').trim().toLowerCase();
  if (!s) return null;

  if (['f', 'fem', 'feminino', 'female', 'mulher', 'woman'].includes(s)) return 'f';
  if (['m', 'masc', 'masculino', 'male', 'homem', 'man'].includes(s)) return 'm';

  if (s.startsWith('fem')) return 'f';
  if (s.startsWith('masc')) return 'm';

  return null;
}

function parseDateSafe(v) {
  if (!v) return null;

  if (typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtPt(n, decimals = 1) {
  if (n == null || !Number.isFinite(n)) return '--';
  return Number(n).toFixed(decimals).replace('.', ',');
}

/**
 * Padrão de retorno (pra você padronizar UI):
 * {
 *  level, label, color,
 *  note,                    // resumo (1 linha)
 *  title, detailText, tip,  // ✅ detalhado (colapsável)
 *  ranges: { title, items:[{key,label,range,note,colorKey}] }, // ✅ tabela/faixas (opcional)
 *  disclaimer               // opcional
 * }
 */

/* ===========================
   IMC (OMS)
=========================== */
export function interpretIMC(imc) {
  if (imc == null) return null;

  const v = Number(imc);
  if (!Number.isFinite(v)) return null;

  const ranges = {
    title: 'Faixas de referência (OMS)',
    items: [
      {
        key: 'under',
        label: 'Abaixo do Peso',
        range: 'Menor que 18,5',
        note: 'Pode indicar necessidade de suporte nutricional.',
        colorKey: 'blue',
      },
      {
        key: 'normal',
        label: 'Peso Normal',
        range: '18,5 – 24,9',
        note: 'Faixa de menor risco para a saúde. Objetivo ideal.',
        colorKey: 'green',
      },
      {
        key: 'over',
        label: 'Sobrepeso',
        range: '25,0 – 29,9',
        note: 'Alerta para aumento de riscos cardiometabólicos.',
        colorKey: 'orange',
      },
      {
        key: 'obese',
        label: 'Obesidade',
        range: '30,0 ou mais',
        note: 'Requer acompanhamento profissional e mudanças de hábito.',
        colorKey: 'red',
      },
    ],
  };

  if (v < 18.5) {
    return {
      level: 'low',
      label: 'Abaixo do peso',
      color: '#F39C12',
      note: 'Pode indicar baixo peso para adultos.',
      title: 'Abaixo do peso',
      detailText: `Seu IMC de ${fmtPt(v, 1)} está abaixo da faixa considerada ideal para a maioria dos adultos. Isso pode estar associado a menor reserva energética e, em alguns casos, baixa massa muscular.`,
      tip: 'Dica: se você está tentando ganhar peso ou massa, priorize proteínas, boas calorias e consistência nos treinos.',
      ranges,
    };
  }

  if (v < 25) {
    return {
      level: 'ok',
      label: 'Normal',
      color: '#27AE60',
      note: 'Faixa considerada normal para adultos (OMS).',
      title: 'Peso normal',
      detailText: `Seu IMC de ${fmtPt(v, 1)} está dentro da faixa ideal para a maioria dos adultos. Isso sugere bom equilíbrio entre peso e altura e, em geral, menor risco cardiometabólico.`,
      tip: 'Dica: mantenha uma rotina ativa e alimentação equilibrada para preservar seus resultados.',
      ranges,
    };
  }

  if (v < 30) {
    return {
      level: 'high',
      label: 'Sobrepeso',
      color: '#E67E22',
      note: 'Pode indicar excesso de peso para adultos.',
      title: 'Sobrepeso',
      detailText: `Seu IMC de ${fmtPt(v, 1)} está acima da faixa considerada ideal para a maioria dos adultos. Isso pode aumentar o risco cardiometabólico, especialmente se houver acúmulo de gordura abdominal.`,
      tip: 'Dica: foque em déficit calórico leve, treino de força e sono regular — consistência vale mais que intensidade.',
      ranges,
    };
  }

  return {
    level: 'very_high',
    label: 'Obesidade',
    color: '#E74C3C',
    note: 'Indica risco aumentado; avalie com profissional.',
    title: 'Obesidade',
    detailText: `Seu IMC de ${fmtPt(v, 1)} está na faixa de obesidade. Em geral, isso está associado a maior risco cardiometabólico. Uma avaliação profissional ajuda a definir metas e estratégias seguras.`,
    tip: 'Dica: comece por hábitos sustentáveis (passos diários, proteína adequada e rotina de sono).',
    ranges,
  };
}

/* ===========================
   Gordura Visceral
   (valores típicos; pode variar por balança)
=========================== */
export function interpretVisceralFat(vf) {
  if (vf == null) return null;

  const v = Number(vf);
  if (!Number.isFinite(v)) return null;

  const disclaimer =
    'Observação: as faixas podem variar conforme o modelo da balança e algoritmo do fabricante.';

  if (v <= 9) {
    return {
      level: 'ok',
      label: 'Normal',
      color: '#27AE60',
      note: 'Nível considerado aceitável.',
      title: 'Gordura visceral em nível normal',
      detailText: `Sua gordura visceral está em ${fmtPt(v, 0)}. Em geral, níveis mais baixos se associam a menor risco cardiometabólico.`,
      tip: 'Dica: mantenha treino de força + cardio leve e uma alimentação com fibras (verduras, frutas, grãos).',
      disclaimer,
    };
  }

  if (v <= 14) {
    return {
      level: 'high',
      label: 'Alto',
      color: '#E67E22',
      note: 'Atenção: pode aumentar risco cardiometabólico.',
      title: 'Gordura visceral elevada',
      detailText: `Sua gordura visceral está em ${fmtPt(v, 0)}. Em muitos casos, valores elevados se associam a maior risco cardiometabólico e podem responder bem a ajustes de alimentação, sono e atividade física.`,
      tip: 'Dica: reduza ultraprocessados e álcool, e priorize sono — isso impacta muito gordura visceral.',
      disclaimer,
    };
  }

  return {
    level: 'very_high',
    label: 'Muito alto',
    color: '#E74C3C',
    note: 'Recomendável acompanhamento profissional.',
    title: 'Gordura visceral muito alta',
    detailText: `Sua gordura visceral está em ${fmtPt(v, 0)}. Esse nível costuma indicar atenção redobrada e acompanhamento profissional para reduzir riscos e montar um plano seguro.`,
    tip: 'Dica: uma estratégia guiada (nutri + treino + rotina) tende a ser mais eficaz do que mudanças soltas.',
    disclaimer,
  };
}

/* ===========================
   % Gordura corporal (por sexo/idade)
   (tabelas variam por fabricante)
=========================== */
export function interpretBodyFatPercent(pct, sex, age) {
  if (pct == null) return null;

  const v = Number(pct);
  if (!Number.isFinite(v)) return null;

  const sx = normalizeSex(sex);
  const a = Number(age);

  const disclaimer =
    'Observação: as faixas podem variar conforme o modelo da balança, sexo e idade.';

  if (!sx || !Number.isFinite(a)) {
    return {
      level: 'info',
      label: 'Interpretação',
      color: '#357ABD',
      note: 'Para classificar com precisão, informe sexo e idade no perfil.',
      title: 'Precisa de mais dados',
      detailText:
        'Para uma interpretação mais precisa do percentual de gordura, é importante informar sexo e idade no perfil. Isso permite comparar com faixas mais adequadas ao seu contexto.',
      tip: 'Dica: atualize sexo e idade no Perfil para liberar uma leitura mais completa.',
      disclaimer,
    };
  }

  const isFemale = sx === 'f';
  const bucket = a < 40 ? '20-39' : a < 60 ? '40-59' : '60-79';

  const thresholdsFemale = {
    '20-39': { lowMax: 20.9, normalMax: 32.9, highMax: 38.9 },
    '40-59': { lowMax: 22.9, normalMax: 33.9, highMax: 39.9 },
    '60-79': { lowMax: 23.9, normalMax: 34.9, highMax: 40.9 },
  };

  const thresholdsMale = {
    '20-39': { lowMax: 7.9, normalMax: 19.9, highMax: 24.9 },
    '40-59': { lowMax: 10.9, normalMax: 21.9, highMax: 27.9 },
    '60-79': { lowMax: 12.9, normalMax: 24.9, highMax: 29.9 },
  };

  const t = (isFemale ? thresholdsFemale : thresholdsMale)[bucket];

  const ctxLabel = `(${isFemale ? 'Feminino' : 'Masculino'}, ${bucket})`;

  if (v <= t.lowMax) {
    return {
      level: 'low',
      label: 'Baixo',
      color: '#F39C12',
      note: `Percentual baixo para sexo/idade ${ctxLabel}.`,
      title: `Gordura corporal baixa ${ctxLabel}`,
      detailText: `Seu percentual de gordura está em ${fmtPt(v, 1)}%. Para o seu contexto ${ctxLabel}, isso pode indicar um nível baixo. Dependendo do objetivo (hipertrofia, performance, saúde), pode ser interessante avaliar composição corporal como massa magra e dieta.`,
      tip: 'Dica: priorize proteínas e treino de força para sustentar massa magra.',
      disclaimer,
    };
  }

  if (v <= t.normalMax) {
    return {
      level: 'ok',
      label: 'Normal',
      color: '#27AE60',
      note: `Faixa esperada para sexo/idade ${ctxLabel}.`,
      title: `Gordura corporal adequada ${ctxLabel}`,
      detailText: `Seu percentual de gordura está em ${fmtPt(v, 1)}%. Para o seu contexto ${ctxLabel}, isso costuma ser uma faixa considerada adequada. O mais importante agora é acompanhar tendência (subindo/descendo) e consistência.`,
      tip: 'Dica: repita medições no mesmo horário e mantenha hidratação semelhante para comparar melhor.',
      disclaimer,
    };
  }

  if (v <= t.highMax) {
    return {
      level: 'high',
      label: 'Alto',
      color: '#E67E22',
      note: `Acima do ideal; pode impactar saúde/metas ${ctxLabel}.`,
      title: `Gordura corporal elevada ${ctxLabel}`,
      detailText: `Seu percentual de gordura está em ${fmtPt(v, 1)}%. Para o seu contexto ${ctxLabel}, isso fica acima do ideal e pode influenciar estética, performance e saúde. Estratégias graduais costumam funcionar melhor do que medidas extremas.`,
      tip: 'Dica: comece por déficit calórico leve + treino de força + passos diários.',
      disclaimer,
    };
  }

  return {
    level: 'very_high',
    label: 'Muito alto',
    color: '#E74C3C',
    note: `Muito acima do ideal; avalie com profissional ${ctxLabel}.`,
    title: `Gordura corporal muito alta ${ctxLabel}`,
    detailText: `Seu percentual de gordura está em ${fmtPt(v, 1)}%. Para o seu contexto ${ctxLabel}, isso é considerado muito elevado. Uma avaliação profissional pode ajudar a montar um plano seguro e sustentável.`,
    tip: 'Dica: consistência semanal (sono + dieta + treino) costuma ser o divisor de águas.',
    disclaimer,
  };
}

/* ===========================
   Confiabilidade da medição
=========================== */
export function measurementQuality(timestampISO, prevTimestampISO) {
  const t = parseDateSafe(timestampISO);
  if (!t) {
    return {
      level: 'info',
      label: 'Sem horário',
      color: '#357ABD',
      note: 'Sem data/hora para avaliar confiabilidade.',
      title: 'Sem horário detectado',
      detailText:
        'Não foi possível identificar data/hora dessa medição. Sem esse dado, fica mais difícil avaliar consistência e comparar evolução.',
      tip: 'Dica: garanta que a balança/app está salvando data e hora corretamente.',
    };
  }

  const hour = t.getHours();
  const minutes = t.getMinutes();
  const hm = hour * 60 + minutes;

  const ok =
    (hm >= 300 && hm <= 600) || // 05:00–10:00
    (hm >= 780 && hm <= 990) || // 13:00–16:30
    (hm >= 1140 && hm <= 1350); // 19:00–22:30

  const late = hm >= 1351 || hm < 300;

  let tooClose = false;
  const p = parseDateSafe(prevTimestampISO);
  if (p) {
    const diffMin = Math.abs((t.getTime() - p.getTime()) / 60000);
    if (diffMin < 120) tooClose = true;
  }

  if (tooClose) {
    return {
      level: 'warn',
      label: 'Pode variar',
      color: '#E67E22',
      note: 'Medições com menos de 2h podem oscilar por hidratação/alimentação.',
      title: 'Medições muito próximas',
      detailText:
        'Quando você mede com intervalos muito curtos, pequenas variações de hidratação, refeição e treino podem alterar o resultado. Para acompanhar evolução, o ideal é comparar medições em condições parecidas.',
      tip: 'Dica: aguarde pelo menos 2 horas e prefira horários consistentes (ex.: manhã em jejum).',
    };
  }

  if (ok) {
    return {
      level: 'ok',
      label: 'Confiável',
      color: '#27AE60',
      note: 'Horário consistente ajuda comparações mais precisas.',
      title: 'Boa consistência',
      detailText:
        'Sua medição foi feita em um horário que costuma gerar comparações mais estáveis. Quando você mantém condições semelhantes (horário, hidratação, alimentação), a tendência do gráfico fica mais confiável.',
      tip: 'Dica: repita no mesmo período do dia para comparar evolução com mais precisão.',
    };
  }

  if (late) {
    return {
      level: 'warn',
      label: 'Pode variar',
      color: '#E67E22',
      note: 'À noite/madrugada a hidratação tende a variar mais.',
      title: 'Horário com maior variação',
      detailText:
        'À noite e na madrugada, variações de hidratação e retenção podem ser maiores. O resultado pode ser útil, mas a comparação com outras medições fica menos “justa” se os horários mudam.',
      tip: 'Dica: se possível, faça medições pela manhã ou sempre no mesmo horário.',
    };
  }

  return {
    level: 'info',
    label: 'Ok',
    color: '#357ABD',
    note: 'Para comparar evolução, pese-se em horários semelhantes.',
    title: 'Comparação pode melhorar',
    detailText:
      'Sua medição está ok, mas a comparação fica mais precisa quando você mantém horário e rotina semelhantes (ex.: antes do café, após ir ao banheiro).',
    tip: 'Dica: escolha um horário padrão e siga por pelo menos 2 semanas para ver tendências claras.',
  };
}
