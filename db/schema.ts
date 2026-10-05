import {sqliteTable,text,primaryKey} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{owner:text('owner').notNull(),id:text('id').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),updated:text('updated').notNull()},t=>[primaryKey({columns:[t.owner,t.id]})]);
export const serviceCache=sqliteTable('service_cache',{key:text('key').primaryKey(),data:text('data').notNull(),expires:text('expires').notNull()});
export const serviceGate=sqliteTable('service_gate',{name:text('name').primaryKey(),nextAt:text('next_at').notNull(),day:text('day').notNull(),calls:text('calls').notNull()});
