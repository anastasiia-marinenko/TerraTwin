// @ts-nocheck
// Це лише тонка обгортка. Сам Express-застосунок збирається окремо командою
// `pnpm --filter @workspace/api-server build:vercel` (див. vercel.json → buildCommand)
// у готовий файл artifacts/api-server/dist/vercel/app.cjs.
import appModule from "../artifacts/api-server/dist/vercel/app.cjs";

const app = appModule.default ?? appModule;

export default app;
