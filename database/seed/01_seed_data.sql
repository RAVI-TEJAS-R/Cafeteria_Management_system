-- ============================================================
-- CAMPUS CAFETERIA PREORDER & PICKUP
-- 01_SEED_DATA.SQL
-- ============================================================

-- ROLES
INSERT INTO roles (role_name) VALUES ('STUDENT');
INSERT INTO roles (role_name) VALUES ('STAFF');
INSERT INTO roles (role_name) VALUES ('ADMIN');

-- DEMO USERS
INSERT INTO users (role_id, full_name, email, password_hash)
SELECT role_id, 'Demo Student', 'student@cafeteria.local',
       '\\\'
FROM roles WHERE role_name = 'STUDENT';

INSERT INTO users (role_id, full_name, email, password_hash)
SELECT role_id, 'Demo Staff', 'staff@cafeteria.local',
       '\\\'
FROM roles WHERE role_name = 'STAFF';

INSERT INTO users (role_id, full_name, email, password_hash)
SELECT role_id, 'Demo Administrator', 'admin@cafeteria.local',
       '\\\'
FROM roles WHERE role_name = 'ADMIN';

-- MENU DATES
INSERT INTO menu_dates (menu_date, is_published)
VALUES (TRUNC(SYSDATE), 'Y');

INSERT INTO menu_dates (menu_date, is_published)
VALUES (TRUNC(SYSDATE) + 1, 'Y');

INSERT INTO menu_dates (menu_date, is_published)
VALUES (TRUNC(SYSDATE) + 2, 'Y');

-- TODAY'S MENU
INSERT INTO menu_items
(menu_date_id, item_name, description, price)
SELECT menu_date_id, 'Chicken Biryani',
       'Basmati rice with chicken and spices', 120
FROM menu_dates WHERE menu_date = TRUNC(SYSDATE);

INSERT INTO menu_items
(menu_date_id, item_name, description, price)
SELECT menu_date_id, 'Veg Fried Rice',
       'Vegetable fried rice with fresh vegetables', 80
FROM menu_dates WHERE menu_date = TRUNC(SYSDATE);

INSERT INTO menu_items
(menu_date_id, item_name, description, price)
SELECT menu_date_id, 'Paneer Roll',
       'Paneer and vegetables wrapped in flatbread', 70
FROM menu_dates WHERE menu_date = TRUNC(SYSDATE);

INSERT INTO menu_items
(menu_date_id, item_name, description, price)
SELECT menu_date_id, 'Masala Dosa',
       'Crispy dosa with potato masala', 60
FROM menu_dates WHERE menu_date = TRUNC(SYSDATE);

-- TOMORROW'S MENU
INSERT INTO menu_items
(menu_date_id, item_name, description, price)
SELECT menu_date_id, 'Chicken Rice',
       'Spiced chicken rice with vegetables', 110
FROM menu_dates WHERE menu_date = TRUNC(SYSDATE) + 1;

INSERT INTO menu_items
(menu_date_id, item_name, description, price)
SELECT menu_date_id, 'Veg Noodles',
       'Stir-fried noodles with vegetables', 75
FROM menu_dates WHERE menu_date = TRUNC(SYSDATE) + 1;

INSERT INTO menu_items
(menu_date_id, item_name, description, price)
SELECT menu_date_id, 'Paneer Butter Masala',
       'Paneer cooked in tomato-based gravy', 100
FROM menu_dates WHERE menu_date = TRUNC(SYSDATE) + 1;

-- INGREDIENTS
INSERT INTO ingredients (ingredient_name) VALUES ('Chicken');
INSERT INTO ingredients (ingredient_name) VALUES ('Rice');
INSERT INTO ingredients (ingredient_name) VALUES ('Paneer');
INSERT INTO ingredients (ingredient_name) VALUES ('Wheat');
INSERT INTO ingredients (ingredient_name) VALUES ('Potato');
INSERT INTO ingredients (ingredient_name) VALUES ('Carrot');
INSERT INTO ingredients (ingredient_name) VALUES ('Onion');
INSERT INTO ingredients (ingredient_name) VALUES ('Tomato');
INSERT INTO ingredients (ingredient_name) VALUES ('Capsicum');
INSERT INTO ingredients (ingredient_name) VALUES ('Egg');

-- ITEM ? INGREDIENT RELATIONSHIPS
INSERT INTO item_ingredients
SELECT m.menu_item_id, i.ingredient_id
FROM menu_items m, ingredients i
WHERE m.item_name = 'Chicken Biryani'
AND i.ingredient_name IN ('Chicken', 'Rice', 'Onion');

INSERT INTO item_ingredients
SELECT m.menu_item_id, i.ingredient_id
FROM menu_items m, ingredients i
WHERE m.item_name = 'Veg Fried Rice'
AND i.ingredient_name IN ('Rice', 'Carrot', 'Onion', 'Capsicum');

INSERT INTO item_ingredients
SELECT m.menu_item_id, i.ingredient_id
FROM menu_items m, ingredients i
WHERE m.item_name = 'Paneer Roll'
AND i.ingredient_name IN ('Paneer', 'Wheat', 'Onion');

INSERT INTO item_ingredients
SELECT m.menu_item_id, i.ingredient_id
FROM menu_items m, ingredients i
WHERE m.item_name = 'Masala Dosa'
AND i.ingredient_name IN ('Rice', 'Potato', 'Onion');

INSERT INTO item_ingredients
SELECT m.menu_item_id, i.ingredient_id
FROM menu_items m, ingredients i
WHERE m.item_name = 'Chicken Rice'
AND i.ingredient_name IN ('Chicken', 'Rice', 'Carrot');

INSERT INTO item_ingredients
SELECT m.menu_item_id, i.ingredient_id
FROM menu_items m, ingredients i
WHERE m.item_name = 'Veg Noodles'
AND i.ingredient_name IN ('Wheat', 'Carrot', 'Onion', 'Capsicum');

INSERT INTO item_ingredients
SELECT m.menu_item_id, i.ingredient_id
FROM menu_items m, ingredients i
WHERE m.item_name = 'Paneer Butter Masala'
AND i.ingredient_name IN ('Paneer', 'Tomato', 'Onion');

-- STOCK
INSERT INTO stock (menu_item_id, available_qty)
SELECT menu_item_id, 50 FROM menu_items;

-- PICKUP WINDOWS FOR TODAY
INSERT INTO pickup_windows
(window_date, start_time, end_time, capacity)
VALUES
(
    TRUNC(SYSDATE),
    TRUNC(SYSDATE) + INTERVAL '12' HOUR,
    TRUNC(SYSDATE) + INTERVAL '12' HOUR + INTERVAL '30' MINUTE,
    20
);

INSERT INTO pickup_windows
(window_date, start_time, end_time, capacity)
VALUES
(
    TRUNC(SYSDATE),
    TRUNC(SYSDATE) + INTERVAL '12' HOUR + INTERVAL '30' MINUTE,
    TRUNC(SYSDATE) + INTERVAL '13' HOUR,
    20
);

INSERT INTO pickup_windows
(window_date, start_time, end_time, capacity)
VALUES
(
    TRUNC(SYSDATE),
    TRUNC(SYSDATE) + INTERVAL '13' HOUR,
    TRUNC(SYSDATE) + INTERVAL '13' HOUR + INTERVAL '30' MINUTE,
    20
);

COMMIT;

