# Marketing Scanner

Audit marketing complet par IA en 60 secondes — outil interne **Digilo**.

🌐 https://audit.digilo.fr (à venir)
📊 [Google Sheets DB](https://docs.google.com/spreadsheets/d/1FSw6ISZJfu1pt9luHAF37ga5AeV8amMAY0mZ3KovCzE/edit)

## Stack

- **Next.js 15** + React 19 + Tailwind 4
- **Auth** : NextAuth.js + Google OAuth (whitelist 2 emails owner)
- **DB** : Google Sheets API (4 onglets : projects / audits / recommendations / users)
- **LLM** : Groq + Cerebras + SambaNova (3 tiers Quick / Full / Premium, 100% gratuit)
- **PDF** : @react-pdf/renderer
- **Notifs** : Email Gmail + WhatsApp via n8n.digilo.fr + Notion DB
- **Hosting** : Vercel

## Tiers d'audit

| Tier | LLMs | Durée | Cas d'usage |
|---|---|---|---|
| Quick | Groq llama-3.3-70b (1 agent) | 60 sec | Screening prospect lambda |
| Full | Cerebras + Groq + SambaNova (5 agents //) | 5-10 min | Prospect qualifié |
| Premium | 5 agents × 2 LLMs (consensus voting) | 15 min | Gros prospect, qualité max |

## Installation locale

```bash
npm install
cp ~/.claude/secrets/marketing-scanner.env .env.local
npm run dev
```

## Déploiement

```bash
vercel deploy --prod
# DNS OVH : CNAME audit.digilo.fr → cname.vercel-dns.com
```

## Architecture

```
[User] → audit.digilo.fr (Next.js)
   ↓ NextAuth Google login (whitelist)
   ↓ choix Projet → choix Tier → URL cible
   ↓
/api/audit → scrape (cheerio) → llm-router → 5 sous-agents parallèles
   ↓ synthèse + scoring + génération MD/PDF
   ↓
Google Sheets (storage) + notifs parallèles :
   ├─ Email (Gmail API didigum@)
   ├─ WhatsApp (webhook n8n.digilo.fr)
   └─ Notion DB ("Marketing Scanner Audits")
```

## Roadmap

- [x] Phase 0 — Scaffold + secrets + Sheets DB
- [ ] Phase 1a — Backend (LLM router + scraper + 5 agents + API routes)
- [ ] Phase 1b — Frontend (auth + dashboard + résultats)
- [ ] Phase 1c — DB helpers (CRUD Sheets typés)
- [ ] Phase 1d — Intégrations (n8n + Notion + Gmail + PDF)
- [ ] Phase 2 — Tests E2E + déploiement Vercel + DNS OVH + skill CLI

## License

MIT — © 2026 Digilo
