CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'served',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL          PRIMARY KEY,
    table_id        VARCHAR(20)     NOT NULL REFERENCES restaurant_tables(id),
    status          order_status    NOT NULL DEFAULT 'pending',
    customer_note   TEXT,
    total_price     DECIMAL(10, 2)  NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id              SERIAL          PRIMARY KEY,
    order_id        INT             NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id    INT             NOT NULL REFERENCES items(id),
    quantity        INT             NOT NULL CHECK (quantity > 0),
    unit_price      DECIMAL(10, 2)  NOT NULL,
    subtotal        DECIMAL(10, 2)  NOT NULL
);

CREATE TABLE IF NOT EXISTS order_item_customizations (
    id              SERIAL          PRIMARY KEY,
    order_item_id   INT             NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    option_id       INT             NOT NULL REFERENCES customization_options(id),
    quantity        INT             NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price_modifier  DECIMAL(10, 2)  NOT NULL
);
