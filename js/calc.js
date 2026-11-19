/* calc.js — محرك الحساب (بدون واجهة) */

const round2 = (n) => Math.round(n * 100) / 100;

function getIndex(scale, echelon) {
  const list = CONFIG.indices[scale] || [];
  return list[echelon - 1] ?? null;
}

function monthlyBase(index) {
  const b = CONFIG.baseSalary;
  return ((index - b.indexOffset) * b.pointValue + b.constant) / 12;
}

function allowanceAmount(allowance, echelon) {
  for (const [from, to, amount] of allowance.ranges) {
    if (echelon >= from && echelon <= to) return amount;
  }
  return 0;
}

function familyAllowance(children) {
  const f = CONFIG.family;
  const n = Math.min(children, f.maxChildren);
  return Math.min(n, 3) * f.first3 + Math.max(0, n - 3) * f.from4to6;
}

function annualIR(netTaxableAnnual, dependants) {
  let ir = 0;
  for (const [limit, rate, deduct] of CONFIG.ir.brackets) {
    if (netTaxableAnnual <= limit) {
      ir = netTaxableAnnual * rate - deduct;
      break;
    }
  }
  const famDeduct = Math.min(dependants, CONFIG.ir.maxDependants) * CONFIG.ir.perDependant;
  return Math.max(0, ir - famDeduct);
}

/**
 * @param {object} p { corpsId, gradeId, echelon, zone, married, spouseDependant, children, mutualiste }
 */
function computeSalary(p) {
  const corps = CORPS.find((c) => c.id === p.corpsId);
  const grade = corps?.grades.find((g) => g.id === p.gradeId);
  if (!grade) throw new Error("الهيئة أو الدرجة غير موجودة");

  const index = getIndex(grade.scale, p.echelon);
  if (!index) throw new Error("الرتبة غير موجودة في هذا السلم");

  const base = monthlyBase(index);
  const zone = CONFIG.residenceZones.find((z) => z.id === p.zone);
  const residence = base * (zone ? zone.rate : 0.10);

  const allowances = grade.allowances
    .map((a) => ({ name: a.name, amount: allowanceAmount(a, p.echelon) }))
    .filter((a) => a.amount > 0);
  const allowancesTotal = allowances.reduce((s, a) => s + a.amount, 0);

  const family = familyAllowance(p.children);

  // الأجر الخاضع (بدون التعويضات العائلية)
  const grossTaxable = base + residence + allowancesTotal;
  const grossTotal = grossTaxable + family;

  // الاقتطاعات الاجتماعية
  const cmr = grossTaxable * CONFIG.cmr.rate;
  const amo = Math.min(CONFIG.amo.max, Math.max(CONFIG.amo.min, grossTaxable * CONFIG.amo.rate));
  const mutuelle = p.mutualiste ? Math.min(CONFIG.mutuelle.max, grossTaxable * CONFIG.mutuelle.rate) : 0;

  // الضريبة على الدخل (سنوي ثم شهري)
  const grossAnnual = grossTaxable * 12;
  const fp = CONFIG.ir.fraisPro;
  const fraisPro = grossAnnual <= fp.threshold
    ? grossAnnual * fp.lowRate
    : Math.min(grossAnnual * fp.highRate, fp.cap);
  const netTaxableAnnual = Math.max(0, grossAnnual - fraisPro - (cmr + amo + mutuelle) * 12);

  const dependants = (p.married && p.spouseDependant ? 1 : 0) + p.children;
  const ir = annualIR(netTaxableAnnual, dependants) / 12;

  const deductionsTotal = cmr + amo + mutuelle + ir;
  const net = grossTotal - deductionsTotal;

  return {
    corps: corps.name, grade: grade.name, scale: grade.scale, echelon: p.echelon, index,
    zone: zone?.label,
    base: round2(base), residence: round2(residence),
    allowances: allowances.map((a) => ({ ...a, amount: round2(a.amount) })),
    family: round2(family),
    grossTotal: round2(grossTotal),
    cmr: round2(cmr), amo: round2(amo), mutuelle: round2(mutuelle), ir: round2(ir),
    netTaxableMonthly: round2(netTaxableAnnual / 12),
    deductionsTotal: round2(deductionsTotal),
    net: round2(net)
  };
}
