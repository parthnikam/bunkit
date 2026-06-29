'use client'

export default function AuthCodeErrorPage() {
  return (
    <div className="bg-black flex flex-col justify-center h-screen items-center px-4">
      <div className="max-w-md text-center">
        <p className="text-3xl font-bold text-white mb-4">Invalid or Expired Link</p>
        <p className="text-gray-300 mb-6">
          The confirmation link you clicked is invalid or has expired. Please try signing up again.
        </p>
        <div className="space-y-4">
          <a
            href="/auth/signup"
            className="inline-block bg-white text-black font-semibold py-2 px-6 rounded-full hover:bg-gray-200"
          >
            Sign Up Again
          </a>
          <p>
            <a href="/auth/login" className="text-blue-400 hover:text-blue-300">
              Back to login
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
