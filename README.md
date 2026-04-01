# Backend - API + DB + Auth

Backend service for the platform, responsible for:
- API endpoints (Express)
- Database layer (MongoDB + Mongoose)
- Authentication and authorization flow (JWT)

It powers both frontend applications:
- `frontend` (backoffice admin)
- `my-app` (frontoffice utilisateur)

## Tech Stack

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT authentication
- Zod validation
- Multer file upload
- Nodemailer

## Project Structure

```text
backend/
  app.js                        # Express app and route mounting
  server.js                     # Mongo connection and server start
  controllers/                  # Business logic per domain
  routes/                       # Route definitions per domain
  middlewares/
    auth.middleware.js          # JWT protect middleware
  models/                       # Mongoose models
  schemas/                      # Validation schemas (Zod)
  utils/
    jwt.js
    mailer.js
    logger.js
  uploads/                      # Static uploaded files
```

## API Base URL

Local default:

`http://localhost:3000`

Static files are served from:

`http://localhost:3000/uploads/...`

## Mounted Route Prefixes

- `/auth`
- `/user`
- `/file`
- `/logs`
- `/demandes`
- `/dons`
- `/evenements`
- `/admin`
- `/actions-solidaires`
- `/propositions-aide`
- `/affectations`
- `/chatbot`
- `/notifications`

## Authentication

- JWT bearer auth is enforced through `protect` middleware on protected endpoints.
- Use header: `Authorization: Bearer <token>`
- Secret is read from `JWT_SECRET`.

## Environment Variables

Create a `.env` file inside `backend/`:

```env
MONGO_URI=mongodb://localhost:27017/femme_cancer
JWT_SECRET=replace_with_strong_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_password
FROM_NAME=Femme Atteinte Cancer du Sein
FROM_EMAIL=no-reply@example.com
```

## Install and Run

```bash
cd backend
npm install
npm run dev
```

Production start:

```bash
npm start
```

## Notes

- Server currently starts on fixed port `3000` in `server.js`.
- Make sure MongoDB is running before starting the API.
- This repository currently has no automated tests configured for backend.

## Useful Scripts

- `npm run dev` - Start with nodemon
- `npm start` - Start with node
