// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { connectMongo } from "@/lib/mongo"

// Dynamic import to avoid compilation issues
async function getUserModel() {
  const { default: User } = await import("@/models/User");
  return User;
}

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
      if (account?.provider === "google") {
        try {
          await connectMongo();
          const User = await getUserModel();
          
          // Check if user exists
          let existingUser = await User.findOne({ email: user.email });
          
          if (existingUser) {
            // Update last login and profile info
            await User.findByIdAndUpdate(existingUser._id, {
              name: user.name,
              image: user.image,
              googleId: profile?.sub,
              lastLoginAt: new Date(),
            });
          } else {
            // Create new user
            await User.create({
              name: user.name,
              email: user.email,
              image: user.image,
              googleId: profile?.sub,
              lastLoginAt: new Date(),
            });
          }
          
          return true;
        } catch (error) {
          console.error("Error saving user to database:", error);
          return false;
        }
      }
      return true;
    },
    
    async session({ session, token }) {
      if (session.user?.email) {
        try {
          await connectMongo();
          const User = await getUserModel();
          const dbUser = await User.findOne({ email: session.user.email });
          if (dbUser) {
            session.user.id = dbUser._id.toString();
            (session.user as any).createdAt = dbUser.createdAt;
          }
        } catch (error) {
          console.error("Error fetching user from database:", error);
        }
      }
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
