-- Restaurant
INSERT INTO restaurants (id, name) VALUES
    ('R001', 'Sushi Zen')
ON CONFLICT (id) DO NOTHING;

-- Table
INSERT INTO restaurant_tables (id, restaurant_id) VALUES
    ('T001', 'R001')
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO categories (id, restaurant_id, name, sort_order) VALUES
    (1, 'R001', 'Appetizers',   1),
    (2, 'R001', 'Main Course',  2),
    (3, 'R001', 'Drinks',       3)
ON CONFLICT (id) DO NOTHING;
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- Items
INSERT INTO items (id, category_id, name, description, price, image_url) VALUES
    (1, 1, 'Edamame',        'Steamed soybeans with sea salt',                         5.99,  NULL),
    (2, 2, 'Salmon Sashimi', 'Fresh Norwegian salmon, 8 pieces',                       16.99, NULL),
    (3, 3, 'Green Tea',      'Hot Japanese green tea',                                 3.50,  NULL),
    (4, 2, 'Chicken Ramen',  'Rich chicken broth with chashu, egg, and noodles',       14.99, NULL)
ON CONFLICT (id) DO NOTHING;
SELECT setval('items_id_seq', (SELECT MAX(id) FROM items));

-- Customization Groups
INSERT INTO customization_groups (id, item_id, name, required, max_selections) VALUES
    (1, 1, 'Seasoning',   false, 2),
    (2, 2, 'Size',        true,  1),
    (3, 4, 'Spice Level', true,  1),
    (4, 4, 'Add-ons',     false, 3)
ON CONFLICT (id) DO NOTHING;
SELECT setval('customization_groups_id_seq', (SELECT MAX(id) FROM customization_groups));

-- Customization Options
INSERT INTO customization_options (id, group_id, name, price_modifier) VALUES
    -- Seasoning (group 1 → Edamame)
    (1,  1, 'Sea Salt',       0.00),
    (2,  1, 'Truffle Salt',   1.50),
    (3,  1, 'Chili Flakes',   0.50),
    -- Size (group 2 → Salmon Sashimi)
    (4,  2, 'Regular (8pc)',  0.00),
    (5,  2, 'Large (12pc)',   8.00),
    -- Spice Level (group 3 → Chicken Ramen)
    (6,  3, 'Mild',           0.00),
    (7,  3, 'Medium',         0.00),
    (8,  3, 'Spicy',          0.00),
    (9,  3, 'Extra Spicy',    1.00),
    -- Add-ons (group 4 → Chicken Ramen)
    (10, 4, 'Extra Egg',      2.00),
    (11, 4, 'Extra Chashu',   4.00),
    (12, 4, 'Corn',           1.00)
ON CONFLICT (id) DO NOTHING;
SELECT setval('customization_options_id_seq', (SELECT MAX(id) FROM customization_options));
