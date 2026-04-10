-- Allow JDBC drivers to insert varchar values into PostgreSQL enum columns
-- without explicit casting. Required because Exposed ORM sends parameterized
-- queries with varchar type for custom enum columns.
CREATE CAST (varchar AS domain_enum) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS policy_effect) WITH INOUT AS IMPLICIT;
