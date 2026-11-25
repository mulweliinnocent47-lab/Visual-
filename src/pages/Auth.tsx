import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else navigate('/');
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error.message);
      else setSuccess('Check your email to confirm your account!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-intro-fade-up">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            tydar<span className="text-primary">SU</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Visual App Builder</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 block-shadow">
          <div className="flex mb-6 bg-secondary rounded-xl p-0.5">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${isLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${!isLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              required
              minLength={6}
            />

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-xl animate-slide-up">
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs text-block-text bg-block-text/10 px-3 py-2 rounded-xl animate-slide-up">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {loading ? '...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue without account →
          </button>
        </div>
      </div>
    </div>
  );
}
