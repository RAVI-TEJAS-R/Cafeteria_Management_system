-- Campus Cafeteria PostgreSQL synthetic demo seed
-- Safe for a fresh demo database. Re-running resets the demo data.
TRUNCATE TABLE
  order_status_history, order_lines, orders, stock, item_ingredients,
  menu_items, pickup_windows, menu_dates, ingredients, users, roles
RESTART IDENTITY CASCADE;

INSERT INTO roles(role_id, role_name) VALUES
  (1,'STUDENT'),(2,'STAFF'),(3,'ADMIN');

INSERT INTO users(user_id, role_id, full_name, email, password_hash, is_active)
SELECT g, 1,
       'Student ' || lpad(g::text, 2, '0'),
       'student' || g || '@cafeteria.demo',
       '$2b$10$fWDCp4eZ1YuNI1kIWIu21eHA4gytcUvJp8uUBhh7VnpAohqh0F5ZS',
       CASE WHEN g = 44 THEN 'N' ELSE 'Y' END
FROM generate_series(1,45) g;

INSERT INTO users(user_id, role_id, full_name, email, password_hash, is_active) VALUES
(46,2,'Cafeteria Staff 1','staff1@cafeteria.demo','$2b$10$U3sarH.xiE1nYKHyLD5ZIOKpLcw/UMaNYEr7EAz10Xy9wSxswmg32','Y'),
(47,2,'Cafeteria Staff 2','staff2@cafeteria.demo','$2b$10$U3sarH.xiE1nYKHyLD5ZIOKpLcw/UMaNYEr7EAz10Xy9wSxswmg32','Y'),
(48,2,'Cafeteria Staff 3','staff3@cafeteria.demo','$2b$10$U3sarH.xiE1nYKHyLD5ZIOKpLcw/UMaNYEr7EAz10Xy9wSxswmg32','Y'),
(49,2,'Cafeteria Manager','manager@cafeteria.demo','$2b$10$U3sarH.xiE1nYKHyLD5ZIOKpLcw/UMaNYEr7EAz10Xy9wSxswmg32','Y'),
(50,3,'Cafeteria Administrator','admin@cafeteria.demo','$2b$10$Zpf2hHMCaPepzwOETOg/6.FEr6LP7cgPynIGcmzHLWfcGMU6LNHRq','Y');

SELECT setval(pg_get_serial_sequence('roles','role_id'), 3, true);
SELECT setval(pg_get_serial_sequence('users','user_id'), 50, true);

INSERT INTO menu_dates(menu_date_id, menu_date, is_published)
SELECT g, DATE '2026-10-01' + (g - 1), 'Y'
FROM generate_series(1,14) g;

INSERT INTO ingredients(ingredient_id, ingredient_name) VALUES
(1,'Chicken'),(2,'Rice'),(3,'Paneer'),(4,'Wheat'),(5,'Potato'),
(6,'Carrot'),(7,'Onion'),(8,'Tomato'),(9,'Capsicum'),(10,'Egg'),
(11,'Chickpeas'),(12,'Cauliflower'),(13,'Peas'),(14,'Cabbage'),
(15,'Noodles'),(16,'Lentils'),(17,'Coconut'),(18,'Curd');

INSERT INTO menu_items(menu_item_id, menu_date_id, item_name, description, price, is_available)
SELECT
  ((d - 1) * 5) + v.item_no,
  d,
  v.item_name,
  v.description,
  v.price,
  'Y'
FROM generate_series(1,14) d
CROSS JOIN LATERAL (
  VALUES
    (1,'Chicken Biryani','Basmati rice with spiced chicken and aromatic masala',120.00),
    (2,'Veg Fried Rice','Fried rice with mixed vegetables and spring onion',80.00),
    (3,'Paneer Roll','Paneer, vegetables and sauce in a wheat wrap',75.00),
    (4,'Masala Dosa','Crispy dosa with potato masala and chutney',60.00),
    (5,'Chicken Noodles','Stir-fried noodles with chicken and vegetables',110.00)
) v(item_no,item_name,description,price);

SELECT setval(pg_get_serial_sequence('menu_dates','menu_date_id'),14,true);
SELECT setval(pg_get_serial_sequence('menu_items','menu_item_id'),70,true);
SELECT setval(pg_get_serial_sequence('ingredients','ingredient_id'),18,true);

INSERT INTO item_ingredients(menu_item_id, ingredient_id)
SELECT ((d-1)*5)+1, x FROM generate_series(1,14) d CROSS JOIN LATERAL (VALUES (1),(2),(7)) q(x)
UNION ALL
SELECT ((d-1)*5)+2, x FROM generate_series(1,14) d CROSS JOIN LATERAL (VALUES (2),(6),(7),(9)) q(x)
UNION ALL
SELECT ((d-1)*5)+3, x FROM generate_series(1,14) d CROSS JOIN LATERAL (VALUES (3),(4),(7),(8)) q(x)
UNION ALL
SELECT ((d-1)*5)+4, x FROM generate_series(1,14) d CROSS JOIN LATERAL (VALUES (2),(5),(7),(17)) q(x)
UNION ALL
SELECT ((d-1)*5)+5, x FROM generate_series(1,14) d CROSS JOIN LATERAL (VALUES (1),(15),(6),(9)) q(x);

