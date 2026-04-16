import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVotes } from '../services/api';

const ImageCard = ({ imageData, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
  const { imageUrl, key, lastModified } = imageData;

  const { data: voteSummary } = useQuery({
    queryKey: ['votes', key],
    queryFn: () => getVotes(key),
    staleTime: 60000, // Cache vote summary for 1 minute
  });

  if (isBroken) return null;

  return (
    <div 
      className={`group relative overflow-hidden rounded-2xl bg-zinc-900 transition-all hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-2xl ${!imageLoaded ? 'aspect-square animate-pulse' : ''}`}
      onClick={() => onClick(imageData)}
    >
      <img
        src={imageUrl}
        alt="AI Generated Portrait"
        className={`h-full w-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setIsBroken(true)}
        loading="lazy"
      />
      
      {imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 p-4 w-full">
            {voteSummary?.namedVoteCount > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">Top Guess</span>
                <span className="text-sm font-semibold truncate text-white">
                  {voteSummary.topGuesses[0]?.name || 'N/A'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {voteSummary.namedVoteCount} {voteSummary.namedVoteCount === 1 ? 'vote' : 'votes'}
                </span>
              </div>
            ) : (
              <span className="text-xs font-medium text-zinc-400 italic">No guesses yet</span>
            )}
          </div>
        </div>
      )}

      {/* Vote Count Badge (always visible if > 0) */}
      {!isBroken && imageLoaded && voteSummary?.namedVoteCount > 0 && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-bold text-white border border-white/10">
          {voteSummary.namedVoteCount}
        </div>
      )}
    </div>
  );
};

export default ImageCard;
