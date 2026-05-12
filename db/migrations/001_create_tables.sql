CREATE TABLE IF NOT EXISTS restaurants (
    id          VARCHAR(20)  PRIMARY KEY,
    name        VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
    id              VARCHAR(20) PRIMARY KEY,
    restaurant_id   VARCHAR(20) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    id              SERIAL      PRIMARY KEY,
    restaurant_id   VARCHAR(20) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    sort_order      INT          NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
    id              SERIAL          PRIMARY KEY,
    category_id     INT             NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    price           DECIMAL(10, 2)  NOT NULL,
    image_url       TEXT
);

CREATE TABLE IF NOT EXISTS customization_groups (
    id              SERIAL      PRIMARY KEY,
    item_id         INT         NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    required        BOOLEAN      NOT NULL DEFAULT FALSE,
    max_selections  INT          NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS customization_options (
    id              SERIAL          PRIMARY KEY,
    group_id        INT             NOT NULL REFERENCES customization_groups(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL,
    price_modifier  DECIMAL(10, 2)  NOT NULL DEFAULT 0
);
