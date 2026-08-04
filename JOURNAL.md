# Journal de bord — marketing-scanner

> Écrit automatiquement par `journal-projet.py`. **Que des faits relevés sur le disque**,
> jamais une supposition. Sert à retrouver le fil d'un projet sans avoir à tout réexpliquer —
> notamment depuis Telegram. Dernière mise à jour : **04/08/2026 à 07:06**.

## Où ça en est

- Branche **main** · dépôt https://github.com/digilo-fr/marketing-scanner.git
- Rien en attente : tout est enregistré
- En ligne : https://marketing-scanner.vercel.app

## Ce qui a été fait récemment

- 04/08 04:06 — backup auto 2026-08-04 04:05:43
- 04/08 03:16 — backup auto session-close 2026-08-04 03:16
- 03/08 19:05 — backup auto 2026-08-03 19:04:37
- 04/07 00:14 — security+seo: correctifs audit (bypass x-user-email, SSRF, Sora, env emails, retry Sheets, meta, 404/error)
- 04/07 00:11 — checkpoint: avant correctifs audit sécurité/SEO
- 30/06 01:54 — Identité Digilo : mode sombre permanent (classe dark + fond #0a0a12)
- 30/06 00:23 — Identité Digilo : accent indigo (ex-violet) + police Sora
- 05/05 19:43 — feat+fix: contexte projet dans agents + fix 401 audit detail

## Fichiers principaux

- `package-lock.json` — 258 Ko
- `src/lib/sheets-db.ts` — 12 Ko
- `src/lib/agents/content.ts` — 12 Ko
- `src/lib/pdf-generator.tsx` — 11 Ko
- `src/app/dashboard/audits/[id]/detail.tsx` — 11 Ko
- `src/lib/scraper.ts` — 10 Ko
- `src/app/api/audit/route.ts` — 9 Ko
- `src/lib/integrations/gmail.ts` — 8 Ko
- `src/lib/synthesizer.ts` — 8 Ko
- `src/app/dashboard/page.tsx` — 7 Ko

## À savoir avant de toucher à ce projet

- Vérifier l'état réel avant d'affirmer quoi que ce soit : ce journal date de sa dernière
  génération, pas de maintenant.
- Ne jamais supprimer avec `rm` — corbeille. Copier un fichier avant de le modifier.
- Rien d'irréversible (envoi, déploiement, push) sans accord explicite de Driss.
