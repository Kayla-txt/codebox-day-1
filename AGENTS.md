# Meal Planner Project Standards

## Security

- Treat frontend code as untrusted. All real security checks happen on the backend.
- Use JWT authentication for protected API routes.
- Keep public routes clearly marked and do not require a JWT unless requested.
- Verify every JWT on the server: signature, expiration, and expected format.
- Return `401 Unauthorized` for missing, invalid, or expired tokens.
- Never hardcode secrets, API keys, or JWT secrets.
- Store private values in `.env`; never commit `.env` to GitHub.
- Do not expose secret Supabase keys to the frontend.
- Validate request data on the backend before using it.
- Check that a user is allowed to access or change the specific data they request.
- Use clear JSON error responses without revealing private technical details.

## Frontend and Backend

- The frontend sends requests to Express API routes.
- The backend validates the request, checks authentication and authorization, then talks to Supabase.
- The frontend should receive only the data it needs.
- Keep database queries and private logic on the backend.
- Use JSON consistently for API responses.

## Code Quality

- Use JavaScript and CommonJS style: `require()` and `module.exports`.
- Keep startup code in `server.js`.
- Put routes in `routes/`, reusable logic in `services/`, and request checks in `middleware/`.
- Keep route handlers small and move data logic into services.
- Use meaningful names and consistent formatting.
- Preserve existing API URLs, response bodies, and status codes unless a change is requested.
- Test important routes after changes.

## Frontend Design

- Keep spacing, colors, button styles, and text styles consistent.
- Use clear page headings and simple navigation.
- Make layouts work on both desktop and mobile.
- Show helpful loading, success, and error states.
- Use accessible labels for forms and buttons.
- Do not show technical error messages directly to users.

## Before Committing

- Check that `.env` and `node_modules/` are ignored.
- Do not commit secrets.
- Do not edit or commit anything in the Meal Planner folder.
- Test the relevant API routes before committing.
