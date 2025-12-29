
import React, { useState, useEffect, useCallback } from 'react';
import { Player, GameConfig, GameResult, TeamSelection, GameScore } from './types';
import { Trophy, Settings, Users, History, Plus, Minus, Trash2, Save, Play, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'billiards_game_data';

const App: React.FC = () => {
  // --- State ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<GameResult[]>([]);
  const [config, setConfig] = useState<GameConfig>({
    winPrize: 100,
    bonusBallPrize: 50,
    knockInPrize: 20,
    ballsPerTeam: 5,
  });

  const [activeTab, setActiveTab] = useState<'game' | 'players' | 'history' | 'settings'>('game');

  // Game Setup State
  const [teamA, setTeamA] = useState<TeamSelection>({ name: '隊伍 A', playerIds: [] });
  const [teamB, setTeamB] = useState<TeamSelection>({ name: '隊伍 B', playerIds: [] });
  
  // Game Scoring State
  const [scoreA, setScoreA] = useState<GameScore>({ bonusBallsIn: 0, opponentBallsKnockedIn: 0, isMainWinner: false });
  const [scoreB, setScoreB] = useState<GameScore>({ bonusBallsIn: 0, opponentBallsKnockedIn: 0, isMainWinner: false });

  // --- Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.players) setPlayers(parsed.players);
        if (parsed.history) setHistory(parsed.history);
        if (parsed.config) setConfig(parsed.config);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
  }, []);

  const saveData = useCallback((newPlayers: Player[], newHistory: GameResult[], newConfig: GameConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      players: newPlayers,
      history: newHistory,
      config: newConfig,
    }));
  }, []);

  // --- Actions ---
  const addPlayer = (name: string) => {
    if (!name.trim()) return;
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      cumulativeEarnings: 0,
    };
    const updated = [...players, newPlayer];
    setPlayers(updated);
    saveData(updated, history, config);
  };

  const deletePlayer = (id: string) => {
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated);
    saveData(updated, history, config);
  };

  const calculateEarnings = (score: GameScore, currentConfig: GameConfig) => {
    let total = 0;
    if (score.isMainWinner) total += currentConfig.winPrize;
    
    // Bonus Balls: 1 = prize, 2 = prize * 3
    if (score.bonusBallsIn === 1) {
      total += currentConfig.bonusBallPrize;
    } else if (score.bonusBallsIn === 2) {
      total += currentConfig.bonusBallPrize * 3;
    }

    total += score.opponentBallsKnockedIn * currentConfig.knockInPrize;
    return total;
  };

  const submitGame = () => {
    if (teamA.playerIds.length === 0 || teamB.playerIds.length === 0) {
      alert("兩隊都必須有成員！");
      return;
    }

    const earningsA = calculateEarnings(scoreA, config);
    const earningsB = calculateEarnings(scoreB, config);

    const result: GameResult = {
      timestamp: Date.now(),
      config: { ...config },
      teamA: { players: [...teamA.playerIds], score: { ...scoreA }, earnings: earningsA },
      teamB: { players: [...teamB.playerIds], score: { ...scoreB }, earnings: earningsB },
    };

    // Update individual player totals
    const updatedPlayers = players.map(p => {
      let extra = 0;
      if (teamA.playerIds.includes(p.id)) {
        // Split team earnings among members? Or each gets full? 
        // User didn't specify, usually in such games each team member shares the pot or gets the full bonus.
        // Let's assume the prize is for the WHOLE TEAM to split equally.
        extra = earningsA / teamA.playerIds.length;
      } else if (teamB.playerIds.includes(p.id)) {
        extra = earningsB / teamB.playerIds.length;
      }
      return { ...p, cumulativeEarnings: p.cumulativeEarnings + extra };
    });

    const updatedHistory = [result, ...history];
    setPlayers(updatedPlayers);
    setHistory(updatedHistory);
    saveData(updatedPlayers, updatedHistory, config);

    // Reset scores for next game
    setScoreA({ bonusBallsIn: 0, opponentBallsKnockedIn: 0, isMainWinner: false });
    setScoreB({ bonusBallsIn: 0, opponentBallsKnockedIn: 0, isMainWinner: false });
    alert("結算完成！獎金已計入個人帳戶。");
  };

  const resetAllData = () => {
    if (window.confirm("確定要重設所有資料嗎？這將清除所有玩家餘額與歷史紀錄。")) {
      setPlayers([]);
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // --- Sub-components ---

  const PlayerManager = () => {
    const [nameInput, setNameInput] = useState('');
    return (
      <div className="space-y-6">
        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Plus size={20} /> 新增玩家
          </h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="玩家姓名..."
              className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button 
              onClick={() => { addPlayer(nameInput); setNameInput(''); }}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              新增
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {players.map(p => (
            <div key={p.id} className="bg-white/10 p-4 rounded-xl border border-white/10 flex justify-between items-center group">
              <div>
                <p className="text-white font-bold text-lg">{p.name}</p>
                <p className="text-emerald-300 font-mono">累積獎金: ${Math.round(p.cumulativeEarnings)}</p>
              </div>
              <button 
                onClick={() => deletePlayer(p.id)}
                className="text-red-400 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-400/20 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const GameSettings = () => (
    <div className="bg-white/10 p-6 rounded-2xl border border-white/20 space-y-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">遊戲規則設定</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-gray-300">獲勝獎金 (最靠近底部)</label>
          <input 
            type="number" 
            value={config.winPrize}
            onChange={(e) => setConfig({...config, winPrize: Number(e.target.value)})}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-400 outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Bonus 球獎金 (進一顆)</label>
          <input 
            type="number" 
            value={config.bonusBallPrize}
            onChange={(e) => setConfig({...config, bonusBallPrize: Number(e.target.value)})}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-400 outline-none"
          />
          <p className="text-xs text-emerald-400 italic">* 同隊進兩顆會自動變 3 倍 ($ {config.bonusBallPrize * 3})</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">進對方球獎金 (每顆)</label>
          <input 
            type="number" 
            value={config.knockInPrize}
            onChange={(e) => setConfig({...config, knockInPrize: Number(e.target.value)})}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-400 outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">每隊球數 (X)</label>
          <input 
            type="number" 
            value={config.ballsPerTeam}
            onChange={(e) => setConfig({...config, ballsPerTeam: Number(e.target.value)})}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-400 outline-none"
          />
        </div>
      </div>

      <div className="pt-4">
        <button 
          onClick={resetAllData}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors"
        >
          <RotateCcw size={16} /> 重設所有遊戲資料與餘額
        </button>
      </div>
    </div>
  );

  const GameInterface = () => {
    const togglePlayerInTeam = (playerId: string, team: 'A' | 'B') => {
      if (team === 'A') {
        const newIds = teamA.playerIds.includes(playerId) 
          ? teamA.playerIds.filter(id => id !== playerId)
          : [...teamA.playerIds, playerId];
        setTeamA({ ...teamA, playerIds: newIds });
        // Ensure player isn't in both teams
        if (!teamA.playerIds.includes(playerId)) setTeamB({ ...teamB, playerIds: teamB.playerIds.filter(id => id !== playerId) });
      } else {
        const newIds = teamB.playerIds.includes(playerId) 
          ? teamB.playerIds.filter(id => id !== playerId)
          : [...teamB.playerIds, playerId];
        setTeamB({ ...teamB, playerIds: newIds });
        if (!teamB.playerIds.includes(playerId)) setTeamA({ ...teamA, playerIds: teamA.playerIds.filter(id => id !== playerId) });
      }
    };

    return (
      <div className="space-y-8 pb-20">
        {/* Team Selection */}
        <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Users size={24} className="text-emerald-400" /> 選擇隊員
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {['A', 'B'].map((t) => {
              const currentTeam = t === 'A' ? teamA : teamB;
              return (
                <div key={t} className="space-y-4">
                  <div className={`p-4 rounded-xl border-2 ${t === 'A' ? 'border-blue-400/30 bg-blue-900/20' : 'border-red-400/30 bg-red-900/20'}`}>
                    <h4 className={`text-lg font-bold ${t === 'A' ? 'text-blue-300' : 'text-red-300'}`}>隊伍 {t}</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentTeam.playerIds.map(id => (
                        <span key={id} className="bg-white/20 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                          {players.find(p => p.id === id)?.name}
                          <button onClick={() => togglePlayerInTeam(id, t as 'A' | 'B')} className="hover:text-red-400">×</button>
                        </span>
                      ))}
                      {currentTeam.playerIds.length === 0 && <span className="text-white/40 italic text-sm">尚未選擇成員</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {players.map(p => {
                      const isSelected = currentTeam.playerIds.includes(p.id);
                      const isInOtherTeam = (t === 'A' ? teamB : teamA).playerIds.includes(p.id);
                      return (
                        <button 
                          key={p.id}
                          disabled={isInOtherTeam}
                          onClick={() => togglePlayerInTeam(p.id, t as 'A' | 'B')}
                          className={`px-3 py-2 rounded-lg text-sm transition-all border ${
                            isSelected 
                              ? (t === 'A' ? 'bg-blue-500 border-blue-400 text-white' : 'bg-red-500 border-red-400 text-white') 
                              : isInOtherTeam 
                                ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Scoring Panel */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { team: 'A', score: scoreA, setScore: setScoreA, color: 'blue' },
            { team: 'B', score: scoreB, setScore: setScoreB, color: 'red' }
          ].map(({ team, score, setScore, color }) => (
            <div key={team} className={`bg-white/10 p-6 rounded-2xl border-l-8 ${color === 'blue' ? 'border-blue-500' : 'border-red-500'}`}>
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-2xl font-bold text-white">隊伍 {team} 計分</h4>
                <button 
                  onClick={() => {
                    setScoreA({ ...scoreA, isMainWinner: team === 'A' });
                    setScoreB({ ...scoreB, isMainWinner: team === 'B' });
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
                    score.isMainWinner 
                      ? 'bg-yellow-400 text-black scale-110 shadow-lg shadow-yellow-400/20' 
                      : 'bg-white/5 text-white/50 border border-white/10'
                  }`}
                >
                  <Trophy size={18} /> {score.isMainWinner ? '本局勝者' : '設為勝者'}
                </button>
              </div>

              <div className="space-y-8">
                {/* Bonus Balls */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>進 Bonus 黑白球 (0-2)</span>
                    <span className="text-emerald-400 font-mono">+ ${
                      score.bonusBallsIn === 1 ? config.bonusBallPrize : score.bonusBallsIn === 2 ? config.bonusBallPrize * 3 : 0
                    }</span>
                  </div>
                  <div className="flex gap-4">
                    {[0, 1, 2].map(n => (
                      <button 
                        key={n}
                        onClick={() => setScore({ ...score, bonusBallsIn: n })}
                        className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                          score.bonusBallsIn === n 
                            ? 'bg-emerald-500 border-emerald-400 text-white' 
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                      >
                        {n} 顆
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opponent Balls */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>進對方球顆數 (Max {config.ballsPerTeam})</span>
                    <span className="text-emerald-400 font-mono">+ ${score.opponentBallsKnockedIn * config.knockInPrize}</span>
                  </div>
                  <div className="flex items-center gap-6 bg-black/40 p-4 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setScore({ ...score, opponentBallsKnockedIn: Math.max(0, score.opponentBallsKnockedIn - 1) })}
                      className="p-3 bg-white/10 rounded-lg hover:bg-white/20 text-white"
                    >
                      <Minus size={24} />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-4xl font-mono font-bold text-white">{score.opponentBallsKnockedIn}</span>
                    </div>
                    <button 
                      onClick={() => setScore({ ...score, opponentBallsKnockedIn: Math.min(config.ballsPerTeam, score.opponentBallsKnockedIn + 1) })}
                      className="p-3 bg-white/10 rounded-lg hover:bg-white/20 text-white"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">本隊總獎金:</span>
                    <span className="text-3xl font-bold text-emerald-400">$ {calculateEarnings(score, config)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Global Submit */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-emerald-950/80 backdrop-blur-lg border-t border-white/10 z-50">
          <div className="max-w-4xl mx-auto flex gap-4">
            <button 
              onClick={submitGame}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Save size={24} /> 結算此局
            </button>
          </div>
        </div>
      </div>
    );
  };

  const HistoryLog = () => (
    <div className="space-y-4">
      {history.length === 0 ? (
        <div className="text-center py-20 text-gray-400 italic">尚未有遊戲紀錄</div>
      ) : (
        history.map((h, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex justify-between items-center">
              <span className="text-sm text-gray-400">{new Date(h.timestamp).toLocaleString()}</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">X = {h.config.ballsPerTeam}</span>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 divide-x divide-white/10">
              <div className="pr-4">
                <div className="flex justify-between items-start">
                  <h5 className="font-bold text-blue-400">隊伍 A</h5>
                  {h.teamA.score.isMainWinner && <Trophy size={16} className="text-yellow-400" />}
                </div>
                <p className="text-xs text-gray-500 mb-2">{h.teamA.players.map(id => players.find(p => p.id === id)?.name).join(', ')}</p>
                <div className="text-sm space-y-1 text-gray-300">
                  <p>Bonus: {h.teamA.score.bonusBallsIn} 顆</p>
                  <p>擊進: {h.teamA.score.opponentBallsKnockedIn} 顆</p>
                  <p className="text-lg font-bold text-white mt-2">$ {h.teamA.earnings}</p>
                </div>
              </div>
              <div className="pl-4">
                <div className="flex justify-between items-start">
                  <h5 className="font-bold text-red-400">隊伍 B</h5>
                  {h.teamB.score.isMainWinner && <Trophy size={16} className="text-yellow-400" />}
                </div>
                <p className="text-xs text-gray-500 mb-2">{h.teamB.players.map(id => players.find(p => p.id === id)?.name).join(', ')}</p>
                <div className="text-sm space-y-1 text-gray-300">
                  <p>Bonus: {h.teamB.score.bonusBallsIn} 顆</p>
                  <p>擊進: {h.teamB.score.opponentBallsKnockedIn} 顆</p>
                  <p className="text-lg font-bold text-white mt-2">$ {h.teamB.earnings}</p>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="bg-emerald-500 p-2 rounded-lg"><Trophy size={32} /></span>
            撞球獎金追蹤
          </h1>
          <p className="text-emerald-300/70 mt-1 font-medium italic">Billiards Lag Money Tracker v1.0</p>
        </div>
        
        <nav className="flex bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
          {[
            { id: 'game', label: '遊戲計分', icon: Play },
            { id: 'players', label: '玩家列表', icon: Users },
            { id: 'history', label: '歷史紀錄', icon: History },
            { id: 'settings', label: '規則設定', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="transition-all animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === 'game' && <GameInterface />}
        {activeTab === 'players' && <PlayerManager />}
        {activeTab === 'history' && <HistoryLog />}
        {activeTab === 'settings' && <GameSettings />}
      </main>

      {/* Footer Branding */}
      <footer className="mt-20 py-8 border-t border-white/5 text-center text-white/20 text-sm">
        撞球遊戲計分系統 &copy; 2024
      </footer>
    </div>
  );
};

export default App;
