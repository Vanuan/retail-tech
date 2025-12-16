# Virtual Shelf Testing Platform

A prototype of VST's core testing engine, demonstrating N-way experimentation,
behavioral tracking, and statistical insight generation.

## What This Is

This is a **focused prototype** of VST's Virtual Shelf Testing product. It's not
a full product (no layout builder, no Planogram Publisher), but it demonstrates
the core technical challenge: running rigorous experiments and deriving insights
researchers can act on.

## Architecture

### Frontend
- React + TypeScript
- Recharts for visualizations
- Tailwind CSS for styling

### Backend
- Node.js + Express + TypeScript
- PostgreSQL for storage
- Prisma ORM for queries

### Key Design Decisions

1. **N-way testing (not just A/B):** The system supports 3-5 variants, not just A/B.
   This matters because real optimization questions need multiple options.

2. **Adaptive dashboard:** Different research questions show different metrics.
   A position question shows different charts than a facing-count question.

3. **Statistical rigor:** Uses chi-square tests to determine if differences are
   meaningful (p-value < 0.05), not just comparing percentages.

4. **Separation of concerns (conceptual):** In the prototype, all data is in one
   database. In production, VST would separate operational (Postgres) from
   analytical (Snowflake) workloads for performance.

## How to Run
```bash
# Frontend
npm run dev

# Backend
npm run server

# Database
createdb vst_testing
npx prisma migrate dev
```

## Key Files

- `/src/pages/tests/new.tsx` - Test setup form
- `/src/pages/tests/[id]/shop.tsx` - Shopper experience
- `/src/pages/tests/[id]/results.tsx` - Results dashboard
- `/backend/routes/tests.ts` - Test CRUD
- `/backend/routes/interactions.ts` - Behavioral tracking
- `/backend/lib/analytics.ts` - Statistical computation

## What This Demonstrates

- Full-stack TypeScript development
- N-way experimentation design
- Real-time behavioral tracking
- Statistical analysis (chi-square tests, percentile calculations)
- Adaptive UI based on research question
- Database design for high-volume events

## Future Enhancements

- Layout builder (drag-and-drop shelf editor)
- Real-time WebSocket updates for live monitoring
- Separate Snowflake for analytics queries
- Advanced statistical models (Bayesian, ANOVA)
- Integration with Planogram Publisher data
