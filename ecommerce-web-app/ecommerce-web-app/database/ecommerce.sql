-- ShopEasy database. Import with:  mysql -u root -p < database/ecommerce.sql
CREATE DATABASE IF NOT EXISTS ecommerce
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecommerce;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  image VARCHAR(255) NOT NULL DEFAULT 'images/placeholder.svg',
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category (category)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('Pending','Confirmed','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
  customer_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'Cash on Delivery',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_user (user_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- product_id becomes NULL if a product is deleted, so order history is kept.
CREATE TABLE order_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_items_order (order_id),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sample products
INSERT INTO products (name, description, price, category, image, stock) VALUES
('Wireless Bluetooth Headphones', 'Over-ear headphones with deep bass, 30-hour battery life and a built-in microphone for calls.', 2499.00, 'Electronics', 'images/p1.svg', 25),
('Smart Fitness Watch', 'Tracks steps, heart rate and sleep. Water resistant with a bright AMOLED display.', 3999.00, 'Electronics', 'images/p2.svg', 15),
('Power Bank 20000mAh', 'Fast-charging portable power bank with two USB ports and a USB-C port.', 1599.00, 'Electronics', 'images/p3.svg', 40),
('Mens Cotton T-Shirt', 'Soft, breathable 100 percent cotton t-shirt with a comfortable regular fit.', 499.00, 'Fashion', 'images/p4.svg', 60),
('Womens Denim Jacket', 'Classic blue denim jacket with button front and two chest pockets.', 1799.00, 'Fashion', 'images/p5.svg', 20),
('Running Shoes', 'Lightweight running shoes with cushioned soles and a breathable mesh upper.', 2299.00, 'Fashion', 'images/p6.svg', 30),
('Stainless Steel Water Bottle', 'Double-wall insulated bottle that keeps drinks cold for 24 hours or hot for 12 hours.', 699.00, 'Home', 'images/p7.svg', 50),
('Ceramic Coffee Mug Set', 'Set of four 300 ml ceramic mugs, microwave and dishwasher safe.', 899.00, 'Home', 'images/p8.svg', 35),
('LED Desk Lamp', 'Adjustable LED lamp with three brightness levels and a USB charging port.', 1199.00, 'Home', 'images/p9.svg', 22),
('Notebook Pack of 5', 'Five ruled A5 notebooks with 100 pages each. Perfect for school and office.', 349.00, 'Books', 'images/p10.svg', 80),
('JavaScript for Beginners', 'A friendly step-by-step guide to learning JavaScript from scratch.', 649.00, 'Books', 'images/p11.svg', 18),
('Yoga Mat', 'Non-slip 6 mm thick yoga mat with a carry strap.', 999.00, 'Sports', 'images/p12.svg', 28);

-- Demo accounts (admin@shop.com / user@shop.com) are created automatically
-- with bcrypt-hashed passwords the first time the backend starts.
