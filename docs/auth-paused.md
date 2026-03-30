Auth is paused cleanly for now.

What I changed:

replaced the Better Auth server integration with a local dev session stub in auth.ts
replaced the Better Auth client integration with a local stub in auth-client.ts
useSession() now always returns a dev session
signIn, signUp, and signOut are no-op success stubs
replaced the auth API route in route.ts
no more better-auth/next-js import
removed the deprecated auth middleware and replaced it with a no-op proxy.ts
this also removes the middleware deprecation warning path
Result:

no runtime dependency on better-auth/next-js
no login/session/provider env requirement while building
all server routes that call auth.api.getSession(...) now receive a stable dev session instead of failing
client code using useSession() also stays functional
Verification:

pnpm --filter @createflowchart/web type-check passed
Important constraint:

this is a full bypass, not partial auth degradation
anything that used to require a real logged-in user now behaves as if a fixed dev user is logged in
When you want auth back, the right way is:

restore real server/client auth modules
restore a real proxy.ts auth gate if needed
wire the auth route back to the actual adapter and env config
For now this removes the blocker so you can keep building the editor.