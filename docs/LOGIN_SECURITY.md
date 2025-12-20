# Login Page Security Implementation

This document describes the multi-layered security implementation for the `/login` page.

## Security Layers

### Layer 1: Google OAuth Domain Restriction (`hd` parameter)

The Google OAuth sign-in uses the `hd` (hosted domain) parameter to restrict sign-ins to the primary domain at the Google authentication level:

```typescript
queryParams: {
  hd: 'sageoutdooradvisory.com', // Primary domain restriction
}
```

**Note:** The `hd` parameter only supports a single domain, so this restricts to `@sageoutdooradvisory.com` at the OAuth level.

### Layer 2: Email Domain Validation (Post-Authentication)

After a user successfully authenticates with Google OAuth, the application validates that their email address belongs to an allowed domain:

**Allowed Domains:**
- `@sageoutdooradvisory.com`
- `@sagecommercial.com`

**Implementation:**
- Domain validation occurs immediately after OAuth callback
- Users with emails from other domains are automatically signed out
- Clear error message displayed to unauthorized users

**Code Location:** `lib/auth-helpers.ts` → `isAllowedEmailDomain()`

### Layer 3: Managed Users Table Verification

Even if a user passes the domain check, they must also be explicitly added to the `managed_users` table:

**Requirements:**
- User must exist in `managed_users` table
- User's `is_active` status must be `true`
- User must have a valid `user_id` matching their Supabase auth user ID

**Implementation:**
- Check occurs after domain validation
- Users not in the table are automatically signed out
- Error message directs users to contact an administrator

**Code Location:** `components/LoginForm.tsx` → `verifyUserAccess()`

## Security Flow

```
1. User clicks "Continue with Google"
   ↓
2. Google OAuth (with hd parameter) → Only @sageoutdooradvisory.com can proceed
   ↓
3. User authenticates with Google
   ↓
4. OAuth callback returns to application
   ↓
5. ✅ Domain Validation → Check if email is @sageoutdooradvisory.com OR @sagecommercial.com
   │   ❌ If fails → Sign out immediately, show error
   ↓
6. ✅ Managed Users Check → Verify user exists in managed_users table with is_active=true
   │   ❌ If fails → Sign out immediately, show error
   ↓
7. ✅ User granted access → Redirect to application
```

## Error Messages

### Domain Validation Failure
```
Access denied. Only users with @sageoutdooradvisory.com or @sagecommercial.com email addresses are authorized to access this application.
```

### Managed Users Check Failure
```
Access denied. Your account is not authorized to access this application. Please contact an administrator to be added to the system.
```

## Code Files Modified

1. **`lib/auth-helpers.ts`**
   - Added `ALLOWED_EMAIL_DOMAINS` constant
   - Added `isAllowedEmailDomain()` function

2. **`components/LoginForm.tsx`**
   - Updated `verifyUserAccess()` to validate email domain first
   - Added email domain check before managed_users verification
   - Updated `handleGoogleSignIn()` to include `hd` parameter
   - Enhanced error messages

3. **`app/api/auth/verify-managed-user/route.ts`**
   - Added domain validation before managed_users check
   - Enhanced error messages

4. **`app/login/page.tsx`**
   - Updated page description to mention allowed domains

## Adding New Allowed Domains

To add a new allowed email domain:

1. Update `ALLOWED_EMAIL_DOMAINS` in `lib/auth-helpers.ts`:
   ```typescript
   export const ALLOWED_EMAIL_DOMAINS = [
     'sageoutdooradvisory.com',
     'sagecommercial.com',
     'newdomain.com', // Add new domain here
   ] as const;
   ```

2. Update error messages in:
   - `components/LoginForm.tsx` (verifyUserAccess function)
   - `app/api/auth/verify-managed-user/route.ts`

3. Optionally update `app/login/page.tsx` description if needed

**Note:** The `hd` parameter in Google OAuth only supports one domain, so the primary domain should remain in that parameter. Additional domains are validated post-authentication.

## Testing

To test the security implementation:

1. **Test Allowed Domain (should succeed):**
   - Sign in with `@sageoutdooradvisory.com` email (must be in managed_users table)
   - Sign in with `@sagecommercial.com` email (must be in managed_users table)

2. **Test Unauthorized Domain (should fail at domain check):**
   - Attempt to sign in with `@example.com` or any other domain
   - Should be signed out immediately with domain error message

3. **Test Unauthorized User (should fail at managed_users check):**
   - Sign in with allowed domain email but not in managed_users table
   - Should be signed out with managed_users error message

## Security Best Practices

✅ **Multi-layered approach** - Three independent security checks
✅ **Fail-safe defaults** - Users are signed out if any check fails
✅ **Clear error messages** - Users understand why access was denied
✅ **Server-side validation** - API route also validates (defense in depth)
✅ **Domain restriction at OAuth level** - First line of defense

## Important Notes

- The `hd` parameter in Google OAuth restricts to `@sageoutdooradvisory.com` only
- Additional domains (`@sagecommercial.com`) are validated after authentication
- Users must pass BOTH domain validation AND managed_users check to gain access
- All security checks happen automatically - no manual intervention required
