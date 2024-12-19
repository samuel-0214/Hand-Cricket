import { Transaction } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';
import { ActionPostResponse } from '@solana/actions';
import { gameInstance } from '@/app/lib/game';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const playerMove = parseInt(url.searchParams.get('move') || '0');
  
  await request.json(); // Consume the body

  if (!sessionId || !gameInstance.getGame(sessionId)) {
    return Response.json(
      { error: { message: 'Invalid or expired game session.' } },
      { status: 400 }
    );
  }

  if (!playerMove || playerMove < 1 || playerMove > 6) {
    return Response.json(
      { error: { message: 'Invalid move. Please choose a number between 1 and 6.' } },
      { status: 400 }
    );
  }

  const gameState = gameInstance.getGame(sessionId)!;
  const computerMove = gameInstance.getComputerMove();
  let message = '';
  let nextAction = null;

  // Create transaction to record the move
  const transaction = new Transaction();
  transaction.add(
    createMemoInstruction(
      `Flashtap Hand Cricket Game ${sessionId}: Player played ${playerMove}, Computer played ${computerMove}`
    )
  );

  switch (gameState.gamePhase) {
    case 'player_batting':
      if (playerMove === computerMove) {
        message = `Out! Computer bowled ${computerMove}. Your final score: ${gameState.playerScore}.`;
        if (gameState.currentInnings === 1) {
          message += ` Computer needs ${gameState.playerScore + 1} runs to win!`;
          gameState.gamePhase = 'player_bowling';
          gameState.target = gameState.playerScore + 1;
          gameState.currentInnings = 2;
        } else {
          gameState.gamePhase = 'completed';
          const winner = gameState.playerScore > gameState.computerScore ? 'You won' : 
                        gameState.playerScore < gameState.computerScore ? 'Computer won' : 'It\'s a tie';
          message += ` Game Over! ${winner}! Final Scores - You: ${gameState.playerScore}, Computer: ${gameState.computerScore}`;
        }
      } else {
        gameState.playerScore += playerMove;
        message = `You scored ${playerMove} runs! Computer bowled ${computerMove}. Total: ${gameState.playerScore}`;
      }
      break;

    case 'player_bowling':
      if (playerMove === computerMove) {
        message = `Out! You bowled the computer out for ${gameState.computerScore} runs.`;
        if (gameState.currentInnings === 1) {
          message += ` Now you need ${gameState.computerScore + 1} runs to win!`;
          gameState.gamePhase = 'player_batting';
          gameState.target = gameState.computerScore + 1;
          gameState.currentInnings = 2;
        } else {
          gameState.gamePhase = 'completed';
          const winner = gameState.playerScore > gameState.computerScore ? 'You won' : 
                        gameState.playerScore < gameState.computerScore ? 'Computer won' : 'It\'s a tie';
          message += ` Game Over! ${winner}! Final Scores - You: ${gameState.playerScore}, Computer: ${gameState.computerScore}`;
        }
      } else {
        gameState.computerScore += computerMove;
        if (gameState.target && gameState.computerScore >= gameState.target) {
          message = `Computer wins! They scored ${gameState.computerScore} and beat your target of ${gameState.target - 1}`;
          gameState.gamePhase = 'completed';
        } else {
          message = `Computer scored ${computerMove} runs. Computer's total: ${gameState.computerScore}`;
        }
      }
      break;
  }
  // Game logic remains the same
  gameInstance.updateGame(sessionId, gameState);

  if (gameState.gamePhase === 'completed') {
    nextAction = {
      type: "completed" as const,
      title: "Game Over!",
      icon: "https://flashtap.xyz/cricket-icon.svg",
      description: message,
      label: "Game Complete"
    };
    gameInstance.endGame(sessionId);
  }

  const responseBody: ActionPostResponse = {
    type: "transaction",
    transaction: Buffer.from(transaction.serialize()).toString('base64'),
    message,
    ...(nextAction && { links: { next: { type: "inline", action: nextAction } } })
  };

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Action-Version, X-Blockchain-Ids',
    'X-Action-Version': '1',
    'X-Blockchain-Ids': 'solana-devnet'
  };
  

  return Response.json(responseBody, {status: 200, headers });
}