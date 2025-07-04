'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabaseClient';
import { FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nomeProprietario, setNomeProprietario] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && typeof window !== 'undefined') {
        if (!window.location.pathname.startsWith('/redefinir-senha')) {
          router.push('/');
        }
      }
    };
    checkUser();
  }, [router]);

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleAuth = async () => {
    setError('');
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email inválido.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        const userId = data.user?.id;
        if (!userId) throw new Error('ID de usuário não encontrado após cadastro.');

        const { error: profileError } = await supabase.rpc('insert_profile_data', {
          uid: userId,
          uemail: email,
          unome: nomeProprietario.trim() || 'Nome não informado'
        });

        if (profileError) {
          console.error('Erro ao salvar perfil via RPC:', profileError);
          setError('Erro ao salvar dados do perfil. Tente novamente.');
          setLoading(false);
          return;
        }

        alert('Cadastro realizado! Verifique seu email para confirmar.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setNomeProprietario('');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Email ou senha inválidos.');
          } else {
            throw signInError;
          }
        } else {
          router.push('/');
        }
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      if (!error) {
        setError(err.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });

      if (googleError) throw googleError;
    } catch (err) {
      console.error('Erro no login com Google:', err.message);
      setError('Falha ao tentar login com Google. Tente novamente.');
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { id, email, user_metadata } = session.user;

        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', id)
          .single();

        if (!existingProfile) {
          const { error: insertError } = await supabase.rpc('insert_profile_data', {
            uid: id,
            uemail: email,
            unome: user_metadata?.name || 'Nome não informado'
          });

          if (insertError) {
            console.error('Erro ao inserir perfil Google via RPC:', insertError);
          }
        }

        router.push('/');
      }
    };

    checkUserProfile();
  }, [router]);

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
  };

  const handlePasswordReset = async () => {
    setError('');
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email inválido.');
      setLoading(false);
      return;
    }

    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://www.vempracaapp.com/redefinir-senha',
      });
      alert('Verifique seu email para redefinir a senha.');
    } catch (err) {
      console.error('Erro na recuperação de senha:', err);
      setError('Ocorreu um erro ao tentar redefinir a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // ... mantenha aqui seu layout JSX como estava antes
    <></>
  );
}