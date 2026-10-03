# 🛍️ ShopEasy – Full-Stack E-Commerce Web Application

## 1. Project description
ShopEasy is a beginner-friendly online store built as a student project. Customers can register, browse and search products, fill a cart, check out and track their orders. Admins can manage products and update order statuses. Access is protected with JWT authentication and role-based authorization in the Express backend.

## 2. Features
**Customers:** register / login / logout · product catalog · search · category filter · product details · cart (add, +/-, remove, total) · checkout (Cash on Delivery or Demo Payment) · order history · order status tracker · cancel pending orders

**Admins:** admin login · dashboard stats · add / edit / delete products · view all products · view all orders · update order status

**Security:** bcrypt password hashing · JWT auth · role-based access (`user` / `admin`) · input validation · parameterized SQL · prices and stock are verified on the server · secrets only in `.env`

## 3. Technology stack
| Part | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL (`mysql2`) |
| Libraries | bcryptjs, jsonwebtoken, dotenv, cors |

## 4. Folder structure
```text
ecommerce-web-app/
├── frontend/            HTML pages, css/style.css, js/*.js, images/
├── backend/
│   ├── server.js        app entry point
│   ├── config/          db.js (MySQL pool), helpers.js
│   ├── routes/          authRoutes, productRoutes, orderRoutes
│   ├── controllers/     auth, product, order logic
│   └── middleware/      auth.js (JWT + role check)
├── database/ecommerce.sql
├── .env.example
├── .gitignore
├── package.json         (single package file for the whole project)
└── README.md
```

## 5. Requirements
- [Node.js](https://nodejs.org) 18 or newer
- [MySQL](https://dev.mysql.com/downloads/) 8.x (or MariaDB 10.5+)
- VS Code (optional) with the *Live Server* extension (optional)

## 6. Installation steps
```bash
cd ecommerce-web-app
npm install
```

## 7. MySQL setup & 8. Database import
Make sure the MySQL server is running, then import the schema and sample products:
```bash
mysql -u root -p < database/ecommerce.sql
```
(Windows PowerShell: `Get-Content database\ecommerce.sql | mysql -u root -p`, or run the file in MySQL Workbench.)

This creates the `ecommerce` database with tables `users`, `products`, `orders`, `order_items` (with primary and foreign keys) and 12 sample products.

## 9. `.env` configuration
Copy the example file and fill in **your own** MySQL details:
```bash
cp .env.example .env        # Windows: copy .env.example .env
```
```text
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ecommerce
DB_PORT=3306
JWT_SECRET=type_a_long_random_string_here
```
Generate a good secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

`.env` is listed in `.gitignore` and will never be uploaded to GitHub.

## 10. Start the backend
```bash
npm start
```
You should see `Server running at http://localhost:5000`. On first start the server creates the two demo accounts below (with bcrypt-hashed passwords).

## 11. Run the frontend
- **Easiest:** open **http://localhost:5000** – Express serves the frontend too.
- **Or** open the `frontend` folder with VS Code *Live Server* (e.g. `http://127.0.0.1:5500/index.html`). The frontend automatically calls the API at `http://localhost:5000/api`.

## 12. API list
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create a customer account |
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET | `/api/products?search=&category=` | public | List / search / filter products |
| GET | `/api/products/categories` | public | List categories |
| GET | `/api/products/:id` | public | Product details |
| POST | `/api/products` | admin | Add product |
| PUT | `/api/products/:id` | admin | Edit product |
| DELETE | `/api/products/:id` | admin | Delete product |
| POST | `/api/orders` | user | Place order |
| GET | `/api/orders` | user / admin | Own orders (user) or all orders (admin) |
| GET | `/api/orders/:id` | owner / admin | Order with items |
| PUT | `/api/orders/:id/status` | admin | Update status |
| PUT | `/api/orders/:id/cancel` | user | Cancel own *Pending* order |

Protected routes need the header `Authorization: Bearer <token>`.

## 13. Demo credentials
| Role | Email | Password |
|---|---|---|
| Admin | `admin@shop.com` | `Admin@123` |
| User | `user@shop.com` | `User@123` |

> These are for local demos only. Before any real deployment, set `SEED_DEMO_USERS=false` in `.env` and remove or change these accounts.

## 14. Order statuses
`Pending → Confirmed → Shipped → Delivered`, or `Cancelled` (stock is returned and a cancelled order is final).

## 15. GitHub upload instructions
```bash
cd ecommerce-web-app
git init
git add .
git status          # check: .env and node_modules must NOT be listed
git commit -m "Initial commit: ShopEasy e-commerce app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```
Create the empty repository on github.com first (no README/.gitignore) and copy its URL.

## 16. Troubleshooting
| Problem | Fix |
|---|---|
| `JWT_SECRET is missing` | You have not created `.env`. Copy `.env.example` to `.env` and set `JWT_SECRET`. |
| `Could not use the MySQL database` | Check MySQL is running and `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` in `.env`. Make sure you imported `database/ecommerce.sql`. |
| `Access denied for user` | Wrong MySQL username or password in `.env`. |
| `ER_NOT_SUPPORTED_AUTH_MODE` (old MySQL clients) | Use `mysql2` (already included) or update MySQL. |
| `EADDRINUSE` port 5000 | Change `PORT` in `.env` and open that port. If you use Live Server, also update `API_BASE` at the top of `frontend/js/api.js`. |
| "Cannot reach the server" in the browser | Backend is not running – run `npm start`. |
| Products load but no images | Open the site via `http://localhost:5000` or from the `frontend` folder (image paths are relative). |
| Cannot log in as demo user | The backend must have started once successfully (it creates the accounts). Check `SEED_DEMO_USERS` is not `false`. |
| Changed the SQL and need a fresh start | Re-importing `ecommerce.sql` drops and recreates all tables (deletes data). |

## Notes
- The login token is kept in `localStorage` (fine for a learning project).
- Payments are simulated. No real payment processing exists.
