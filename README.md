# دليل التشغيل من الهاتف

## 1) رفع الملفات إلى GitHub
أنشئ مستودعاً جديداً، ثم: Add file ← Create new file.
في خانة الاسم اكتب المسار كاملاً (الشرطة المائلة تنشئ المجلد تلقائياً)، والصق المحتوى، ثم Commit:
- server/index.js
- server/package.json
- worker-app/index.html
- worker-app/sw.js
- dashboard/index.html
- render.yaml
- .gitignore

## 2) تشغيله على Render
1. render.com ← الدخول بحساب GitHub.
2. New ← Blueprint ← اختر المستودع (يقرأ render.yaml تلقائياً).
3. سيطلب 3 قيم، اخترها بنفسك (كلمات سرّ طويلة):
   - ADMIN_KEY = مفتاح دخول لوحة المدير
   - SECRET_DEV1 = سرّ هاتف العامل 1
   - SECRET_DEV2 = سرّ هاتف العامل 2
4. Apply، وانتظر حتى يظهر الرابط https.
(إن لم يظهر خيار Blueprint: New ← Web Service، Build: `cd server && npm install`، Start: `cd server && node index.js`، وأضف القيم الثلاث من Environment.)

## 3) الاستخدام
- المدير: الرابط/dashboard  ثم ADMIN_KEY
- العامل 1: الرابط/worker/?device=dev-001&secret=SECRET_DEV1&fast=1
- احذف &fast=1 للتشغيل الحقيقي (صورة كل 5-20 دقيقة).
- شغّل صفحة العامل مرة أونلاين أولاً، وأبقِ الشاشة مفتوحة (نسخة الويب).
