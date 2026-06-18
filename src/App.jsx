// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import FormularioSubida from './FormularioSubida';
import MisVideos from './MisVideos'; 
import Login from './Login'; 
import './App.css'; 

function App() {
  const [listaVideos, setListaVideos] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorApp, setErrorApp] = useState(null);
  const [progreso, setProgreso] = useState(0);

  // Control de navegación entre vistas: 'feed' o 'mis-videos'
  const [vistaActiva, setVistaActiva] = useState('feed'); 

  // Estado crítico para almacenar los datos del usuario logueado
  const [usuario, setUsuario] = useState(null);

  // Estados para delegar el control al componente modal de subida a Supabase
  const [mostrarModal, setMostrarModal] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  // Estado para mostrar/ocultar el menú de elección (Cámara vs Galería)
  const [mostrarMenuOrigen, setMostrarMenuOrigen] = useState(false);

  // El cerebro dinámico del algoritmo
  const [intereses, setIntereses] = useState({
    futbol: 5, noticias: 5, cocina: 5, tecnologia: 5,
    autos: 5, fitness: 5, gaming: 5, musica: 5, humor: 5,
    viajes: 5, cine: 5, finanzas: 5, moda: 5, mascotas: 5, educacion: 5
  });

  // Estado para fijar las previews al inicio de cada video
  const [previewsFijas, setPreviewsFijas] = useState({ izq: 0, der: 0 });

  const videoRef = useRef(null);
  const tiempoEntradaRef = useRef(Date.now());

  // Referencias a los inputs invisibles para poder clickearlos por código
  const inputCamaraRef = useRef(null);
  const inputGaleriaRef = useRef(null);

  // Ciclo de vida: control de sesiones y carga de datos
  useEffect(() => {
    // 1. Verificar si hay una sesión guardada de antes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUsuario(session.user);
    });

    // 2. Escuchar cambios de autenticación activos (Login, Registro con éxito, Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUsuario(session.user);
      } else {
        setUsuario(null);
      }
    });

    // 3. Obtener el catálogo de videos desde Supabase
    async function obtenerVideos() {
      try {
        let { data, error } = await supabase.from('videos').select('*');
        if (error) throw new Error(`Error de Supabase: ${error.message}`);

        if (data && data.length > 0) {
          setListaVideos(data);
          setErrorApp(null);

          const iniciales = calcularPreviewsFijasInstantes(data, 0, {
            futbol: 5, noticias: 5, cocina: 5, tecnologia: 5,
            autos: 5, fitness: 5, gaming: 5, musica: 5, humor: 5,
            viajes: 5, cine: 5, finanzas: 5, moda: 5, mascotas: 5, educacion: 5
          });
          setPreviewsFijas(iniciales);
        } else {
          setListaVideos([]);
        }
      } catch (err) {
        console.error(err);
        setErrorApp(err.message);
      } finally {
        setCargando(false);
      }
    }

    obtenerVideos();

    // Limpieza de la escucha al desmontar el componente
    return () => subscription.unsubscribe();
  }, []);

  const controlarProgresoVideo = () => {
    if (mostrarModal || vistaActiva !== 'feed') return;
    const video = videoRef.current;
    if (!video || isNaN(video.duration)) return;

    const tiempoRestante = video.duration - video.currentTime;
    if (tiempoRestante <= 6) {
      setProgreso(((6 - tiempoRestante) / 6) * 100);
    } else {
      setProgreso(0);
    }
  };

  const alTerminarVideoCompleto = () => {
    const videoPrincipal = listaVideos[indiceActual];
    if (!videoPrincipal) return;

    setIntereses(prev => ({
      ...prev,
      [videoPrincipal.categoria]: (prev[videoPrincipal.categoria] || 0) + 5
    }));
    
    cambiarVideo(previewsFijas.izq);
  };

  const calcularPreviewsFijasInstantes = (videos, indexActual, puntosInteres) => {
    if (videos.length <= 1) return { izq: 0, der: 0 };

    let categoriaFavorita = 'futbol';
    let maxPuntos = -999;
    Object.keys(puntosInteres).forEach(cat => {
      if (puntosInteres[cat] > maxPuntos) {
        maxPuntos = puntosInteres[cat];
        categoriaFavorita = cat;
      }
    });

    let opcionesIzquierda = videos.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => v.originalIndex !== indexActual && v.categoria === categoriaFavorita);

    if (opcionesIzquierda.length === 0) {
      opcionesIzquierda = videos.map((v, i) => ({ ...v, originalIndex: i }))
        .filter(v => v.originalIndex !== indexActual);
    }
    const izq = opcionesIzquierda[Math.floor(Math.random() * opcionesIzquierda.length)].originalIndex;

    let opcionesDerecha = videos.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => v.originalIndex !== indexActual && v.originalIndex !== izq);

    if (opcionesDerecha.length === 0) {
      opcionesDerecha = videos.map((v, i) => ({ ...v, originalIndex: i }))
        .filter(v => v.originalIndex !== indexActual);
    }
    
    const opcionesVariadas = opcionesDerecha.filter(v => v.categoria !== categoriaFavorita);
    const poolFinalDerecha = opcionesVariadas.length > 0 ? opcionesVariadas : opcionesDerecha;
    const der = poolFinalDerecha[Math.floor(Math.random() * poolFinalDerecha.length)].originalIndex;

    return { izq, der };
  };

  const elegirManual = (nuevoIndice, categoriaElegida) => {
    setIntereses(prev => ({ ...prev, [categoriaElegida]: (prev[categoriaElegida] || 0) + 10 }));
    cambiarVideo(nuevoIndice);
  };

  const cambiarVideo = (nuevoIndice) => {
    const tiempoPermanencia = (Date.now() - tiempoEntradaRef.current) / 1000;
    const videoAnterior = listaVideos[indiceActual];
    
    let nuevosIntereses = { ...intereses };
    if (tiempoPermanencia < 3 && videoAnterior) {
      nuevosIntereses[videoAnterior.categoria] = Math.max(0, (intereses[videoAnterior.categoria] || 0) - 3);
      setIntereses(nuevosIntereses);
    }

    setProgreso(0);
    tiempoEntradaRef.current = Date.now();
    setIndiceActual(nuevoIndice);

    const proximasPreviews = calcularPreviewsFijasInstantes(listaVideos, nuevoIndice, nuevosIntereses);
    setPreviewsFijas(proximasPreviews);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = listaVideos[nuevoIndice].url_video;
      videoRef.current.load();
    }
  };

  const manejarEleccionOrigen = (tipo) => {
    setMostrarMenuOrigen(false); 
    if (tipo === 'camara') {
      inputCamaraRef.current.click(); 
    } else if (tipo === 'galeria') {
      inputGaleriaRef.current.click(); 
    }
  };

  const prepararArchivo = (event) => {
    if (!event.target.files || event.target.files.length === 0) return;
    if (videoRef.current) videoRef.current.pause();
    setArchivoSeleccionado(event.target.files[0]);
    setMostrarModal(true);
  };

  const manejarCierreModal = (necesitaRecargar) => {
    setMostrarModal(false);
    setArchivoSeleccionado(null);
    if (necesitaRecargar) {
      window.location.reload();
    } else {
      if (videoRef.current && vistaActiva === 'feed' && listaVideos.length > 0) videoRef.current.play();
    }
  };

  const manejarLogout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
  };

  if (errorApp) return <div style={{ color: 'red', padding: '20px' }}>Error: {errorApp}</div>;
  if (cargando) return <div style={{ color: '#00ffcc', textAlign: 'center', marginTop: '20vh', fontFamily: 'sans-serif' }}>Iniciando entorno Slik/Orbit...</div>;

  // [GUARDIÁN DE AUTENTICACIÓN] Si no hay usuario activo, salta el Login sin rodeos
  if (!usuario) {
    return <Login alLoguearse={(user) => setUsuario(user)} />;
  }

  // Mapeos seguros preparados para bases de datos vacías
  const videoPrincipal = listaVideos[indiceActual] || null;
  const previewIzquierda = listaVideos[previewsFijas.izq] || null;
  const previewDerecha = listaVideos[previewsFijas.der] || null;

  return (
    <div className="contenedor-tiktok">
      {/* Botón flotante para poder cerrar sesión de forma manual */}
      <button 
        onClick={manejarLogout}
        style={{
          position: 'fixed', top: '15px', right: '15px', zIndex: 80,
          backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.2)', padding: '6px 12px',
          borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold',
          backdropFilter: 'blur(5px)'
        }}
      >
        🚪 Salir
      </button>

      {/* RENDERIZADO CONDICIONAL DE VISTAS */}
      {vistaActiva === 'feed' ? (
        <>
          {!videoPrincipal ? (
            <div style={{ 
              color: '#888', textAlign: 'center', paddingTop: '35vh', 
              paddingLeft: '20px', paddingRight: '20px', fontFamily: 'sans-serif' 
            }}>
              <p style={{ color: '#00ffcc', fontSize: '18px', fontWeight: 'bold' }}>✨ ¡Plataforma lista!</p>
              <p style={{ fontSize: '14px', lineHeight: '1.5' }}>Todavía no hay videos globales en la base de datos.<br />Tocá el botón <b>+</b> para subir el primero.</p>
            </div>
          ) : (
            <>
              <div className="contenedor-linea-tiempo">
                <div className="linea-progreso" style={{ width: `${progreso}%` }}></div>
              </div>

              <video
                ref={videoRef}
                className="reproductor-principal"
                src={videoPrincipal.url_video}
                autoPlay
                playsInline
                controls
                preload="metadata"
                onTimeUpdate={controlarProgresoVideo}
                onEnded={alTerminarVideoCompleto}
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                    if (videoRef.current.paused) videoRef.current.play();
                    else videoRef.current.pause();
                  }
                }}
              />

              <div className="barra-previews">
                {previewIzquierda && (
                  <div className="tarjeta-preview" onClick={() => elegirManual(previewsFijas.izq, previewIzquierda.categoria)}>
                    <span className="badge-categoria">{previewIzquierda.categoria}</span>
                    <video className="video-thumbnail" src={`${previewIzquierda.url_video}#t=0.5`} muted playsInline preload="metadata" />
                  </div>
                )}

                {/* BOTÓN ÚNICO CENTRAL ADENTRO DEL FEED */}
                <div style={{ width: '56px', height: '56px', zIndex: 15 }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (videoRef.current) videoRef.current.pause();
                      setMostrarMenuOrigen(true);
                    }}
                    style={{ 
                      width: '100%', height: '100%', backgroundColor: '#00ffcc', color: '#000000',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '28px', fontWeight: 'bold', boxShadow: '0 0 15px rgba(0, 255, 204, 0.6)', 
                      border: 'none', cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>

                {previewDerecha && (
                  <div className="tarjeta-preview" onClick={() => elegirManual(previewsFijas.der, previewDerecha.categoria)}>
                    <span className="badge-categoria">{previewDerecha.categoria}</span>
                    <video className="video-thumbnail" src={`${previewDerecha.url_video}#t=0.5`} muted playsInline preload="metadata" />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <MisVideos /> 
      )}

      {/* MENÚ DE NAVEGACIÓN MÓVIL FIJO ABAJO DE TODO */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, width: '100vw', height: '65px',
        backgroundColor: '#000000', borderTop: '1px solid #222', zIndex: 90,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        <button 
          onClick={() => {
            setVistaActiva('feed');
            setTimeout(() => { if (videoRef.current && listaVideos.length > 0) videoRef.current.play(); }, 100);
          }}
          style={{
            background: 'none', border: 'none', color: vistaActiva === 'feed' ? '#00ffcc' : '#888888',
            fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '20px' }}>🏠</span> Inicio
        </button>

        {/* Botón central de contingencia si el feed está vacío o estás en otra vista */}
        {(!videoPrincipal || vistaActiva !== 'feed') && (
          <button 
            onClick={() => setMostrarMenuOrigen(true)}
            style={{ 
              width: '44px', height: '44px', backgroundColor: '#00ffcc', color: '#000000',
              borderRadius: '50%', border: 'none', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 0 10px rgba(0, 255, 204, 0.4)'
            }}
          >
            +
          </button>
        )}

        <button 
          onClick={() => {
            if (videoRef.current) videoRef.current.pause();
            setVistaActiva('mis-videos');
          }}
          style={{
            background: 'none', border: 'none', color: vistaActiva === 'mis-videos' ? '#00ffcc' : '#888888',
            fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '20px' }}>🎬</span> Mis Videos
        </button>
      </div>

      {/* MODAL DE SUBIDA Y SELECTORES REFS TRAS BAMBALINAS */}
      {mostrarModal && (
        <FormularioSubida archivo={archivoSeleccionado} alCerrar={manejarCierreModal} />
      )}

      {mostrarMenuOrigen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#1e1e1e', border: '2px solid #00ffcc', borderRadius: '16px',
            padding: '25px', width: '85%', maxWidth: '320px', textAlign: 'center', boxShadow: '0 0 25px rgba(0, 255, 204, 0.3)'
          }}>
            <h3 style={{ color: '#ffffff', margin: '0 0 20px 0', fontSize: '18px', fontFamily: 'sans-serif' }}>¿Qué querés hacer?</h3>
            <button onClick={() => manejarEleccionOrigen('camara')} style={{ width: '100%', padding: '14px', marginBottom: '12px', backgroundColor: '#00ffcc', color: '#000000', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>🎥 Grabar con Cámara</button>
            <button onClick={() => manejarEleccionOrigen('galeria')} style={{ width: '100%', padding: '14px', marginBottom: '20px', backgroundColor: '#2e2e2e', color: '#ffffff', border: '1px solid #444', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>📂 Buscar en Galería</button>
            <span onClick={() => { setMostrarMenuOrigen(false); if (videoRef.current && vistaActiva === 'feed' && listaVideos.length > 0) videoRef.current.play(); }} style={{ color: '#ff0055', fontSize: '14px', cursor: 'pointer', display: 'inline-block', fontWeight: '500' }}>Cancelar</span>
          </div>
        </div>
      )}

      <input type="file" accept="video/*" capture="environment" ref={inputCamaraRef} onChange={prepararArchivo} style={{ display: 'none' }} />
      <input type="file" accept="video/mp4,video/webm,video/ogg,video/*" ref={inputGaleriaRef} onChange={prepararArchivo} style={{ display: 'none' }} />
    </div>
  );
}

export default App;