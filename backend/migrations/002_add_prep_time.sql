-- Merchant-provided preparation time estimate, set when an order is accepted
ALTER TABLE orders ADD COLUMN estimated_ready_time TIMESTAMP;
