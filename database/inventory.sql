CREATE DATABASE IF NOT EXISTS stockflow_inventory;
USE stockflow_inventory;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','staff') DEFAULT 'staff',
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  contact_person VARCHAR(120),
  phone VARCHAR(30),
  email VARCHAR(120),
  address VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  category_id INT NULL,
  supplier_id INT NULL,
  buying_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  minimum_stock INT NOT NULL DEFAULT 5,
  image VARCHAR(255),
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  supplier_id INT NULL,
  quantity INT NOT NULL,
  buying_price DECIMAL(12,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  invoice_number VARCHAR(100),
  purchase_date DATE NOT NULL,
  user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  buying_price_at_sale DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method ENUM('Cash','M-Pesa','Card','Bank Transfer') DEFAULT 'Cash',
  sale_date DATE NOT NULL,
  user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  adjustment_type ENUM('increase','decrease') NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT IGNORE INTO users (full_name, email, phone, password, role, status) VALUES
('System Admin', 'admin@stockflow.com', '0700000000', '$2a$10$PPtiXZVRp7EgECLuacKs8OZBt5rNHU3cnZbvEEBPLV7FEP6K7KLeG', 'admin', 'active');

INSERT IGNORE INTO categories (name, description) VALUES
('Clothing', 'Clothes and fashion items'), ('Shoes', 'Footwear items'), ('Accessories', 'Business accessories');

INSERT IGNORE INTO suppliers (name, contact_person, phone, email, address) VALUES
('Nairobi Wholesale Supplies', 'Jane Mwangi', '0712345678', 'sales@nairobiwholesale.test', 'Nairobi CBD'),
('Metro Distributors', 'David Otieno', '0798765432', 'orders@metrodistributors.test', 'Industrial Area');

INSERT IGNORE INTO products (name, sku, category_id, supplier_id, buying_price, selling_price, stock_quantity, minimum_stock, description) VALUES
('Denim Jacket', 'SKU-DENIM-JACKET', 1, 1, 1800, 3000, 25, 5, 'Premium denim jacket'),
('Classic Sneakers', 'SKU-SNEAKERS', 2, 2, 2200, 4200, 18, 4, 'Comfortable casual sneakers'),
('Leather Belt', 'SKU-BELT', 3, 1, 400, 900, 8, 10, 'Durable leather belt');
