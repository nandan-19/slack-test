// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { connectMongo } from "@/lib/mongo"

// Dynamic import to avoid compilation issues
async function getUserModel() {
  const { default: User } = await import("@/models/User");
  return User;
}

// auth.ts
export const {
    handlers: { GET, POST },
    auth,
    signIn,
    signOut,
  } = NextAuth({
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
            scope: "openid email profile https://www.googleapis.com/auth/calendar",
          },
        },
      })
    ],
    callbacks: {
      async signIn({ user, account, profile }) {
        // Temporarily return true to test OAuth flow
        return true;
      },
      
      async session({ session, token }) {
        return session;
      },
  
      async jwt({ token, account, profile }) {
        if (account) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
        }
        return token;
      },
    },
    session: {
      strategy: "jwt",
    },
  })
  