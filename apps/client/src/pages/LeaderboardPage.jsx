import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '../services/api';
import { Trophy, TrendingUp, Loader2 } from 'lucide-react';

const LeaderboardPage = ({ onImageClick }) => {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-zinc-500" size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
          Most <span className="gradient-text">Voted</span>
        </h1>
        <p className="text-zinc-400">The most identified AI portraits by the community.</p>
      </div>

      <div className="space-y-4">
        {leaderboard?.map((item, index) => (
          <div 
            key={item.imageKey}
            onClick={() => onImageClick({ key: item.imageKey, imageUrl: item.imageUrl })}
            className="group flex items-center gap-6 p-4 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 rounded-3xl transition-all cursor-pointer"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-black font-black text-xl text-zinc-500 group-hover:text-blue-400">
              {index + 1}
            </div>
            
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black flex-shrink-0">
              <img src={item.imageUrl} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate group-hover:text-white transition-colors">
                {item.topGuess || 'Unknown'}
              </h3>
              <p className="text-zinc-500 text-sm flex items-center gap-1">
                <TrendingUp size={14} />
                {item.namedVoteCount} {item.namedVoteCount === 1 ? 'vote' : 'votes'}
              </p>
            </div>

            <div className="hidden sm:block">
              <Trophy className={`${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-zinc-400' : index === 2 ? 'text-orange-600' : 'text-zinc-800'}`} />
            </div>
          </div>
        ))}

        {leaderboard?.length === 0 && (
          <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-white/10">
            <p className="text-zinc-500">No votes recorded yet. Go vote in the gallery!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
