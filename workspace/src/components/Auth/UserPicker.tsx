import { useUser } from '../../store/UserContext'
import type { User } from '../../types'

function UserCard({ user, onSelect }: { user: User; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg dark:hover:shadow-blue-950/30 transition-all group"
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md"
        style={{ backgroundColor: user.color }}
      >
        {user.initial}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {user.name}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Continue as {user.name}</p>
      </div>
    </button>
  )
}

export default function UserPicker() {
  const { allUsers, login } = useUser()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-xl font-bold text-gray-900 dark:text-gray-50">AI Doc Workspace</span>
      </div>

      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Who are you?</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select your profile to see your documents and collaborations.
        </p>
      </div>

      {allUsers.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-600">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="10 8" />
          </svg>
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md">
          {allUsers.map((user) => (
            <UserCard key={user.id} user={user} onSelect={() => login(user)} />
          ))}
        </div>
      )}

      <p className="mt-10 text-xs text-gray-400 dark:text-gray-600 text-center max-w-xs">
        This is a demo workspace — no passwords required. Everyone shares the same in-memory data.
      </p>
    </div>
  )
}
