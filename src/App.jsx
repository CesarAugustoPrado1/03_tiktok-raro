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

  // Estados para el sistema de Likes
  const [likesContador, setLikesContador] = useState(0);
  const [usuarioDioLike, setUsuarioDioLike] = useState(false);

  // Estados nuevos para el sistema de Comentarios (Guardados para el futuro)
  const [mostrarComentarios, setMostrarComentarios] = useState(false);
  const [listaComentarios, setListaComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Control de navegación entre vistas: 'feed', 'descubrir' o 'mis-videos'
  const [vistaActiva, setVistaActiva] = useState('feed'); 

  // Estado para la barra de búsqueda de la pestaña Descubrir
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

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

  const inputCamaraRef = useRef(null);
  const inputGaleriaRef = useRef(null);

  // Ciclo de vida principal
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUsuario(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setUsuario(session.user);
      else setUsuario(null);
    });

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

    return () => subscription.unsubscribe();
  }, []);

  // Cargar estadísticas de likes y comentarios cada vez que cambia el video actual
  useEffect(() => {
    if (listaVideos.length > 0 && listaVideos[indiceActual] && usuario) {
      const videoId = listaVideos[indiceActual].id;
      cargarDatosLikes(videoId);
      cargarComentarios(videoId);
      setMostrarComentarios(false);
    }
  }, [indiceActual, listaVideos, usuario]);

  const cargarDatosLikes = async (videoId) => {
    try {
      const { count, error: countError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);

      if (countError) throw countError;
      setLikesContador(count || 0);

      const { data: yaLikeado, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', usuario.id);

      if (checkError) throw checkError;
      setUsuarioDioLike(yaLikeado && yaLikeado.length > 0);
    } catch (err) {
      console.error("Error al cargar estadisticas de likes:", err);
    }
  };

  const cargarComentarios = async (videoId) => {
    try {
      const { data, error } = await supabase
        .from('comentarios')
        .select('*')
        .eq('video_id', videoId)
        .order('creado_el', { ascending: true });

      if (error) throw error;
      setListaComentarios(data || []);
    } catch (err) {
      console.error("Error al cargar comentarios:", err.message);
    }
  };

  const manejarBotonLike = async () => {
    const videoActual = listaVideos[indiceActual];
    if (!videoActual || !usuario) return;

    try {
      if (usuarioDioLike) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('video_id', videoActual.id)
          .eq('user_id', usuario.id);

        if (error) throw error;
        setLikesContador(prev => Math.max(0, prev - 1));
        setUsuarioDioLike(false);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([{ video_id: videoActual.id, user_id: usuario.id }]);

        if (error) throw error;
        setLikesContador(prev => prev + 1);
        setUsuarioDioLike(true);

        setIntereses(prev => ({
          ...prev,
          [videoActual.categoria]: (prev[videoActual.categoria] || 0) + 15
        }));
      }
    } catch (err) {
      console.error("Error al procesar el like:", err.message);
    }
  };

  const procesarEnvioComentario = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim() || enviandoComentario) return;

    const videoActual = listaVideos[indiceActual];
    if (!videoActual || !usuario) return;

    try {
      setEnviandoComentario(true);
      const { data, error } = await supabase
        .from('comentarios')
        .insert([
          {
            video_id: videoActual.id,
            user_id: usuario.id,
            user_email: usuario.email,
            contenido: nuevoComentario.trim()
          }
        ])
        .select();

      if (error) throw error;

      if (data) {
        setListaComentarios(prev => [...prev, data[0]]);
      }
      setNuevoComentario('');
    } catch (err) {
      alert("No se pudo publicar tu comentario: " + err.message);
    } finally {
      setEnviandoComentario(false);
    }
  };

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
    if (tipo === 'camara') inputCamaraRef.current.click(); 
    else if (tipo === 'galeria') inputGaleriaRef.current.click(); 
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
    if (necesitaRecargar) window.location.reload();
    else if (videoRef.current && vistaActiva === 'feed' && listaVideos.length > 0) videoRef.current.play();
  };

  const manejarLogout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
  };

  const videosFiltrados = listaVideos.filter(vid => {
    const termino = terminoBusqueda.toLowerCase();
    return (
      vid.titulo?.toLowerCase().includes(termino) ||
      vid.categoria?.toLowerCase().includes(termino) ||
      vid.sub_categoria?.toLowerCase().includes(termino) ||
      vid.descripcion?.toLowerCase().includes(termino)
    );
  });

  if (errorApp) return <div style={{ color: 'red', padding: '20px' }}>Error: {errorApp}</div>;
  if (cargando) return <div style={{ color: '#00ffcc', textAlign: 'center', marginTop: '20vh', fontFamily: 'sans-serif' }}>Iniciando entorno Slik/Orbit...</div>;

  if (!usuario) return <Login alLoguearse={(user) => setUsuario(user)} />;

  const videoPrincipal = listaVideos[indiceActual] || null;
  const previewIzquierda = listaVideos[previewsFijas.izq] || null;
  const previewDerecha = listaVideos[previewsFijas.der] || null;

  return (
    <div className="contenedor-tiktok" style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Botón flotante Logout */}
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

      {/* RENDERIZADO DE VISTAS */}
      {vistaActiva === 'feed' && (
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

              {/* Altura de video calculada y centrada (objectFit contain) */}
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
                style={{
                  width: '100%',
                  height: 'calc(100vh - 65px)',
                  objectFit: 'contain',
                  backgroundColor: '#000'
                }}
              />

              {/* BOTONERA FLOTANTE DE INTERACCIÓN (CORAZÓN ME GUSTA ACTIVO) */}
              <div style={{
                position: 'absolute', right: '15px', bottom: '160px', zIndex: 50,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'
              }}>
                {/* Botón de Like - 100% FUNCIONAL */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={manejarBotonLike}
                    style={{
                      width: '46px', height: '46px', borderRadius: '50%', border: 'none',
                      backgroundColor: 'rgba(0,0,0,0.6)', color: usuarioDioLike ? '#ff0055' : '#ffffff',
                      fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', transition: 'transform 0.2s ease',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      transform: usuarioDioLike ? 'scale(1.15)' : 'scale(1)'
                    }}
                  >
                    ❤️
                  </button>
                  <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 'bold', textShadow: '1px 1px 2px #000', fontFamily: 'sans-serif' }}>
                    {likesContador}
                  </span>
                </div>
              </div>

              {/* Previews ajustadas arriba de la barra inferior para estar 100% visibles */}
              <div className="barra-previews" style={{ bottom: '75px', zIndex: 60 }}>
                {previewIzquierda && (
                  <div className="tarjeta-preview" onClick={() => elegirManual(previewsFijas.izq, previewIzquierda.categoria)}>
                    <span className="badge-categoria">{previewIzquierda.categoria}</span>
                    <video className="video-thumbnail" src={`${previewIzquierda.url_video}#t=0.5`} muted playsInline preload="metadata" />
                  </div>
                )}

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
      )}

      {vistaActiva === 'descubrir' && (
        <div style={{ padding: '20px', paddingTop: '60px', paddingBottom: '90px', fontFamily: 'sans-serif', color: '#fff', overflowY: 'auto', height: 'calc(100vh - 150px)' }}>
          <h2 style={{ color: '#00ffcc', fontSize: '22px', marginBottom: '15px' }}>Descubrir Contenido 🔍</h2>
          
          <input 
            type="text"
            placeholder="Buscar por título, categoría o tipo..."
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            style={{
              width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #333',
              backgroundColor: '#161616', color: '#fff', fontSize: '15px', marginBottom: '20px',
              boxSizing: 'border-box', outline: 'none'
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {videosFiltrados.map((vid) => {
              const indiceAbsoluto = listaVideos.findIndex(v => v.id === vid.id);
              return (
                <div 
                  key={vid.id}
                  onClick={() => {
                    setVistaActiva('feed');
                    setTimeout(() => cambiarVideo(indiceAbsoluto), 150);
                  }}
                  style={{
                    backgroundColor: '#121212', borderRadius: '10px', overflow: 'hidden',
                    border: '1px solid #222', cursor: 'pointer'
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '9/16', backgroundColor: '#000' }}>
                    <video src={`${vid.url_video}#t=0.5`} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#00ffcc', color: '#000', fontSize: '10px', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {vid.categoria}
                    </span>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vid.titulo}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>{vid.sub_categoria}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {videosFiltrados.length === 0 && (
            <p style={{ color: '#666', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>No encontramos videos que coincidan con tu búsqueda.</p>
          )}
        </div>
      )}

      {vistaActiva === 'mis-videos' && <MisVideos />}

      {/* MENÚ DE NAVEGACIÓN MÓVIL (65px) */}
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
            fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '18px' }}>🏠</span> Inicio
        </button>

        <button 
          onClick={() => {
            if (videoRef.current) videoRef.current.pause();
            setVistaActiva('descubrir');
          }}
          style={{
            background: 'none', border: 'none', color: vistaActiva === 'descubrir' ? '#00ffcc' : '#888888',
            fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '18px' }}>🔍</span> Descubrir
        </button>

        {vistaActiva !== 'feed' && (
          <button 
            onClick={() => setMostrarMenuOrigen(true)}
            style={{ 
              width: '42px', height: '42px', backgroundColor: '#00ffcc', color: '#000000',
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
            fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '18px' }}>🎬</span> Mis Videos
        </button>
      </div>

      {/* MODALS Y INPUTS */}
      {mostrarModal && <FormularioSubida archivo={archivoSeleccionado} alCerrar={manejarCierreModal} />}

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