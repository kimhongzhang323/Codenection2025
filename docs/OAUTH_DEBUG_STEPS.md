# GitHub OAuth Debugging & Testing Steps

## ✅ Changes Made

1. **Fixed User Entity**: Removed Lombok `@Data`, added manual getters/setters
2. **Hardcoded OAuth Credentials**: Added directly to `application.properties` (no environment variables needed)
3. **Simplified OAuth Flow**: Removed unnecessary redirect_uri parameters
4. **Added Debug Logging**: Console logs to track OAuth flow

## 🔧 Configuration in GitHub (CRITICAL)

Go to: https://github.com/settings/developers

For your OAuth App with Client ID `Ov23li8corwOZBnYaj25`, set these **Authorization callback URLs**:

```
http://localhost:8081/login/oauth2/code/github
```

**IMPORTANT**: Remove any other callback URLs. Only use the one above.

## 📝 Testing Steps

### Step 1: Restart Backend
```bash
# Stop your Spring Boot app completely
# Then start it again
mvn spring-boot:run
# OR if using IDE, restart the application
```

### Step 2: Check Backend Logs
Look for:
```
Using generated security password: [some-password]
```
And verify no OAuth configuration errors.

### Step 3: Test OAuth Flow

1. Open browser to: `http://localhost:5173/sign-in`
2. Open Browser Console (F12)
3. Click "Continue with GitHub"
4. Check console for: `Redirecting to: http://localhost:8081/oauth2/authorization/github`
5. You should be redirected to GitHub authorization page
6. After approving, you should return to `http://localhost:5173/dashboard#token=...&github_token=...`

### Step 4: Verify Database
After successful OAuth:
```sql
SELECT * FROM users;
```
Should show your GitHub user with `github_access_token` populated.

## 🐛 Common Issues & Fixes

### Issue 1: "404 Not Found" from GitHub
**Cause**: Wrong callback URL in GitHub OAuth App settings
**Fix**: Update GitHub OAuth App callback URL to exactly: `http://localhost:8081/login/oauth2/code/github`

### Issue 2: Backend returns 404
**Cause**: Backend not running or wrong port
**Fix**: Ensure backend runs on port 8081 (check `.env` has `PORT=8081`)

### Issue 3: "Client authentication failed"
**Cause**: Wrong client ID or secret
**Fix**: Credentials are now hardcoded in `application.properties`. Verify they match your GitHub OAuth App.

### Issue 4: No access token in database
**Cause**: Scope issue or OAuth2AuthorizedClientService not injecting token
**Fix**: Check backend logs for errors. Verify `scope=read:user,user:email,repo` in application.properties

## 🔍 Debug Endpoints

Test these URLs directly:

1. **OAuth Initiation**: `http://localhost:8081/oauth2/authorization/github`
   - Should redirect to GitHub
   
2. **Health Check**: `http://localhost:8081/api/auth/user`
   - Should return 401 if not authenticated (this is correct)

## 📋 Quick Checklist

- [ ] Backend running on port 8081
- [ ] Frontend running on port 5173
- [ ] GitHub OAuth App callback URL is EXACTLY: `http://localhost:8081/login/oauth2/code/github`
- [ ] Browser console shows OAuth redirect URL when clicking "Continue with GitHub"
- [ ] No errors in backend logs
- [ ] Database exists (H2 in-memory or PostgreSQL configured)

## 🎯 Expected Flow

```
User clicks "Continue with GitHub"
↓
Frontend redirects to: http://localhost:8081/oauth2/authorization/github
↓
Spring Security redirects to: https://github.com/login/oauth/authorize?client_id=...
↓
User approves on GitHub
↓
GitHub redirects to: http://localhost:8081/login/oauth2/code/github?code=...
↓
Spring Security exchanges code for token
↓
Calls AuthController.handleOAuthSuccess()
↓
Saves user to database with GitHub access token
↓
Redirects to: http://localhost:5173/dashboard#token=...&github_token=...
↓
Frontend stores tokens in localStorage
```

## 🚨 If Still Not Working

1. Check backend console for full stack trace
2. Check browser Network tab (F12) for failed requests
3. Share the exact error message you're seeing
4. Verify GitHub OAuth App is not "suspended" or has restrictions

