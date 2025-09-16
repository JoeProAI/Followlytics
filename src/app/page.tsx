import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">
          Welcome to{' '}
          <span className="text-blue-600">Followlytics</span>
        </h1>

        <p className="mt-3 text-2xl">
          Track your Twitter followers and identify unfollowers
        </p>

        <div className="flex mt-6 space-x-4">
          <Link
            href="/signup"
            className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-around max-w-4xl mt-16 sm:w-full">
          <div className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-blue-600 focus:text-blue-600">
            <h3 className="text-2xl font-bold">Track Followers &rarr;</h3>
            <p className="mt-4 text-xl">
              Monitor your Twitter followers in real-time and get detailed analytics about your audience.
            </p>
          </div>

          <div className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-blue-600 focus:text-blue-600">
            <h3 className="text-2xl font-bold">Identify Unfollowers &rarr;</h3>
            <p className="mt-4 text-xl">
              Get instant notifications when someone unfollows you and track unfollower patterns.
            </p>
          </div>

          <div className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-blue-600 focus:text-blue-600">
            <h3 className="text-2xl font-bold">Analytics Dashboard &rarr;</h3>
            <p className="mt-4 text-xl">
              View comprehensive analytics with charts, trends, and insights about your follower growth.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
