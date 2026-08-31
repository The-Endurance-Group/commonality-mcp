-- 0014_linkedin_connections_company.sql
-- LinkedIn's Connections.csv export includes a "Company" column that was
-- previously discarded on upload. Store it so 1st-degree connection matching
-- can corroborate a name match with the connection's company when the
-- profile URL doesn't match (see findLinkedInConnectors in db/queries.ts) -
-- profile search results returned in Apify's cheaper "Short" mode carry
-- LinkedIn's internal member-URN URL, not the public vanity URL a personal
-- export uses, so URL-only matching misses real 1st-degree connections.

alter table linkedin_connections
  add column if not exists company text;
