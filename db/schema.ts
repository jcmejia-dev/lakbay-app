import {pgTable,text,primaryKey,customType} from 'drizzle-orm/pg-core';
const bytea=customType<{data:Buffer}>({dataType:()=> 'bytea'});
export const records=pgTable('records',{owner:text('owner').notNull(),id:text('id').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),updated:text('updated').notNull()},t=>[primaryKey({columns:[t.owner,t.id]})]);
export const serviceCache=pgTable('service_cache',{key:text('key').primaryKey(),data:text('data').notNull(),expires:text('expires').notNull()});
export const serviceGate=pgTable('service_gate',{name:text('name').primaryKey(),nextAt:text('next_at').notNull(),day:text('day').notNull(),calls:text('calls').notNull()});
export const avatarFiles=pgTable('avatars',{key:text('key').primaryKey(),body:bytea('body').notNull()});
