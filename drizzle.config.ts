import {defineConfig} from 'drizzle-kit';
export default defineConfig({out:'./db/postgres/generated',schema:'./db/schema.ts',dialect:'postgresql'});
