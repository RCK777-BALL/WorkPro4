# Backend Environment Configuration

The backend server automatically loads environment variables from `backend/.env` on startup using `dotenv`. Any variables already
present in the real environment will continue to take precedence, so you can override the `.env` defaults via the shell or your
hosting platform when needed.
