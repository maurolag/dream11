import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Formation templates
const FORMATIONS = {
  "4-3-3": {
    name: "4-3-3",
    positions: {
      GK: { x: 50, y: 90, label: "GK" },
      CB1: { x: 35, y: 75, label: "CB" },
      CB2: { x: 65, y: 75, label: "CB" },
      LB: { x: 15, y: 70, label: "LB" },
      RB: { x: 85, y: 70, label: "RB" },
      CM1: { x: 30, y: 50, label: "CM" },
      CM2: { x: 50, y: 55, label: "CM" },
      CM3: { x: 70, y: 50, label: "CM" },
      LW: { x: 20, y: 25, label: "LW" },
      RW: { x: 80, y: 25, label: "RW" },
      ST: { x: 50, y: 15, label: "ST" }
    }
  },
  "4-4-2": {
    name: "4-4-2",
    positions: {
      GK: { x: 50, y: 90, label: "GK" },
      CB1: { x: 35, y: 75, label: "CB" },
      CB2: { x: 65, y: 75, label: "CB" },
      LB: { x: 15, y: 70, label: "LB" },
      RB: { x: 85, y: 70, label: "RB" },
      LM: { x: 15, y: 45, label: "LM" },
      CM1: { x: 40, y: 50, label: "CM" },
      CM2: { x: 60, y: 50, label: "CM" },
      RM: { x: 85, y: 45, label: "RM" },
      ST1: { x: 40, y: 20, label: "ST" },
      ST2: { x: 60, y: 20, label: "ST" }
    }
  }
};

