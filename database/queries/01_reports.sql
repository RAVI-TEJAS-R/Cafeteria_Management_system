-- ============================================================
-- CAMPUS CAFETERIA
-- REPORTING / SQL DEMONSTRATION QUERIES
-- ============================================================


-- 1. ORDER DETAILS USING MULTIPLE JOINS
SELECT
    o.order_id,
    u.full_name,
    o.pickup_code,
    o.order_status,
    o.total_amount,
    pw.start_time,
    pw.end_time
FROM orders o
JOIN users u
    ON u.user_id = o.user_id
JOIN pickup_windows pw
    ON pw.pickup_window_id = o.pickup_window_id
ORDER BY o.order_id;


-- 2. ORDER COUNT BY STATUS
SELECT
    order_status,
    COUNT(*) AS order_count
FROM orders
GROUP BY order_status
ORDER BY order_status;


-- 3. REVENUE BY PICKUP WINDOW
SELECT
    pw.pickup_window_id,
    pw.start_time,
    pw.end_time,
    COUNT(o.order_id) AS total_orders,
    SUM(
        CASE
            WHEN o.order_status <> 'CANCELLED'
            THEN o.total_amount
            ELSE 0
        END
    ) AS net_revenue
FROM pickup_windows pw
LEFT JOIN orders o
    ON o.pickup_window_id = pw.pickup_window_id
GROUP BY
    pw.pickup_window_id,
    pw.start_time,
    pw.end_time
ORDER BY pw.start_time;


-- 4. TOP-SELLING MENU ITEMS
SELECT
    mi.menu_item_id,
    mi.item_name,
    SUM(ol.quantity) AS total_quantity_sold
FROM order_lines ol
JOIN orders o
    ON o.order_id = ol.order_id
JOIN menu_items mi
    ON mi.menu_item_id = ol.menu_item_id
WHERE o.order_status <> 'CANCELLED'
GROUP BY
    mi.menu_item_id,
    mi.item_name
ORDER BY total_quantity_sold DESC;


-- 5. ITEMS ABOVE AVERAGE PRICE
SELECT
    menu_item_id,
    item_name,
    price
FROM menu_items
WHERE price > (
    SELECT AVG(price)
    FROM menu_items
)
ORDER BY price DESC;


-- 6. STUDENTS WITH AT LEAST ONE ORDER
SELECT
    u.user_id,
    u.full_name,
    u.email
FROM users u
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.user_id = u.user_id
);


-- 7. MENU ITEMS WITH INGREDIENTS
SELECT
    mi.item_name,
    i.ingredient_name
FROM menu_items mi
JOIN item_ingredients ii
    ON ii.menu_item_id = mi.menu_item_id
JOIN ingredients i
    ON i.ingredient_id = ii.ingredient_id
ORDER BY
    mi.item_name,
    i.ingredient_name;


-- 8. STOCK REPORT
SELECT
    mi.menu_item_id,
    mi.item_name,
    NVL(s.available_qty, 0) AS available_qty,
    mi.is_available
FROM menu_items mi
LEFT JOIN stock s
    ON s.menu_item_id = mi.menu_item_id
ORDER BY available_qty ASC;


-- 9. PICKUP-WINDOW UTILIZATION
SELECT
    pw.pickup_window_id,
    pw.start_time,
    pw.end_time,
    pw.capacity,
    pw.reserved_count,
    pw.capacity - pw.reserved_count AS available_capacity,
    ROUND(
        (pw.reserved_count / pw.capacity) * 100,
        2
    ) AS utilization_percentage
FROM pickup_windows pw
ORDER BY pw.start_time;


-- 10. STUDENT ORDER SUMMARY
SELECT
    u.user_id,
    u.full_name,
    COUNT(o.order_id) AS total_orders,
    SUM(
        CASE
            WHEN o.order_status <> 'CANCELLED'
            THEN o.total_amount
            ELSE 0
        END
    ) AS net_spending
FROM users u
LEFT JOIN orders o
    ON o.user_id = u.user_id
GROUP BY
    u.user_id,
    u.full_name
ORDER BY net_spending DESC;
