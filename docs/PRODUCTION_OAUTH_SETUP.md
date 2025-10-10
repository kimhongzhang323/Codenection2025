# Production OAuth Setup Guide

## 🔐 Security Issues to Fix IMMEDIATELY

### 1. Remove Hardcoded Secrets from Source Code

**File**: `src/main/resources/application.properties`

❌ **Current (INSECURE)**:
```properties
spring.security.oauth2.client.registration.github.client-id=Ov23li8corwOZBnYaj25
spring.security.oauth2.client.registration.github.client-secret=8ea8125e4f3a82a2c0a5a64bdcd319a12f5cbcf5
```

✅ **Update to**:
```properties
spring.security.oauth2.client.registration.github.client-id=${GITHUB_CLIENT_ID}
spring.security.oauth2.client.registration.github.client-secret=${GITHUB_CLIENT_SECRET}
spring.security.oauth2.client.registration.github.scope=read:user,user:email,repo
```

### 2. Create Environment-Specific Configuration Files

**Create**: `.env` (for local development, add to .gitignore)
```bash
# Backend Environment Variables
PORT=8081
GITHUB_CLIENT_ID=Ov23li8corwOZBnYaj25
GITHUB_CLIENT_SECRET=8ea8125e4f3a82a2c0a5a64bdcd319a12f5cbcf5
FRONTEND_URL=http://localhost:5173

# Other existing vars
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=your_url
PINECONE_API_KEY=your_key
GEMINI_API_KEY=your_key
GEMINI_API_KEY_LIST=your_keys
```

**Create**: `frontend/.env` (add to .gitignore)
```bash
VITE_API_BASE_URL=http://localhost:8081/api
```

**Create**: `frontend/.env.production` (for production build)
```bash
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

### 3. Update .gitignore

Add these lines to your `.gitignore`:
```
# Environment variables
.env
.env.local
.env.*.local
frontend/.env
frontend/.env.local
frontend/.env.*.local

# Keep template files
!.env.example
!frontend/.env.example
```

### 4. Create Example Environment Files

**Create**: `.env.example`
```bash
# Backend Configuration
PORT=8081
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FRONTEND_URL=http://localhost:5173

# AI Services
OPENAI_API_KEY=your_openai_key
OPENAI_BASE_URL=https://openrouter.ai/api
PINECONE_API_KEY=your_pinecone_key
GEMINI_API_KEY=your_gemini_key
GEMINI_API_KEY_LIST=your_gemini_keys
```

**Create**: `frontend/.env.example`
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8081/api
```

## 🌐 GitHub OAuth App Configuration

### For Development (Already Done)

OAuth App Settings:
- **Homepage URL**: `http://localhost:5173`
- **Authorization callback URL**: `http://localhost:8081/login/oauth2/code/github`

### For Production (REQUIRED)

You need to either:

#### Option A: Create Separate Production OAuth App (Recommended)

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create NEW OAuth App for production:
   - **Application name**: `AutoDocX (Production)`
   - **Homepage URL**: `https://autodocx-beta.vercel.app`
   - **Authorization callback URL**: `https://your-backend-domain.com/login/oauth2/code/github`
3. Get new Client ID and Client Secret for production
4. Set these as environment variables in your production backend

#### Option B: Add Production Callback to Existing App

1. Go to your existing GitHub OAuth App
2. Add production callback URL:
   - Click "Add callback URL"
   - Add: `https://your-backend-domain.com/login/oauth2/code/github`
3. Use the same Client ID/Secret for both dev and production

**⚠️ Note**: You need to know your production backend URL first.

## 🚀 Production Deployment Checklist

### Backend (Spring Boot)

**If deploying to Heroku**:
```bash
heroku config:set GITHUB_CLIENT_ID=your_production_client_id
heroku config:set GITHUB_CLIENT_SECRET=your_production_client_secret
heroku config:set FRONTEND_URL=https://autodocx-beta.vercel.app
heroku config:set PORT=8080
```

**If deploying to AWS/GCP/Azure**:
- Set environment variables in your deployment platform
- Ensure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `FRONTEND_URL` are set

**If using Docker**:
```dockerfile
# In your Dockerfile or docker-compose.yml
ENV GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
ENV GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
ENV FRONTEND_URL=https://autodocx-beta.vercel.app
```

### Frontend (Vite/React)

**If deploying to Vercel** (current setup):

1. Go to Vercel Project Settings → Environment Variables
2. Add:
   - `VITE_API_BASE_URL` = `https://your-backend-domain.com/api`

**Build command**: Vercel will automatically use `.env.production` if it exists

## 🔍 Testing Production OAuth Flow

### Local Testing with Production-like Setup

1. Create `frontend/.env.local`:
```bash
VITE_API_BASE_URL=http://localhost:8081/api
```

2. Start backend:
```bash
# With environment variables
export GITHUB_CLIENT_ID=Ov23li8corwOZBnYaj25
export GITHUB_CLIENT_SECRET=8ea8125e4f3a82a2c0a5a64bdcd319a12f5cbcf5
export FRONTEND_URL=http://localhost:5173
./mvnw spring-boot:run
```

3. Start frontend:
```bash
cd frontend
npm run dev
```

4. Test OAuth flow at `http://localhost:5173`

### Production Testing

1. Deploy backend with environment variables
2. Update GitHub OAuth App callback URL
3. Deploy frontend with correct `VITE_API_BASE_URL`
4. Test complete flow:
   - Click "Sign in with GitHub"
   - Authorize app
   - Verify redirect to `https://autodocx-beta.vercel.app/dashboard`
   - Check localStorage for tokens
   - Try searching private repositories

## 🛡️ Security Best Practices

1. **Never commit secrets**: Always use environment variables
2. **Rotate secrets regularly**: If exposed, generate new OAuth credentials
3. **Use separate OAuth apps**: Development and production should be isolated
4. **HTTPS only in production**: Never use OAuth over HTTP in production
5. **Validate redirect URIs**: Only allow registered callback URLs

## 📋 Current Status Summary

### ✅ What's Working
- OAuth flow in development (localhost)
- User authentication and token storage
- Private repository access after authentication

### ❌ What Will Fail in Production
- Hardcoded secrets in source code (security risk)
- No production OAuth callback URL registered
- Missing production environment variables
- Frontend doesn't know production backend URL

### 🔧 Minimum Required Changes for Production

1. Move secrets to environment variables (application.properties)
2. Create `.env` files and add to `.gitignore`
3. Register production callback URL in GitHub OAuth App
4. Set environment variables in production hosting platforms
5. Configure `VITE_API_BASE_URL` in Vercel

## 🆘 If OAuth Fails in Production

**Common Error**: "The redirect_uri is not associated with this application"

**Fix**:
1. Check GitHub OAuth App settings
2. Verify callback URL matches exactly: `https://your-backend-domain.com/login/oauth2/code/github`
3. Check backend logs for actual redirect URI being used
4. Ensure `FRONTEND_URL` environment variable is set correctly

**Common Error**: "Invalid client_id or client_secret"

**Fix**:
1. Verify environment variables are set in production
2. Check for typos in Client ID/Secret
3. Ensure production is using production OAuth credentials (if separate app)

## 📞 Need Help?

1. Check backend logs for OAuth errors
2. Verify environment variables: `echo $GITHUB_CLIENT_ID` (backend)
3. Check frontend build: Look for `VITE_API_BASE_URL` in built files
4. Test OAuth redirect manually: Visit `https://your-backend.com/oauth2/authorization/github`

