
export interface Player {
  id: string;
  name: string;
  cumulativeEarnings: number;
}

export interface GameConfig {
  winPrize: number;
  bonusBallPrize: number;
  knockInPrize: number;
  ballsPerTeam: number;
}

export interface TeamSelection {
  playerIds: string[];
  name: string;
}

export interface GameScore {
  bonusBallsIn: number; // 0, 1, or 2
  opponentBallsKnockedIn: number;
  isMainWinner: boolean;
}

export interface GameResult {
  timestamp: number;
  config: GameConfig;
  teamA: {
    players: string[];
    score: GameScore;
    earnings: number;
  };
  teamB: {
    players: string[];
    score: GameScore;
    earnings: number;
  };
}
