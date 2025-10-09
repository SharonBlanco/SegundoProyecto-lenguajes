import { useState } from "react";

interface MainMenuProps {
  onSelectGame: (game: 'wordsearch' | 'hangman') => void;
}

export default function MainMenu({ onSelectGame }: MainMenuProps) {
  const [selectedOption, setSelectedOption] = useState<'wordsearch' | 'hangman' | null>(null);

  return (
    <div className="retro-bg">
      <div className="retro-container">
        {/* Título principal estilo retro */}
        <div className="retro-title-section">
          <h1 className="retro-title">
            🎮 ARCADE GAMES
          </h1>
          <p className="retro-subtitle">
            Elige tu juego favorito
          </p>
        </div>

        {/* Opciones de juego estilo retro */}
        <div className="retro-options">
          {/* Sopa de Letras */}
          <div 
            className={`retro-option ${selectedOption === 'wordsearch' ? 'selected' : ''}`}
            onClick={() => {
              setSelectedOption('wordsearch');
              setTimeout(() => onSelectGame('wordsearch'), 300);
            }}
          >
            <div className="retro-icon">🧩</div>
            <div className="retro-pointer">►</div>
            <div className="retro-option-text">SOPA DE LETRAS</div>
          </div>

          {/* Ahorcado */}
          <div 
            className={`retro-option ${selectedOption === 'hangman' ? 'selected' : ''}`}
            onClick={() => {
              setSelectedOption('hangman');
              setTimeout(() => onSelectGame('hangman'), 300);
            }}
          >
            <div className="retro-icon">🎯</div>
            <div className="retro-pointer">►</div>
            <div className="retro-option-text">AHORCADO</div>
          </div>
        </div>

        {/* Elementos decorativos */}
        <div className="retro-decorations">
          <div className="retro-decoration left">🔤</div>
          <div className="retro-decoration right">🎲</div>
          <div className="retro-decoration top-left">📝</div>
          <div className="retro-decoration top-right">🎨</div>
          <div className="retro-decoration bottom-left">⭐</div>
          <div className="retro-decoration bottom-right">✨</div>
        </div>

        {/* Footer */}
        <div className="retro-footer">
          
        </div>
      </div>
    </div>
  );
}
