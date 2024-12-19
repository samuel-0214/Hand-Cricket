interface GameState {
    playerScore: number;
    computerScore: number;
    gamePhase: 'player_batting' | 'player_bowling' | 'computer_batting' | 'computer_bowling' | 'completed';
    currentInnings: number;
    target?: number;
  }
  
  export class HandCricketGame {
    private games: Map<string, GameState>;
  
    constructor() {
      this.games = new Map();
    }
  
    createGame(sessionId: string): GameState {
      const newGame = {
        playerScore: 0,
        computerScore: 0,
        gamePhase: 'player_batting' as const,
        currentInnings: 1
      };
      this.games.set(sessionId, newGame);
      return newGame;
    }
  
    getGame(sessionId: string): GameState | undefined {
      return this.games.get(sessionId);
    }
  
    getComputerMove(): number {
      return Math.floor(Math.random() * 6) + 1;
    }
  
    updateGame(sessionId: string, newState: GameState) {
      this.games.set(sessionId, newState);
    }
  
    endGame(sessionId: string) {
      this.games.delete(sessionId);
    }
  }
  
  export const gameInstance = new HandCricketGame();