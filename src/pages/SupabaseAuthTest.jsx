import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export default function SupabaseAuthTest() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      },
    });

    if (authError) setError(authError.message);
    setLoading(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signOut();
    if (authError) setError(authError.message);
    setLoading(false);
  };

  if (!isSupabaseConfigured) {
    return (
      <main style={{ maxWidth: 720, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
        <h1>Teste Supabase — CimentoPro</h1>
        <p>Supabase ainda não está configurado neste ambiente.</p>
        <p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Teste Supabase — CimentoPro</h1>
      <p>Esta página é isolada e não altera o login atual do Base44.</p>

      {!session ? (
        <button onClick={signInWithGoogle} disabled={loading}>
          {loading ? 'Conectando...' : 'Entrar com Google'}
        </button>
      ) : (
        <>
          <h2>Login realizado</h2>
          <p><strong>Usuário:</strong> {session.user.email}</p>
          <p><strong>ID:</strong> {session.user.id}</p>
          <button onClick={signOut} disabled={loading}>
            {loading ? 'Saindo...' : 'Sair'}
          </button>
        </>
      )}

      {error && (
        <p style={{ marginTop: 20 }}>
          <strong>Erro:</strong> {error}
        </p>
      )}
    </main>
  );
}
