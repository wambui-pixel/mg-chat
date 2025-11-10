import { AuthForm } from "@/components/auth-form";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MG Chat</h1>
          <p className="text-gray-600">Connect with your team</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