INSERT INTO stock(menu_item_id, available_qty)
SELECT menu_item_id, 60 FROM menu_items;

INSERT INTO pickup_windows(pickup_window_id, window_date, start_time, end_time, capacity, reserved_count)
SELECT
  ((d-1)*3)+w,
  DATE '2026-10-01' + (d-1),
  CASE w WHEN 1 THEN TIME '12:00' WHEN 2 THEN TIME '12:30' ELSE TIME '13:00' END,
  CASE w WHEN 1 THEN TIME '12:30' WHEN 2 THEN TIME '13:00' ELSE TIME '13:30' END,
  30,
  0
FROM generate_series(1,14) d
CROSS JOIN generate_series(1,3) w;

SELECT setval(pg_get_serial_sequence('pickup_windows','pickup_window_id'),42,true);

-- 180 synthetic orders spread across the 14 demo days.
-- Passwords: student123 / staff123 / admin123
INSERT INTO orders(order_id,user_id,pickup_window_id,pickup_code,order_status,total_amount,ordered_at,cancelled_at)
SELECT
  g,
  1 + ((g-1) % 43),
  ((d-1)*3) + w,
  'CC' || lpad(g::text,6,'0'),
  CASE
    WHEN g % 10 IN (0) THEN 'CANCELLED'
    WHEN g % 5 = 0 THEN 'COLLECTED'
    WHEN g % 4 = 0 THEN 'READY'
    WHEN g % 3 = 0 THEN 'PREPARING'
    ELSE 'PLACED'
  END,
  mi.price * qty,
  (DATE '2026-10-01' + (d-1))::timestamp + TIME '09:00' + (g % 180) * INTERVAL '1 minute',
  CASE WHEN g % 10 = 0
       THEN (DATE '2026-10-01' + (d-1))::timestamp + TIME '10:00'
       ELSE NULL END
FROM generate_series(1,180) g
CROSS JOIN LATERAL (SELECT ((g-1)%14)+1 AS d, ((g-1)%3)+1 AS w) x
CROSS JOIN LATERAL (SELECT ((x.d-1)*5)+1+((g*7)%5) AS menu_item_id, 1 + (g%3) AS qty) q
JOIN menu_items mi ON mi.menu_item_id = q.menu_item_id;

SELECT setval(pg_get_serial_sequence('orders','order_id'),180,true);

INSERT INTO order_lines(order_id, menu_item_id, quantity, unit_price)
SELECT o.order_id,
       mi.menu_item_id,
       1 + (o.order_id % 3),
       mi.price
FROM orders o
JOIN pickup_windows pw ON pw.pickup_window_id = o.pickup_window_id
JOIN menu_dates md ON md.menu_date = pw.window_date
JOIN menu_items mi
  ON mi.menu_date_id = md.menu_date_id
 AND mi.menu_item_id = ((md.menu_date_id-1)*5)+1+((o.order_id*7)%5);

-- Make stock and pickup reservations reflect the synthetic order history.
UPDATE stock s
SET available_qty = GREATEST(
  0,
  60 - COALESCE((
    SELECT SUM(ol.quantity)
    FROM order_lines ol
    JOIN orders o ON o.order_id = ol.order_id
    WHERE ol.menu_item_id = s.menu_item_id
      AND o.order_status <> 'CANCELLED'
  ),0)
);

UPDATE pickup_windows pw
SET reserved_count = COALESCE((
  SELECT COUNT(*)
  FROM orders o
  WHERE o.pickup_window_id = pw.pickup_window_id
    AND o.order_status <> 'CANCELLED'
),0);

-- Add a few extra historical status transitions for realistic reports.
INSERT INTO order_status_history(order_id, old_status, new_status, changed_by, changed_at)
SELECT order_id, 'PLACED', 'PREPARING', 46, ordered_at + INTERVAL '5 minutes'
FROM orders
WHERE order_status IN ('PREPARING','READY','COLLECTED')
  AND order_id % 2 = 0;

INSERT INTO order_status_history(order_id, old_status, new_status, changed_by, changed_at)
SELECT order_id, 'PREPARING', 'READY', 47, ordered_at + INTERVAL '12 minutes'
FROM orders
WHERE order_status IN ('READY','COLLECTED')
  AND order_id % 4 = 0;

INSERT INTO order_status_history(order_id, old_status, new_status, changed_by, changed_at)
SELECT order_id, 'READY', 'COLLECTED', 48, ordered_at + INTERVAL '20 minutes'
FROM orders
WHERE order_status = 'COLLECTED'
  AND order_id % 5 = 0;

SELECT setval(pg_get_serial_sequence('order_status_history','history_id'),
              GREATEST((SELECT COALESCE(MAX(history_id),0) FROM order_status_history),1), true);

COMMIT;
