return (
    <div className="contenedor-tiktok" style={{ 
      height: '100vh', 
      width: '100vw',
      overflow: 'hidden', 
      position: 'relative', 
      backgroundColor: '#000'
    }}>
      {/* Botón flotante Logout (zIndex alto para estar sobre el video) */}
      <button 
        onClick={manejarLogout}
        style={{
          position: 'absolute', top: '15px', right: '15px', zIndex: 80,
          backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.2)', padding: '6px 12px',
          borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold',
          backdropFilter: 'blur(5px)'
        }}
      >
        🚪 Salir
      </button>

      {/* RENDERIZADO DE VISTAS */}
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {vistaActiva === 'feed' && (
          <>
            {!videoPrincipal ? (
              <div style={{ 
                color: '#888', textAlign: 'center', paddingTop: '35vh', 
                paddingLeft: '20px', paddingRight: '20px', fontFamily: 'sans-serif', zIndex: 20, position: 'relative'
              }}>
                <p style={{ color: '#00ffcc', fontSize: '18px', fontWeight: 'bold' }}>✨ ¡Plataforma lista!</p>
                <p style={{ fontSize: '14px', lineHeight: '1.5' }}>Todavía no hay videos globales en la base de datos.<br />Tocá el botón <b>+</b> para subir el primero.</p>
              </div>
            ) : (
              <>
                <div className="contenedor-linea-tiempo" style={{ zIndex: 75 }}>
                  <div className="linea-progreso" style={{ width: `${progreso}%` }}></div>
                </div>

                {/* VIDEO PRINCIPAL: AHORA SÍ, 100% PANTALLA COMPLETA REAL SIN BORDES */}
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
                    // ESTOS SON LOS CAMBIOS CRÍTICOS PARA EL FULL SCREEN
                    width: '100vw',      // Ocupa el 100% del ancho de la ventana
                    height: '100vh',     // Ocupa el 100% del alto de la ventana
                    objectFit: 'cover',   // Cubre todo el espacio, recortando si es necesario para evitar bordes negros
                    position: 'absolute', // Se posiciona respecto al contenedor padre
                    top: 0,               // Pegado arriba
                    left: 0,              // Pegado a la izquierda
                    zIndex: 10,           // Capa base del feed
                    backgroundColor: '#000' // Fondo negro por si acaso durante la carga
                  }}
                />

                {/* BOTONERA FLOTANTE DE INTERACCIÓN (LIKE) (zIndex sobre el video) */}
                <div style={{
                  position: 'absolute', right: '15px', bottom: '280px', zIndex: 70,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={manejarBotonLike}
                      style={{
                        width: '50px', height: '50px', borderRadius: '50%', border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.6)', color: usuarioDioLike ? '#ff0055' : '#ffffff',
                        fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', transition: 'transform 0.2s ease',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                        transform: usuarioDioLike ? 'scale(1.15)' : 'scale(1)'
                      }}
                    >
                      ❤️
                    </button>
                    <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold', textShadow: '2px 2px 4px #000', fontFamily: 'sans-serif' }}>
                      {likesContador}
                    </span>
                  </div>
                </div>

                {/* CONTENEDOR INTEGRADO EN LA BASE (zIndex sobre el video) */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  zIndex: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0))', // Degradado para legibilidad
                  paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
                  boxSizing: 'border-box'
                }}>
                  
                  {/* BARRA DE PREVIEWS (Interna en el flujo vertical de abajo) */}
                  <div className="barra-previews" style={{ 
                    position: 'relative', 
                    bottom: '0', 
                    width: '100%',
                    height: '90px', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    padding: '0 10px',
                    boxSizing: 'border-box',
                    marginBottom: '5px'
                  }}>
                    {previewIzquierda && (
                      <div className="tarjeta-preview" onClick={() => elegirManual(previewsFijas.izq, previewIzquierda.categoria)} style={{ margin: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <span className="badge-categoria">{previewIzquierda.categoria}</span>
                        <video className="video-thumbnail" src={`${previewIzquierda.url_video}#t=0.5`} muted playsInline preload="metadata" />
                      </div>
                    )}

                    {/* Botón Central Más (+) */}
                    <div style={{ width: '56px', height: '56px', zIndex: 65, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (videoRef.current) videoRef.current.pause();
                          setMostrarMenuOrigen(true);
                        }}
                        style={{ 
                          width: '52px', height: '52px', backgroundColor: '#00ffcc', color: '#000000',
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '28px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0, 255, 204, 0.6)', 
                          border: 'none', cursor: 'pointer'
                        }}
                      >
                        +
                      </button>
                    </div>

                    {previewDerecha && (
                      <div className="tarjeta-preview" onClick={() => elegirManual(previewsFijas.der, previewDerecha.categoria)} style={{ margin: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <span className="badge-categoria">{previewDerecha.categoria}</span>
                        <video className="video-thumbnail" src={`${previewDerecha.url_video}#t=0.5`} muted playsInline preload="metadata" />
                      </div>
                    )}
                  </div>

                  {/* MENÚ DE BOTONES DE INICIO, DESCUBRIR Y MIS VIDEOS */}
                  <div style={{
                    width: '100%', height: '65px',
                    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                    boxSizing: 'border-box'
                  }}>
                    <button 
                      onClick={() => {
                        setVistaActiva('feed');
                        setTimeout(() => { if (videoRef.current && listaVideos.length > 0) videoRef.current.play(); }, 100);
                      }}
                      style={{
                        background: 'none', border: 'none', color: vistaActiva === 'feed' ? '#00ffcc' : '#ffffff',
                        opacity: vistaActiva === 'feed' ? 1 : 0.6, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
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
                        background: 'none', border: 'none', color: vistaActiva === 'descubrir' ? '#00ffcc' : '#ffffff',
                        opacity: vistaActiva === 'descubrir' ? 1 : 0.6, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>🔍</span> Descubrir
                    </button>

                    {vistaActiva !== 'feed' && (
                      <button 
                        onClick={() => setMostrarMenuOrigen(true)}
                        style={{ 
                          width: '40px', height: '40px', backgroundColor: '#00ffcc', color: '#000000',
                          borderRadius: '50%', border: 'none', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer',
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
                        background: 'none', border: 'none', color: vistaActiva === 'mis-videos' ? '#00ffcc' : '#ffffff',
                        opacity: vistaActiva === 'mis-videos' ? 1 : 0.6, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>🎬</span> Mis Videos
                    </button>
                  </div>

                </div>
              </>
            )}
          </>
        )}

        {/* Las vistas de Descubrir y Mis Videos mantienen su fondo negro y zIndex para tapar el video del feed */}
        {vistaActiva === 'descubrir' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% - 75px)', padding: '20px', paddingTop: '60px', fontFamily: 'sans-serif', color: '#fff', overflowY: 'auto', zIndex: 20, backgroundColor: '#000' }}>
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

        {vistaActiva === 'mis-videos' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% - 75px)', overflowY: 'auto', zIndex: 20, backgroundColor: '#000' }}>
            <MisVideos />
          </div>
        )}
      </div>

      {/* MODALS Y INPUTS (zIndex muy alto) */}
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