const PlayerCard = ({ player, isDragging, onDragStart, isInFormation }) => {
  return (
    <div
      className={`player-card ${isDragging ? 'dragging' : ''} ${isInFormation ? 'in-formation' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, player)}
    >
      <div className="player-image">
        <img src={player.image_url} alt={player.name} />
      </div>
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-details">
          <span className="position">{player.position}</span>
          <span className="rating">{player.rating}</span>
        </div>
        <div className="player-club">{player.club}</div>
      </div>
    </div>
  );
};

const PositionSlot = ({ position, positionData, assignedPlayer, onDrop, onRemovePlayer }) => {
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    onDrop(e, position);
  };

  return (
    <div
      className={`position-slot ${assignedPlayer ? 'occupied' : 'empty'}`}
      style={{
        left: `${positionData.x}%`,
        top: `${positionData.y}%`
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {assignedPlayer ? (
        <div className="position-player">
          <img src={assignedPlayer.image_url} alt={assignedPlayer.name} />
          <div className="position-player-name">{assignedPlayer.name}</div>
          <button 
            className="remove-player"
            onClick={() => onRemovePlayer(position)}
          >
            ×
          </button>
        </div>
      ) : (
        <div className="empty-position">
          <span>{positionData.label}</span>
        </div>
      )}
    </div>
  );
};

const FootballField = ({ formation, assignedPlayers, onDrop, onRemovePlayer }) => {
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="football-field" onDragOver={handleDragOver}>
      <div className="field-background">
        <div className="center-circle"></div>
        <div className="penalty-area penalty-area-top"></div>
        <div className="penalty-area penalty-area-bottom"></div>
        <div className="goal-area goal-area-top"></div>
        <div className="goal-area goal-area-bottom"></div>
        <div className="center-line"></div>
      </div>
      
      {Object.entries(formation.positions).map(([position, positionData]) => (
        <PositionSlot
          key={position}
          position={position}
          positionData={positionData}
          assignedPlayer={assignedPlayers[position]}
          onDrop={onDrop}
          onRemovePlayer={onRemovePlayer}
        />
      ))}
    </div>
  );
};

const App = () => {
  const [players, setPlayers] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [currentTheme, setCurrentTheme] = useState(null);
  const [availableThemes, setAvailableThemes] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState("4-3-3");
  const [assignedPlayers, setAssignedPlayers] = useState({});
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [playerFilters, setPlayerFilters] = useState({
    position: '',
    club: '',
    era: '',
    minRating: 0
  });
  const [savedFormations, setSavedFormations] = useState([]);
  const [currentView, setCurrentView] = useState('builder'); // 'builder', 'rankings', 'themes'

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize sample data
      await axios.post(`${API}/init-data`);
      
      // Load players, themes, and formations
      await Promise.all([
        loadPlayers(),
        loadThemes(),
        loadFormations(),
        loadDailyTheme()
      ]);
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.position) params.append('position', filters.position);
      if (filters.club) params.append('club', filters.club);
      if (filters.era) params.append('era', filters.era);
      
      const response = await axios.get(`${API}/players?${params.toString()}`);
      const allPlayersData = response.data;
      
      // Apply rating filter on frontend
      const filteredPlayers = allPlayersData.filter(player => 
        player.rating >= (filters.minRating || 0)
      );
      
      setAllPlayers(allPlayersData);
      setPlayers(filteredPlayers);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const loadThemes = async () => {
    try {
      const response = await axios.get(`${API}/themes`);
      setAvailableThemes(response.data);
    } catch (error) {
      console.error('Error loading themes:', error);
    }
  };

  const loadFormations = async (theme = null) => {
    try {
      const params = theme ? `?theme=${encodeURIComponent(theme)}` : '';
      const response = await axios.get(`${API}/formations${params}`);
      setSavedFormations(response.data);
    } catch (error) {
      console.error('Error loading formations:', error);
    }
  };

  const loadDailyTheme = async () => {
    try {
      const response = await axios.get(`${API}/themes/daily`);
      setCurrentTheme(response.data);
      // Apply theme filters if any
      if (response.data.filter_criteria) {
        applyThemeFilters(response.data.filter_criteria);
      }
    } catch (error) {
      console.error('Error loading daily theme:', error);
    }
  };

  const applyThemeFilters = (criteria) => {
    const filters = { ...playerFilters };
    if (criteria.club) filters.club = criteria.club;
    if (criteria.country) filters.country = criteria.country;
    if (criteria.era) filters.era = criteria.era;
    if (criteria.position) filters.position = criteria.position;
    
    setPlayerFilters(filters);
    loadPlayers(filters);
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...playerFilters, [filterType]: value };
    setPlayerFilters(newFilters);
    loadPlayers(newFilters);
  };

  const selectTheme = async (theme) => {
    setCurrentTheme(theme);
    setShowThemeSelector(false);
    
    // Apply theme filters
    if (theme.filter_criteria) {
      applyThemeFilters(theme.filter_criteria);
    } else {
      // Reset filters if no criteria
      const resetFilters = { position: '', club: '', era: '', minRating: 0 };
      setPlayerFilters(resetFilters);
      loadPlayers(resetFilters);
    }
    
    // Load formations for this theme
    loadFormations(theme.name);
  };

  const voteForFormation = async (formationId) => {
    try {
      await axios.put(`${API}/formations/${formationId}/vote`);
      // Reload formations to see updated votes
      loadFormations(currentTheme?.name);
    } catch (error) {
      console.error('Error voting for formation:', error);
      alert('Error al votar');
    }
  };

  const shareFormation = (formation) => {
    const text = `¡Mira mi Once Ideal! ${formation.formation_name} - Tema: ${formation.theme}`;
    const url = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: 'Mi Once Ideal',
        text: text,
        url: url
      });
    } else {
      // Fallback to copy to clipboard
      navigator.clipboard.writeText(`${text} ${url}`);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  const clearFormation = () => {
    setAssignedPlayers({});
  };

  const randomizeFormation = () => {
    const availablePositions = Object.keys(FORMATIONS[selectedFormation].positions);
    const newAssignment = {};
    const usedPlayers = new Set();
    
    availablePositions.forEach(position => {
      const positionType = position.includes('GK') ? 'GK' : 
                          position.includes('CB') || position.includes('LB') || position.includes('RB') ? 'CB' :
                          position.includes('CM') || position.includes('DM') || position.includes('AM') ? 'CM' :
                          'ST'; // Default for attackers
      
      const compatiblePlayers = players.filter(player => 
        (player.position === positionType || 
         (positionType === 'CB' && ['CB', 'LB', 'RB'].includes(player.position)) ||
         (positionType === 'CM' && ['CM', 'DM', 'AM'].includes(player.position)) ||
         (positionType === 'ST' && ['ST', 'LW', 'RW'].includes(player.position))) &&
        !usedPlayers.has(player.id)
      );
      
      if (compatiblePlayers.length > 0) {
        const randomPlayer = compatiblePlayers[Math.floor(Math.random() * compatiblePlayers.length)];
        newAssignment[position] = randomPlayer;
        usedPlayers.add(randomPlayer.id);
      }
    });
    
    setAssignedPlayers(newAssignment);
  };

  const handleDragStart = (e, player) => {
    setDraggedPlayer(player);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, position) => {
    e.preventDefault();
    if (draggedPlayer) {
      // Check if player is already assigned to another position
      const currentPosition = Object.keys(assignedPlayers).find(
        pos => assignedPlayers[pos]?.id === draggedPlayer.id
      );
      
      if (currentPosition) {
        // Remove from current position
        const newAssignedPlayers = { ...assignedPlayers };
        delete newAssignedPlayers[currentPosition];
        setAssignedPlayers(newAssignedPlayers);
      }
      
      // Assign to new position
      setAssignedPlayers(prev => ({
        ...prev,
        [position]: draggedPlayer
      }));
      
      setDraggedPlayer(null);
    }
  };

  const handleRemovePlayer = (position) => {
    setAssignedPlayers(prev => {
      const newState = { ...prev };
      delete newState[position];
      return newState;
    });
  };

  const saveFormation = async () => {
    if (!userName.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    const formationPlayers = Object.entries(assignedPlayers).map(([position, player]) => ({
      player_id: player.id,
      position_slot: position
    }));

    try {
      await axios.post(`${API}/formations`, {
        user_name: userName,
        formation_name: selectedFormation,
        theme: currentTheme?.name || 'General',
        players: formationPlayers
      });
      
      alert('¡Formación guardada exitosamente!');
      setShowSaveModal(false);
      setUserName('');
      // Reload formations to show the new one
      loadFormations(currentTheme?.name);
    } catch (error) {
      console.error('Error saving formation:', error);
      alert('Error al guardar la formación');
    }
  };

  const getAssignedPlayerIds = () => {
    return Object.values(assignedPlayers).map(player => player.id);
  };

  const availablePlayers = players.filter(player => 
    !getAssignedPlayerIds().includes(player.id)
  );

  const getUniqueValues = (field) => {
    return [...new Set(allPlayers.map(player => player[field]))].filter(Boolean);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="football-icon">⚽</div>
          <h2>Cargando Once Ideal...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚽ Once Ideal</h1>
        
        <nav className="main-nav">
          <button 
            className={currentView === 'builder' ? 'active' : ''}
            onClick={() => setCurrentView('builder')}
          >
            🏗️ Crear Equipo
          </button>
          <button 
            className={currentView === 'rankings' ? 'active' : ''}
            onClick={() => { setCurrentView('rankings'); loadFormations(); }}
          >
            🏆 Rankings
          </button>
          <button 
            className={currentView === 'themes' ? 'active' : ''}
            onClick={() => setCurrentView('themes')}
          >
            🎯 Temas
          </button>
        </nav>

        {currentView === 'builder' && currentTheme && (
          <div className="theme-info">
            <div className="daily-theme">
              <h2>{currentTheme.name}</h2>
              <p>{currentTheme.description}</p>
              <button 
                className="change-theme-btn"
                onClick={() => setShowThemeSelector(true)}
              >
                🔄 Cambiar Tema
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="main-content">
        {currentView === 'builder' && (
          <>
            <div className="formation-section">
              <div className="formation-controls">
                <label>Formación:</label>
                <select 
                  value={selectedFormation} 
                  onChange={(e) => setSelectedFormation(e.target.value)}
                >
                  {Object.keys(FORMATIONS).map(formation => (
                    <option key={formation} value={formation}>
                      {formation}
                    </option>
                  ))}
                </select>
                
                <button 
                  className="action-btn randomize-btn"
                  onClick={randomizeFormation}
                  title="Formar equipo aleatorio"
                >
                  🎲 Aleatorio
                </button>
                
                <button 
                  className="action-btn clear-btn"
                  onClick={clearFormation}
                  title="Limpiar formación"
                >
                  🗑️ Limpiar
                </button>
                
                <button 
                  className="save-btn"
                  onClick={() => setShowSaveModal(true)}
                  disabled={Object.keys(assignedPlayers).length === 0}
                >
                  💾 Guardar Formación
                </button>
              </div>

              <FootballField
                formation={FORMATIONS[selectedFormation]}
                assignedPlayers={assignedPlayers}
                onDrop={handleDrop}
                onRemovePlayer={handleRemovePlayer}
              />
            </div>

            <div className="players-section">
              <div className="players-header">
                <h3>Jugadores Disponibles ({availablePlayers.length})</h3>
                
                <div className="filters">
                  <select 
                    value={playerFilters.position} 
                    onChange={(e) => handleFilterChange('position', e.target.value)}
                  >
                    <option value="">Todas las posiciones</option>
                    {getUniqueValues('position').map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={playerFilters.club} 
                    onChange={(e) => handleFilterChange('club', e.target.value)}
                  >
                    <option value="">Todos los clubes</option>
                    {getUniqueValues('club').map(club => (
                      <option key={club} value={club}>{club}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={playerFilters.era} 
                    onChange={(e) => handleFilterChange('era', e.target.value)}
                  >
                    <option value="">Todas las épocas</option>
                    {getUniqueValues('era').map(era => (
                      <option key={era} value={era}>{era}</option>
                    ))}
                  </select>
                  
                  <div className="rating-filter">
                    <label>Rating mín: {playerFilters.minRating}</label>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={playerFilters.minRating}
                      onChange={(e) => handleFilterChange('minRating', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="players-grid">
                {availablePlayers.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isDragging={draggedPlayer?.id === player.id}
                    onDragStart={handleDragStart}
                    isInFormation={false}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {currentView === 'rankings' && (
          <div className="rankings-section">
            <h2>🏆 Rankings de Formaciones</h2>
            {currentTheme && (
              <p className="theme-context">Tema actual: {currentTheme.name}</p>
            )}
            
            <div className="formations-list">
              {savedFormations.length === 0 ? (
                <div className="no-formations">
                  <p>No hay formaciones guardadas para este tema</p>
                  <button onClick={() => setCurrentView('builder')}>
                    Crear la primera formación
                  </button>
                </div>
              ) : (
                savedFormations.map(formation => (
                  <div key={formation.id} className="formation-card">
                    <div className="formation-header">
                      <h3>{formation.formation_name}</h3>
                      <span className="user-name">por {formation.user_name}</span>
                      <div className="votes">
                        <button 
                          className="vote-btn"
                          onClick={() => voteForFormation(formation.id)}
                        >
                          👍 {formation.votes}
                        </button>
                        <button 
                          className="share-btn"
                          onClick={() => shareFormation(formation)}
                        >
                          📤 Compartir
                        </button>
                      </div>
                    </div>
                    <div className="formation-players">
                      <p>Jugadores: {formation.players.length}/11</p>
                      <small>Tema: {formation.theme}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {currentView === 'themes' && (
          <div className="themes-section">
            <h2>🎯 Temas Disponibles</h2>
            <div className="themes-grid">
              {availableThemes.map(theme => (
                <div key={theme.id} className="theme-card">
                  <h3>{theme.name}</h3>
                  <p>{theme.description}</p>
                  {theme.is_daily && <span className="daily-badge">Tema del día</span>}
                  <button 
                    className="select-theme-btn"
                    onClick={() => {
                      selectTheme(theme);
                      setCurrentView('builder');
                    }}
                  >
                    Seleccionar Tema
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Theme Selector Modal */}
      {showThemeSelector && (
        <div className="modal-overlay">
          <div className="modal theme-selector-modal">
            <h3>Seleccionar Tema</h3>
            <div className="themes-list">
              {availableThemes.map(theme => (
                <div key={theme.id} className="theme-option" onClick={() => selectTheme(theme)}>
                  <div className="theme-name">{theme.name}</div>
                  <div className="theme-description">{theme.description}</div>
                  {theme.is_daily && <span className="daily-badge">Tema del día</span>}
                </div>
              ))}
            </div>
            <button onClick={() => setShowThemeSelector(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Save Formation Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Guardar Formación</h3>
            <input
              type="text"
              placeholder="Ingresa tu nombre"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={() => setShowSaveModal(false)}>Cancelar</button>
              <button onClick={saveFormation} className="primary">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;