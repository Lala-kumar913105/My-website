export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold text-gray-900">You’re offline</h1>
        <p className="mt-3 text-sm text-gray-500">
          Please reconnect to continue shopping, booking, and using AI Assistant.
        </p>
      </div>
    </div>
  );
}