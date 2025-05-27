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
      
      // Load players and theme
      await Promise.all([
        loadPlayers(),
        loadDailyTheme()
      ]);
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      const response = await axios.get(`${API}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const loadDailyTheme = async () => {
    try {
      const response = await axios.get(`${API}/themes/daily`);
      setCurrentTheme(response.data);
    } catch (error) {
      console.error('Error loading daily theme:', error);
    }
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
        <div className="theme-info">
          {currentTheme && (
            <div className="daily-theme">
              <h2>{currentTheme.name}</h2>
              <p>{currentTheme.description}</p>
            </div>
          )}
        </div>
      </header>

      <div className="main-content">
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
          <h3>Jugadores Disponibles ({availablePlayers.length})</h3>
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
      </div>

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