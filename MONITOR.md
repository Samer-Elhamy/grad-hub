# Grad Hub — سجل متابعة (Cursor / Hermes)

## الحالة الحالية

| بند | الحالة |
|-----|--------|
| الموقع v2 (شخصي + ناقد) | ✓ حسب PROGRESS.md |
| توحيد branding ideas/feedback | ✓ 2026-05-24 |
| validate + cron verify/tick | verify **متوقف** (طلب المستخدم) |
| إصلاحات جذرية الوكيل | ✓ AGENT-ROOT-CAUSES.md |

## سجل التدقيق

| وقت | فعل | نتيجة |
|-----|-----|--------|
| 2026-05-24 | إصلاح nav ideas.html + feedback.html | branding موحّد |
| 2026-05-24 | ideas.html ينتظر GradHub.init() قبل العرض | لا race على JSON |
| 2026-05-24 | validate يفحص branding وروابط nav | — |
| 2026-05-24 | grad_hub_tick نفس أمر verify (-NoProfile) | — |

## ماذا تتابع على Telegram

- **صامت:** `[SILENT]` من `grad_hub_verify` = كل شيء OK
- **تنبيه:** فشل validate أو pending في checklist قديم
- **جلسة عالقة:** `/reset` إذا ردود بدون أدوات (`tool_turns=0`)

## أوامر محلية

```powershell
cd C:\Users\Samer\.hermes\projects\grad-hub
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\validate-grad-hub.ps1
hermes cron run grad_hub_verify
hermes gateway status
```
