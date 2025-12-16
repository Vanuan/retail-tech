-- Create additional schemas if needed
CREATE SCHEMA IF NOT EXISTS analytics;

-- Create read-only user for monitoring (optional)
-- CREATE USER monitor WITH PASSWORD 'monitor_password';
-- GRANT CONNECT ON DATABASE vst_database TO monitor;
-- GRANT USAGE ON SCHEMA public TO monitor;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor;
