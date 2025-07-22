// components/AuthButton.tsx
import { auth, signIn, signOut } from "@/auth"

export default async function AuthButton() {
  const session = await auth()

  if (session?.user) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          {session.user.image && (
            <img 
              src={session.user.image} 
              alt={session.user.name || 'User'}
              className="w-8 h-8 rounded-full border-2 border-rose-200"
            />
          )}
          <div className="hidden md:block">
            <p className="text-sm font-medium text-amber-900">
              {session.user.name}
            </p>
            <p className="text-xs text-amber-700">{session.user.email}</p>
          </div>
        </div>
        
        <form action={async () => {
          "use server"
          await signOut({ redirectTo: "/" })
        }}>
          <button 
            type="submit"
            className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Sign Out
          </button>
        </form>
      </div>
    )
  }

  return (
    <form action={async () => {
      "use server"
      await signIn("google")
    }}>
      <button 
        type="submit"
        className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm"
      >
        Sign In
      </button>
    </form>
  )
}
