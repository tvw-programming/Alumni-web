CREATE TABLE IF NOT EXISTS items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

INSERT INTO items (name)
SELECT seed.name
FROM (
    VALUES
        ('Production dashboard1'),
        ('Production dashboard2'),
        ('Production dashboard3'),
        ('Production dashboard4'),
        ('Production dashboard5'),
        ('Production dashboard6'),
        ('Production dashboard7'),
        ('Production dashboard8'),
        ('Production dashboard9'),
        ('Production dashboard10'),
        ('API health monitoring'),
        ('API health monitoring'),
        ('PostgreSQL backups')
) AS seed(name)
WHERE NOT EXISTS (SELECT 1 FROM items);

