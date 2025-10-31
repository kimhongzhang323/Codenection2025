# Environment Configuration Guide

## Overview
This guide explains how to properly configure environment variables for both development and production environments to avoid hardcoded URLs and ensure proper API routing.

## Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```bash
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:8081/api

# GitHub Configuration (Optional - for repository search)
VITE_GITHUB_ACCESS_TOKEN=your_github_token_here

# Discord Webhook (Optional - for notifications)
VITE_DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
```

### Production Frontend Environment Variables

For production (Vercel, Netlify, etc.):

```bash
# Backend API Configuration
VITE_API_BASE_URL=https://your-backend-domain.com/api

# GitHub Configuration
VITE_GITHUB_ACCESS_TOKEN=your_production_github_token

# Discord Webhook
VITE_DISCORD_WEBHOOK_URL=your_production_discord_webhook_url
```

## Backend Environment Variables

Set these environment variables for your Spring Boot application:

### Development
```bash
# Server Configuration
PORT=8081

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:5173

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:4173

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=your_openai_base_url
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEY_LIST=your_gemini_key_list

# Vector Database
PINECONE_API_KEY=your_pinecone_api_key
```

### Production
```bash
# Server Configuration
PORT=8080

# Frontend URL (for OAuth redirects)
FRONTEND_URL=https://autodocx-beta.vercel.app

# CORS Configuration
ALLOWED_ORIGINS=https://autodocx-beta.vercel.app,https://your-custom-domain.com

# GitHub OAuth
GITHUB_CLIENT_ID=your_production_github_client_id
GITHUB_CLIENT_SECRET=your_production_github_client_secret

# AI Configuration
OPENAI_API_KEY=your_production_openai_api_key
OPENAI_BASE_URL=your_production_openai_base_url
GEMINI_API_KEY=your_production_gemini_api_key
GEMINI_API_KEY_LIST=your_production_gemini_key_list

# Vector Database
PINECONE_API_KEY=your_production_pinecone_api_key
```

## API Routing Architecture

### Consistent API Structure
All API endpoints now follow a consistent pattern:

```
Backend Base URL: http://localhost:8081 (or your domain)
API Base URL: http://localhost:8081/api

Authentication Endpoints:
- POST /api/auth/validate
- GET  /api/auth/user
- POST /api/auth/logout
- GET  /api/auth/success (OAuth callback)

OAuth Endpoints (Spring Security managed):
- GET  /oauth2/authorization/github

Other API Endpoints:
- GET  /api/documentation
- POST /api/agent/get-response
- GET  /api/config
- etc.
```

### Why This Architecture?

1. **Consistency**: All business logic APIs are under `/api`
2. **Security**: OAuth endpoints are handled by Spring Security at root level
3. **Flexibility**: Easy to change base URLs via environment variables
4. **Maintainability**: Centralized configuration management

## Migration from Hardcoded URLs

### Before (❌ Bad)
```javascript
// Hardcoded URLs scattered throughout codebase
fetch('http://localhost:8081/api/auth/validate', ...)
fetch('http://localhost:8081/oauth2/authorization/github', ...)
```

### After (✅ Good)
```javascript
// Centralized configuration
import { getApiUrl, getOAuthUrl } from '../config/api';

fetch(getApiUrl('/auth/validate'), ...)
window.location.href = getOAuthUrl('github', redirectUri);
```

## Development Setup

1. **Frontend Setup**:
   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit .env.local with your values
   npm install
   npm run dev
   ```

2. **Backend Setup**:
   ```bash
   # Set environment variables in your IDE or terminal
   export VITE_API_BASE_URL=http://localhost:8081/api
   export GITHUB_CLIENT_ID=your_client_id
   export GITHUB_CLIENT_SECRET=your_client_secret
   # ... other variables
   
   ./mvnw spring-boot:run
   ```

## Deployment Checklist

- [ ] Set `VITE_API_BASE_URL` to production backend URL
- [ ] Set `FRONTEND_URL` in backend to production frontend URL
- [ ] Configure `ALLOWED_ORIGINS` for CORS
- [ ] Set production GitHub OAuth credentials
- [ ] Set production AI API keys
- [ ] Test OAuth flow in production environment
- [ ] Verify all API endpoints work with new URLs

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check `ALLOWED_ORIGINS` environment variable
2. **OAuth Redirect Issues**: Verify `FRONTEND_URL` is set correctly
3. **API Not Found**: Ensure `VITE_API_BASE_URL` includes `/api` suffix
4. **Token Validation Fails**: Check backend and frontend are using same base URL

### Debug Commands

```bash
# Check environment variables (frontend)
echo $VITE_API_BASE_URL

# Check environment variables (backend)
echo $FRONTEND_URL
echo $ALLOWED_ORIGINS

# Test API connectivity
curl -X POST http://localhost:8081/api/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"test","userId":"test"}'
```
