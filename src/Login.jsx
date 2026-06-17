// src/Login.jsx
import React, { useState } from 'react';
import { supabase } from './supabaseClient';

function Login({ alLoguearse }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [esRegistro, setEsRegistro] = useState(false); // Alterna entre Login y Registro
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState(null);

  // Manejar el ingreso por Email tradicional
  const manejarAuthEmail = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensajeError(null);

    try {
      if (esRegistro) {
        // REGISTRO DE USUARIO NUEVO
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('¡Registro exitoso! Te enviamos un mail de confirmación (revisá spam).');
      } else {
        // INICIO DE SESIÓN
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) alLoguearse(data.user);
      }
    } catch (err) {
      setMensajeError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setCargando(false);
    }
  };

  // MANEJAR EL BOTÓN DE GOOGLE (OAuth)
  const iniciarConGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin // Vuelve automáticamente a tu app después de loguearse
        }
      });
      if (error) throw error;
    } catch (err) {
      setMensajeError(err.message);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', backgroundColor: '#121212', fontFamily: 'sans-serif', padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '16px',
        width: '100%', maxWidth: '360px', border: '1px solid #333', textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        {/* Título dinámico adaptado a los posibles nombres */}
        <h2 style={{ color: '#00ffcc', margin: '0 0 10px 0', fontSize: '28px', fontWeight: 'bold' }}>
          SLIK / ORBIT
        </h2>
        <p style={{ color: '#888', margin: '0 0 25px 0', fontSize: '14px' }}>
          {esRegistro ? 'Creá tu cuenta para empezar' : 'Iniciá sesión para personalizar tu algoritmo'}
        </p>

        {mensajeError && (
          <div style={{ backgroundColor: 'rgba(255, 0, 85, 0.1)', color: '#ff0055', padding: '10px', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', border: '1px solid rgba(255, 0, 85, 0.3)' }}>
            {mensajeError}
          </div>
        )}

        {/* Formulario Tradicional */}
        <form onSubmit={manejarAuthEmail} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            type="email" placeholder="Tu correo electrónico" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }}
          />
          <input 
            type="password" placeholder="Tu contraseña" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }}
          />
          <button 
            type="submit" disabled={cargando}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#00ffcc', color: '#000', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: '0.2s', marginTop: '5px' }}
          >
            {cargando ? 'Procesando...' : esRegistro ? 'Registrarme' : 'Entrar'}
          </button>
        </form>

        <div style={{ margin: '20px 0', color: '#555', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <hr style={{ width: '30%', borderColor: '#333' }} /> o <hr style={{ width: '30%', borderColor: '#333' }} />
        </div>

        {/* Botón de Google Profesional */}
        <button 
          onClick={iniciarConGoogle}
          style={{
            width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444',
            backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold', fontSize: '15px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer'
          }}
        >
          {/* G de Google en SVG plano */}
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.58z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.39 24 12 24z"/><path fill="#FBBC05" d="M5.32 14.24A7.16 7.16 0 0 1 5 12c0-.79.13-1.57.32-2.34V6.51H1.21A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.21 5.39l4.11-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.18 2.12 1.21 5.39l4.11 3.15c.94-2.85 3.57-4.96 6.68-4.96z"/></svg>
          Continuar con Google
        </button>

        {/* Switcher inferior */}
        <p style={{ color: '#aaa', fontSize: '14px', marginTop: '25px', marginBottom: 0 }}>
          {esRegistro ? '¿Ya tenés cuenta?' : '¿No tenés una cuenta todavía?'} <br />
          <span 
            onClick={() => setEsRegistro(!esRegistro)}
            style={{ color: '#00ffcc', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', display: 'inline-block', marginTop: '5px' }}
          >
            {esRegistro ? 'Iniciá Sesión acá' : 'Registrate gratis acá'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;