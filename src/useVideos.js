import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

/**
 * Hook personalizado que centraliza toda la lógica de estado,
 * autenticación y sincronización con la base de datos de Supabase.
 */
export function useVideos() {
  const [sesion, setSesion] = useState(null);
  const [listaVideos, setListaVideos] = useState([]);
  const [indiceVideoActual, setIndiceVideoActual] = useState(0);
  const [usuarioDioLike, setUsuarioDioLike] = useState(false);
  const [likesContador, setLikesContador] = useState(0);

  // Categorías fijas configuradas para las secciones laterales del feed
  const previewsFijas = { izq: 'Fútbol', der: 'Tecnología' };

  // 1. Escuchar el estado de la sesión del usuario
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });

    descargarVideosGlobales();

    return () => subscription.unsubscribe();
  }, []);

  // 2. Actualizar contadores cada vez que cambia el video actual
  useEffect(() => {
    if (listaVideos.length > 0) {
      verificarLikeUsuario();
      contarLikesTotales();
    }
  }, [indiceVideoActual, listaVideos]);

  // Trae los videos más recientes de la base de datos
  async function descargarVideosGlobales() {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListaVideos(data || []);
    } catch (err) {
      console.error("Error al descargar videos:", err.message);
    }
  }

  // Verifica si el usuario autenticado le dio like al video en pantalla
  async function verificarLikeUsuario() {
    if (!sesion || listaVideos.length === 0) return;
    const videoId = listaVideos[indiceVideoActual]?.id;
    if (!videoId) return;

    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('video_id', videoId)
      .eq('user_id', sesion.user.id);

    setUsuarioDioLike(!error && data && data.length > 0);
  }

  // Cuenta los likes totales del video actual
  async function contarLikesTotales() {
    if (listaVideos.length === 0) return;
    const videoId = listaVideos[indiceVideoActual]?.id;
    if (!videoId) return;

    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);

    setLikesContador(error ? 0 : count || 0);
  }

  // Inserta o remueve el like en Supabase (Toggle)
  async function manejarBotonLike() {
    if (!sesion || listaVideos.length === 0) return;
    const videoId = listaVideos[indiceVideoActual]?.id;
    if (!videoId) return;

    if (usuarioDioLike) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', sesion.user.id);

      if (!error) {
        setUsuarioDioLike(false);
        setLikesContador(prev => Math.max(0, prev - 1));
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert([{ video_id: videoId, user_id: sesion.user.id }]);

      if (!error) {
        setUsuarioDioLike(true);
        setLikesContador(prev => prev + 1);
      }
    }
  }

  // Cambiar manualmente de video reseteando barras de carga
  function cambiarVideo(nuevoIndice) {
    if (nuevoIndice >= 0 && nuevoIndice < listaVideos.length) {
      setIndiceVideoActual(nuevoIndice);
    }
  }

  // Avanza al siguiente video de forma circular
  function alTerminarVideoCompleto() {
    if (listaVideos.length > 1) {
      setIndiceVideoActual(prev => (prev + 1) % listaVideos.length);
    }
  }

  // Lógica de navegación mediante los thumbnails inferiores
  function elegirManual(categoriaFija, categoriaActual) {
    if (categoriaFija === categoriaActual) {
      alTerminarVideoCompleto();
      return;
    }
    const idx = listaVideos.findIndex(v => v.categoria?.toLowerCase() === categoriaFija.toLowerCase());
    if (idx !== -1) {
      cambiarVideo(idx);
    } else {
      alTerminarVideoCompleto();
    }
  }

  const videoPrincipal = listaVideos[indiceVideoActual];

  // Helper para buscar previews basados en categorías favoritas
  const obtenerPreviewPorCategoria = (cat) => {
    return listaVideos.find(v => v.categoria?.toLowerCase() === cat.toLowerCase()) || listaVideos[(indiceVideoActual + 1) % listaVideos.length];
  };

  const previewIzquierda = listaVideos.length > 0 ? obtenerPreviewPorCategoria(previewsFijas.izq) : null;
  const previewDerecha = listaVideos.length > 0 ? obtenerPreviewPorCategoria(previewsFijas.der) : null;

  return {
    sesion,
    listaVideos,
    videoPrincipal,
    indiceVideoActual,
    usuarioDioLike,
    likesContador,
    previewIzquierda,
    previewDerecha,
    previewsFijas,
    descargarVideosGlobales,
    manejarBotonLike,
    cambiarVideo,
    alTerminarVideoCompleto,
    elegirManual
  };
}