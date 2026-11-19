# حاسبة الأجور بالمغرب (HTML + CSS + JavaScript)

موقع ثابت بدون أي مكتبات، يعمل مباشرة على Cloudflare Pages.

## هيكل الملفات

```
salaire-maroc/
├── index.html      الصفحة الرئيسية
├── css/style.css   التصميم
├── js/data.js      ← كل الأرقام (الأرقام الاستدلالية، التعويضات، الضريبة) — عدّلها هنا فقط
├── js/calc.js      محرك الحساب
├── js/app.js       الواجهة
├── robots.txt
└── _headers        إعدادات Cloudflare (الكاش والأمان)
```

## 1) التشغيل في VS Code

1. افتح المجلد: `File > Open Folder` ثم اختر `salaire-maroc`.
2. ثبّت الإضافة **Live Server**.
3. اضغط بالزر الأيمن على `index.html` ثم اختر **Open with Live Server**.

## 2) النشر على Cloudflare Pages

### الطريقة أ: بدون GitHub (الأسهل)
1. ادخل إلى https://dash.cloudflare.com ثم **Workers & Pages** ثم **Create** ثم **Pages** ثم **Upload assets**.
2. اختر اسماً للمشروع (مثلاً `salaire-maroc`).
3. اسحب مجلد `salaire-maroc` كاملاً وأفلته، ثم اضغط **Deploy**.
4. سيصبح موقعك متاحاً على `https://salaire-maroc.pages.dev`.

### الطريقة ب: من الطرفية (Terminal) في VS Code
```bash
npx wrangler login
npx wrangler pages deploy . --project-name=salaire-maroc
```

### الطريقة ج: عبر GitHub (نشر تلقائي عند كل تعديل)
1. ارفع المجلد إلى مستودع GitHub.
2. في Cloudflare: **Pages** ثم **Connect to Git** ثم اختر المستودع.
3. Framework preset: **None**، Build command: اتركه فارغاً، Output directory: `/`.

### ربط نطاقك الخاص
**Pages > مشروعك > Custom domains > Set up a domain**، ثم غيّر `YOUR-DOMAIN.com` في `index.html` و`robots.txt`.

## 3) إضافة هيئة جديدة

في `js/data.js` أضف عنصراً إلى `CORPS`:

```js
{
  id: "techniciens",
  sector: "الهيئات المشتركة",
  name: "التقنيون",
  grades: [
    { id: "t3", name: "تقني من الدرجة الثالثة (السلم 9)", scale: "9",
      allowances: [ { name: "تعويض عن الأعباء", ranges: [[1, 10, 1200]] } ] }
  ]
}
```

`ranges: [[من رتبة, إلى رتبة, المبلغ الشهري]]`

## ⚠️ قبل النشر

كل سطر فيه `VERIFY` في `data.js` قيمته تقديرية. قارنه بورقة أداء حقيقية لكل هيئة ودرجة.
