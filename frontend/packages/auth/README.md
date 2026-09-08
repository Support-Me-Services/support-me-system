# @support-me/auth

Shared OIDC authentication abstraction against a **Keycloak** realm.

Exposes a single, platform-agnostic `useAuth()` hook and `<AuthProvider>`
component. The implementation differs per platform (different underlying
libraries), but the *shape* returned by `useAuth()` is identical everywhere:

```ts
interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email?: string; name?: string } | null;
  accessToken: string | null;
  login: () => void;
  logout: () => void;
}
```

- **Web** (`use-auth.web.tsx`) — built on [`react-oidc-context`], which wraps
  `oidc-client-ts` and handles the redirect-based Authorization Code flow.
- **Native** (`use-auth.native.tsx`) — built on `expo-auth-session` +
  `expo-web-browser` for the in-app browser auth session, using PKCE, with
  tokens persisted in `expo-secure-store`.

The bundler (webpack/Next.js for web, Metro for native) resolves the correct
file automatically based on the `.web.tsx` / `.native.tsx` extension, so
consumers never need to branch on platform — just `import { useAuth } from
'@support-me/auth'`.

## Required environment variables

### Web (`apps/web`, Next.js)

Must be prefixed with `NEXT_PUBLIC_` to be inlined into the client bundle.

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_KEYCLOAK_URL` | Base URL of the Keycloak server, e.g. `https://auth.example.com` |
| `NEXT_PUBLIC_KEYCLOAK_REALM` | Keycloak realm name, e.g. `support-me` |
| `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | OIDC client id registered in Keycloak for the web app |
| `NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI` | Callback URL Keycloak redirects back to, e.g. `http://localhost:3000/auth/callback` |
| `NEXT_PUBLIC_KEYCLOAK_SCOPE` | OIDC scopes, defaults to `openid profile email` |

### Native (`apps/mobile`, Expo)

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_KEYCLOAK_URL` | Base URL of the Keycloak server |
| `EXPO_PUBLIC_KEYCLOAK_REALM` | Keycloak realm name |
| `EXPO_PUBLIC_KEYCLOAK_CLIENT_ID` | OIDC client id registered in Keycloak for the native app (should be a **public** client with PKCE required) |
| `EXPO_PUBLIC_KEYCLOAK_REDIRECT_URI` | Custom-scheme redirect URI, e.g. `supportme://auth/callback`. **Must match** the `scheme` field in `apps/mobile/app.json`, and must be registered as a valid redirect URI on the Keycloak client. |
| `EXPO_PUBLIC_KEYCLOAK_SCOPE` | OIDC scopes, defaults to `openid profile email` |

Copy the following into a `.env` file per app (not committed) or wire into
your secrets manager / EAS build secrets:

```
# .env.example (web)
NEXT_PUBLIC_KEYCLOAK_URL=https://auth.example.com
NEXT_PUBLIC_KEYCLOAK_REALM=support-me
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=support-me-web
NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_KEYCLOAK_SCOPE=openid profile email

# .env.example (mobile)
EXPO_PUBLIC_KEYCLOAK_URL=https://auth.example.com
EXPO_PUBLIC_KEYCLOAK_REALM=support-me
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=support-me-mobile
EXPO_PUBLIC_KEYCLOAK_REDIRECT_URI=supportme://auth/callback
EXPO_PUBLIC_KEYCLOAK_SCOPE=openid profile email
```

## TODO

- [ ] Wire `packages/api-client`'s axios response interceptor to call the
      native `refresh()` (and the web equivalent, `oidc.signinSilent()`) on a
      401, then retry the original request once.
- [ ] Call Keycloak's `end-session` endpoint on native logout to fully clear
      the SSO session (currently only clears local tokens).
- [ ] Confirm Keycloak client configuration: web = confidential/public per
      security review, native = public client with PKCE required, valid
      redirect URIs registered for both.
