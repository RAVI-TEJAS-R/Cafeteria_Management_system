CREATE OR REPLACE VIEW vw_daily_order_summary AS
SELECT
    TRUNC(o.ordered_at) AS order_date,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN o.order_status <> 'CANCELLED' THEN 1 ELSE 0 END) AS completed_or_active_orders,
    SUM(CASE WHEN o.order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_orders,
    SUM(CASE WHEN o.order_status <> 'CANCELLED' THEN o.total_amount ELSE 0 END) AS net_revenue
FROM orders o
GROUP BY TRUNC(o.ordered_at);


CREATE OR REPLACE VIEW vw_menu_stock_status AS
SELECT
    mi.menu_item_id,
    mi.item_name,
    mi.price,
    mi.is_available,
    NVL(s.available_qty, 0) AS available_qty
FROM menu_items mi
LEFT JOIN stock s
    ON s.menu_item_id = mi.menu_item_id;


CREATE OR REPLACE VIEW vw_order_details AS
SELECT
    o.order_id,
    u.full_name,
    u.email,
    o.pickup_code,
    o.order_status,
    o.total_amount,
    pw.start_time,
    pw.end_time,
    o.ordered_at,
    o.cancelled_at
FROM orders o
JOIN users u
    ON u.user_id = o.user_id
JOIN pickup_windows pw
    ON pw.pickup_window_id = o.pickup_window_id;
