export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden">
        <aside className="hidden md:flex w-42 border-r border-gray-200 p-4">
            <div className="flex flex-col gap-2">
                <div>Home</div>
                <div>Bunks</div>
                <div>Leave</div>
                <div>Settings</div>
            </div>
        </aside>

        <main className="flex-1 overflow-auto">
            <div className="max-w-full mx-auto">
                {children}
            </div>
        </main>

        <nav className="md:hidden h-16 border-t border-gray-800 flex items-center justify-around bg-black fixed bottom-0 left-0 right-0">
            <div>Home</div>
            <div>Bunks</div>
            <div>Leave</div>
            <div>Settings</div>
        </nav>
    </div>
  )
}