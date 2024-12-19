import { NextRequest, NextResponse } from 'next/server';
import { gameInstance } from '@/app/lib/game';
import { v4 as uuidv4 } from 'uuid';
import { ActionGetResponse } from '@solana/actions';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let sessionId = searchParams.get('sessionId');
  let gameState;

  if (!sessionId) {
    sessionId = uuidv4();
    gameState = gameInstance.createGame(sessionId);
  } else {
    gameState = gameInstance.getGame(sessionId);
    if (!gameState) {
      sessionId = uuidv4();
      gameState = gameInstance.createGame(sessionId);
    }
  }

  let description;
  switch (gameState.gamePhase) {
    case 'player_batting':
      description = `Innings ${gameState.currentInnings}: You're batting! Current score: ${gameState.playerScore}`;
      break;
    case 'computer_batting':
      description = `Innings ${gameState.currentInnings}: Computer is batting! Computer's score: ${gameState.computerScore}. Target: ${gameState.target}`;
      break;
    case 'player_bowling':
      description = `Innings ${gameState.currentInnings}: You're bowling! Computer's score: ${gameState.computerScore}. Target: ${gameState.target}`;
      break;
    case 'computer_bowling':
      description = `Innings ${gameState.currentInnings}: Computer is bowling! Your score: ${gameState.playerScore}`;
      break;
    case 'completed':
      const winner = gameState.playerScore > gameState.computerScore ? 'You won' : 
                    gameState.playerScore < gameState.computerScore ? 'Computer won' : 'It\'s a tie';
      description = `Game Over! ${winner}! Final Scores - You: ${gameState.playerScore}, Computer: ${gameState.computerScore}`;
      break;
  }

  const metadata: ActionGetResponse = {
    type: "action" as const,
    title: "Flashtap Hand Cricket",
    icon: "flash-rap logo.jpg",
    description,
    label: gameState.gamePhase.includes('batting') ? "Bat" : "Bowl",
    links: {
      actions: Array.from({ length: 6 }, (_, i) => ({
        type: "transaction" as const,  // Added this line
        label: `Play ${i + 1}`,
        href: `/api/hand-cricket/play?sessionId=${sessionId}&move=${i + 1}`,
      }))
    }
  };

  return NextResponse.json(metadata);
}