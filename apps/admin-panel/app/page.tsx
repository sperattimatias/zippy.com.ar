import { LoginPlaceholder } from '../components/login-placeholder';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
      <section className="grid w-full gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-cyan-400">Zippy Rideshare Admin</p>
          <h1 className="text-4xl font-bold">Operations cockpit</h1>
          <p className="text-slate-300">
            Starter panel with Tailwind and a login placeholder. Authentication hooks are ready for
            future SSO integration.
          </p>
        </div>
        <LoginPlaceholder />
      </section>
    </main>
  );
}
