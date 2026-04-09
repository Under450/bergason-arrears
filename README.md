# Bergason Arrears Recovery Platform

Internal SaaS dashboard for Bergason Property Services to track service charge arrears, automate recovery workflows, and generate legal-ready PDF letters.

## Access
`bergasonblockmanagement.co.uk/arrears` — restricted to `cjeavons@bergason.co.uk`

## Stack
- React 18 + Vite
- Firebase (Auth + Firestore) — bergason-block-management project
- jsPDF for letter generation

## Firestore Collections
All arrears collections are prefixed `arrears_` to avoid conflicts with existing Bergason data:
- `arrears_blocks`
- `arrears_leaseholders`
- `arrears_arrears`
- `arrears_cases`
- `arrears_case_events`
- `arrears_payments`

## Setup
```bash
npm install
npm run dev
```

## Deploy
```bash
npm run build
# Copy dist/ contents to bergasonblockmanagement.co.uk/arrears/
```
