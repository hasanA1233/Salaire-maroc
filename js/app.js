/* app.js — الواجهة */
(function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const corpsSel = $("corps"), gradeSel = $("grade"), echSel = $("echelon"), zoneSel = $("zone");

  // تعبئة الهيئات مجمعة حسب القطاع
  const sectors = [...new Set(CORPS.map((c) => c.sector))];
  corpsSel.innerHTML = sectors.map((s) =>
    `<optgroup label="${s}">` +
    CORPS.filter((c) => c.sector === s).map((c) => `<option value="${c.id}">${c.name}</option>`).join("") +
    `</optgroup>`).join("");

  zoneSel.innerHTML = CONFIG.residenceZones
    .map((z) => `<option value="${z.id}" ${z.id === "C" ? "selected" : ""}>${z.label}</option>`).join("");

  function fillGrades() {
    const c = CORPS.find((x) => x.id === corpsSel.value);
    gradeSel.innerHTML = c.grades.map((g) => `<option value="${g.id}">${g.name}</option>`).join("");
    fillEchelons();
  }

  function fillEchelons() {
    const c = CORPS.find((x) => x.id === corpsSel.value);
    const g = c.grades.find((x) => x.id === gradeSel.value);
    const list = CONFIG.indices[g.scale] || [];
    echSel.innerHTML = list.map((idx, i) => `<option value="${i + 1}">الرتبة ${i + 1}</option>`).join("");
    showIndex();
  }

  function showIndex() {
    const c = CORPS.find((x) => x.id === corpsSel.value);
    const g = c.grades.find((x) => x.id === gradeSel.value);
    const idx = getIndex(g.scale, +echSel.value);
    $("indexHint").textContent = idx ? `الرقم الاستدلالي: ${idx}` : "";
  }

  corpsSel.addEventListener("change", fillGrades);
  gradeSel.addEventListener("change", fillEchelons);
  echSel.addEventListener("change", showIndex);

  document.querySelectorAll('input[name="married"]').forEach((r) =>
    r.addEventListener("change", () => { $("spouseWrap").hidden = r.value !== "1" || !r.checked; }));

  // قراءة الإعدادات من الرابط (للمشاركة)
  const qs = new URLSearchParams(location.search);
  if (qs.get("c") && CORPS.some((c) => c.id === qs.get("c"))) corpsSel.value = qs.get("c");
  fillGrades();
  if (qs.get("g")) { gradeSel.value = qs.get("g"); fillEchelons(); }
  if (qs.get("e")) { echSel.value = qs.get("e"); showIndex(); }
  if (qs.get("z")) zoneSel.value = qs.get("z");
  if (qs.get("m") === "1") { document.querySelector('input[name="married"][value="1"]').checked = true; $("spouseWrap").hidden = false; }
  if (qs.get("k")) $("children").value = qs.get("k");
  if (qs.get("mu") === "0") $("mutualiste").checked = false;

  function readParams() {
    return {
      corpsId: corpsSel.value,
      gradeId: gradeSel.value,
      echelon: +echSel.value,
      zone: zoneSel.value,
      married: document.querySelector('input[name="married"]:checked').value === "1",
      spouseDependant: $("spouseDependant").checked,
      children: Math.max(0, Math.min(10, parseInt($("children").value, 10) || 0)),
      mutualiste: $("mutualiste").checked
    };
  }

  function row(label, val, cls = "") {
    return `<tr class="${cls}"><td>${label}</td><td>${fmt(val)}</td></tr>`;
  }

  function render(r, p) {
    const share = new URLSearchParams({
      c: p.corpsId, g: p.gradeId, e: p.echelon, z: p.zone,
      m: p.married ? 1 : 0, k: p.children, mu: p.mutualiste ? 1 : 0
    });
    history.replaceState(null, "", "?" + share.toString() + "#calc");

    $("result").innerHTML = `
      <div class="net">
        <span>الأجرة الصافية الشهرية</span>
        <strong>${fmt(r.net)} <small>درهم</small></strong>
      </div>
      <p class="meta">${r.corps} · ${r.grade} · الرتبة ${r.echelon} · الرقم الاستدلالي ${r.index}</p>

      <table class="slip">
        <thead><tr><th>العناصر</th><th>المبلغ (درهم)</th></tr></thead>
        <tbody>
          <tr class="sec"><td colspan="2">المستحقات</td></tr>
          ${row("الأجر الأساسي", r.base)}
          ${row("تعويض الإقامة", r.residence)}
          ${r.allowances.map((a) => row(a.name, a.amount)).join("")}
          ${r.family ? row("التعويضات العائلية", r.family) : ""}
          ${row("مجموع الأجر الإجمالي", r.grossTotal, "total")}
          <tr class="sec"><td colspan="2">الاقتطاعات</td></tr>
          ${row("الصندوق المغربي للتقاعد (14%)", -r.cmr, "neg")}
          ${row("التأمين الإجباري عن المرض AMO", -r.amo, "neg")}
          ${r.mutuelle ? row("التعاضدية", -r.mutuelle, "neg") : ""}
          ${row("الضريبة على الدخل IR", -r.ir, "neg")}
          ${row("مجموع الاقتطاعات", -r.deductionsTotal, "total neg")}
          ${row("الصافي المؤدى", r.net, "grand")}
        </tbody>
      </table>
      <p class="hint">الدخل الصافي الخاضع للضريبة (شهرياً): ${fmt(r.netTaxableMonthly)} درهم</p>
      <div class="actions">
        <button class="btn btn--ghost" onclick="window.print()">🖨️ طباعة ورقة الأداء</button>
        <button class="btn btn--ghost" id="copyLink">🔗 نسخ رابط النتيجة</button>
      </div>`;

    $("copyLink").onclick = () => {
      navigator.clipboard?.writeText(location.href);
      $("copyLink").textContent = "✔ تم النسخ";
    };
  }

  $("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = readParams();
    try {
      render(computeSalary(p), p);
      if (window.innerWidth < 860) $("result").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      $("result").innerHTML = `<div class="empty err">${err.message}</div>`;
    }
  });

  if (qs.get("c")) $("form").requestSubmit();
  $("year").textContent = new Date().getFullYear();
})();
