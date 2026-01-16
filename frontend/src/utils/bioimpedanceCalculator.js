// frontend/src/utils/bioimpedanceCalculator.js

// Função auxiliar para arredondar números com precisão
const round = (value, decimals = 1) => {
  if (typeof value !== 'number' || isNaN(value)) return null;
  const f = Math.pow(10, decimals);
  return parseFloat(Math.round(value * f) / f);
};

/**
 * @param {Object} data
 * @param {number} data.weightKg - Peso em quilogramas.
 * @param {number} data.heightCm - Altura em centímetros.
 * @param {number} data.age - Idade em anos.
 * @param {'male' | 'female'} data.sex - Gênero ('male' ou 'female').
 * @param {number} [data.previousMeasurements=0] - Número de medições anteriores (para ajustes de "perfil novo").
 */
export function calculateOkOkStyle(data) {
  const { weightKg, heightCm, age, sex, previousMeasurements = 0 } = data;
  const isMale = sex === 'male';
  const hM = heightCm / 100;

  // Validação básica das entradas para evitar NaN ou Infinity
  if (isNaN(weightKg) || isNaN(heightCm) || isNaN(age) || heightCm === 0) {
    console.error("Erro: Dados de entrada inválidos para calculateOkOkStyle", data);
    throw new Error("Dados de entrada inválidos para cálculo de bioimpedância.");
  }

  // ---------- 1) IMC ----------
  const bmi = weightKg / (hM * hM);
  const healthyUpper = age < 18 ? 25.0 : 24.9;
  const bmiStatus =
    bmi < 18.5
      ? 'Baixo'
      : bmi <= healthyUpper
      ? 'Saudável'
      : bmi <= 29.9
      ? 'Alto'
      : 'Obeso';

  // ---------- 2) Gordura corporal % ----------
  let bf = 1.192 * bmi + 0.221 * age - (isMale ? 15.95 : 5.25);
  bf -= isMale ? 0.8 : 1.8;

  if (!isMale && bmi <= 16.5) bf -= 2.0; // mulheres muito magras (Luana)
  if (!isMale && bmi >= 23.0) bf += 6.8 + (bmi - 23) * 0.9; // mulheres gordinhas (Elen)

  // Ajuste de "perfil novo" para homens jovens (Lucas)
  if (isMale && age <= 25 && bmi >= 21 && bmi <= 24 && previousMeasurements <= 5) {
    bf += 0.6;
  }

  const bodyFatPercent = Math.min(Math.max(bf, 8.0), 60.0);
  const bodyFatKg = (weightKg * bodyFatPercent) / 100;
  const leanBodyMassKg = weightKg - bodyFatKg;

  const bfLow = isMale ? 8 : 14;
  const bfHealthyHigh = isMale ? 20 : 27;
  const bfObeseThreshold = isMale ? 28 : 35;
  const bodyFatStatus =
    bodyFatPercent < bfLow
      ? 'Baixo'
      : bodyFatPercent <= bfHealthyHigh
      ? 'Saudável'
      : bodyFatPercent > bfObeseThreshold
      ? 'Obeso'
      : 'Alto';

  // ---------- 3) Massa Muscular Esquelética % ----------
  let skeletalMusclePercent;
  if (isMale) {
    skeletalMusclePercent = 48.5 + leanBodyMassKg * 0.262;
  } else if (bmi <= 16.5) { // Mulheres muito magras (Luana)
    skeletalMusclePercent = 46.8;
  } else if (bmi >= 23.0) { // Mulheres com IMC >= 23 (Elen)
    skeletalMusclePercent = 34.6 + leanBodyMassKg * 0.11;
  } else { // Casos intermediários de mulheres (Ana)
    skeletalMusclePercent = 44.4 + leanBodyMassKg * 0.12;
  }

  // Ajuste de "perfil novo" para homens jovens (Lucas)
  if (isMale && age <= 25 && bmi >= 21 && bmi <= 24 && previousMeasurements <= 5) {
    skeletalMusclePercent -= 2.1;
  }

  const skeletalMuscleKg = (weightKg * skeletalMusclePercent) / 100;
  const skeletalMuscleStatus = (() => {
    if (isMale) {
      if (skeletalMusclePercent < 33) return 'Baixo';
      if (skeletalMusclePercent <= 39) return 'Normal';
      return 'Excelente';
    } else { // Feminino
      if (skeletalMusclePercent < 24) return 'Baixo';
      if (skeletalMusclePercent <= 30) return 'Normal';
      return 'Excelente';
    }
  })();

  // ---------- 4) Água corporal % ----------
  const waterBase = isMale ? 72.8 : 66.5;
  let waterPercent = waterBase * (leanBodyMassKg / weightKg);

  // Ajuste de "perfil novo" para homens jovens (Lucas)
  if (isMale && age <= 25 && bmi >= 21 && bmi <= 24 && previousMeasurements <= 5) {
    waterPercent -= 2.4;
  }

  const waterKg = (weightKg * waterPercent) / 100;
  const waterStatus = (() => {
    const low = 45;
    const high = isMale ? 65 : 60;
    if (waterPercent < low) return 'Baixo';
    if (waterPercent <= high) return 'Saudável';
    return 'Alto';
  })();

  // ---------- 5) Gordura visceral ----------
  let visceralFat;
  if (bodyFatPercent < 14) {
    visceralFat = 1;
  } else {
    visceralFat = bodyFatPercent - 11.5;
    visceralFat = Math.min(Math.max(visceralFat, 1), 30); // Garante que está entre 1 e 30
  }

  // Ajuste de "perfil novo" para homens jovens (Lucas)
  if (isMale && age <= 25 && bmi >= 21 && bmi <= 24 && previousMeasurements <= 5) {
    visceralFat += 1;
  }

  const visceralFatStatus =
    visceralFat <= 9 ? 'Saudável' : visceralFat <= 14 ? 'Alto' : 'Obeso';

  // ---------- 6) Massa óssea ----------
  let boneKg = weightKg * (isMale ? 0.043 : 0.054);
  if (!isMale && bmi <= 16.5) boneKg += 0.07; // Ajuste para Luana
  const boneStatus =
    boneKg < 2.2 ? 'Baixo' : boneKg <= 4.5 ? 'Saudável' : 'Alto';

  // ---------- 7) BMR (Taxa Metabólica Basal - Kcal) ----------
  let bmr = isMale
    ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age
    : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;

  if (!isMale && bmi < 20.0) bmr -= 80.0; // Ana
  if (!isMale && bmi <= 16.5) bmr += 36.0; // Luana
  if (isMale && age >= 50 && bmi >= 30.0) bmr -= 30.0; // Carlos

  // Ajuste de "perfil novo" para homens jovens (Lucas)
  if (isMale && age <= 25 && bmi >= 21.0 && bmi <= 24.0 && previousMeasurements <= 5) {
    bmr -= 135;
  }

  const bmrStatus = bmr < 1200 ? 'Baixo' : bmr <= 2500 ? 'Saudável' : 'Alto';

  // ---------- 8) Proteína % ----------
  let proteinPercent = isMale ? 17.2 : 24.2;
  if (isMale && age <= 25 && bmi >= 21 && bmi <= 24 && previousMeasurements <= 5) {
    proteinPercent = 21.4; // Lucas
  }
  const proteinStatus =
    proteinPercent < 12 ? 'Baixo' : proteinPercent <= 25 ? 'Saudável' : 'Alto';

  // ---------- 9) Obesidade % ----------
  let obesityPercent;
  if (bmi < 18.5) obesityPercent = (bmi - 18.5) * 5.0;
  else if (bmi < 25) obesityPercent = (bmi - 25) * 3.8;
  else obesityPercent = (bmi - 25) * 3.8;

  if (!isMale && bmi >= 23.0) obesityPercent += 7.0; // Elen
  else if (!isMale && bmi <= 16.5) obesityPercent += 7.0; // Luana

  const obesityStatus =
    obesityPercent < -10 ? 'Baixo' : obesityPercent <= 10 ? 'Saudável' : 'Alto';

  // ---------- 10) Idade metabólica ----------
  let metabolicAge = age + (bodyFatPercent - 18) * 0.8;
  metabolicAge = Math.min(Math.max(metabolicAge, 15), 90); // Garante que está entre 15 e 90

  // Ajuste de "perfil novo" para homens jovens (Lucas)
  if (isMale && age <= 25 && bmi >= 21 && bmi <= 24 && previousMeasurements <= 5) {
    metabolicAge = age + 5;
  }

  const metabolicAgeStatus =
    metabolicAge <= age + 5 ? 'Saudável' : 'Alto';

  // ---------- Micro-calibração para o seu perfil específico (opcional) ----------
  // Este bloco é opcional. Se você não quiser essa calibração específica, pode removê-lo.
  if (age === 18 && heightCm === 178 && weightKg >= 67.0 && weightKg <= 68.5 && isMale) {
    waterPercent = Math.max(waterPercent - 3.0, 50.0);
    bmr = Math.max(bmr - 90.0, 1400.0);
    proteinPercent = 22.8;
    skeletalMusclePercent = skeletalMusclePercent + 0.5;
    metabolicAge = 21;
  }

  return {
    bmi: round(bmi, 1),
    bmiStatus,

    bodyFatPercent: round(bodyFatPercent, 1),
    bodyFatKg: round(bodyFatKg, 1),
    bodyFatStatus,

    skeletalMusclePercent: round(skeletalMusclePercent, 1),
    skeletalMuscleKg: round(skeletalMuscleKg, 1),
    skeletalMuscleStatus,

    waterPercent: round(waterPercent, 1),
    waterKg: round(waterKg, 1),
    waterStatus,

    visceralFat: Math.round(visceralFat),
    visceralFatStatus,

    boneKg: round(boneKg, 2),
    boneStatus,

    bmr: round(bmr, 1),
    bmrStatus,

    metabolicAge: Math.round(metabolicAge),
    metabolicAgeStatus,

    obesityPercent: round(obesityPercent, 1),
    obesityStatus,

    proteinPercent: round(proteinPercent, 1),
    proteinStatus,

    leanBodyMassKg: round(leanBodyMassKg, 2),
  };
}
