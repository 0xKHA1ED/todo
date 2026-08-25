import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="bg-aurora animate-aurora absolute inset-0" aria-hidden />
      <div className="absolute -left-24 top-12 h-72 w-72 animate-float rounded-full bg-sky-400/20 blur-3xl" aria-hidden />
      <div className="absolute -right-20 bottom-6 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  )
}
