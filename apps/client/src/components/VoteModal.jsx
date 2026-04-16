import { useState, useEffect } from 'react';
import { useVotes, useSubmitVote } from '../hooks/useVotes';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import useModalStore from '../store/modalStore';

const VoteModal = () => {
  const { isOpen, selectedImage, closeModal } = useModalStore();
  const [selectedGuess, setSelectedGuess] = useState('');
  const [newName, setNewName] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  const { data: voteData, isLoading: isLoadingVotes } = useVotes(selectedImage?.key);
  // React Query v5: isLoading → isPending on mutations
  const { mutate: submitVote, isPending: isSubmitting, isSuccess, error: submitError, reset } = useSubmitVote();

  // Reset state whenever a new image is selected
  useEffect(() => {
    if (isOpen && selectedImage) {
      reset(); // reset mutation state
      const votedImages = JSON.parse(localStorage.getItem('voted_images') || '{}');
      const priorVote = votedImages[selectedImage.key]; // 'named' | 'unknown' | undefined
      if (priorVote) {
        setHasVoted(true);
      } else {
        setHasVoted(false);
        // Pre-select "I don't know" if they voted unknown before, as a hint
        setSelectedGuess(priorVote === 'unknown' ? '__unknown__' : '');
        setNewName('');
      }
    }
  }, [isOpen, selectedImage?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeModal]);

  if (!isOpen || !selectedImage) return null;

  const handleVote = () => {
    const guessName = newName.trim() || selectedGuess;
    if (!guessName) return;

    submitVote({ imageKey: selectedImage.key, guessName }, {
      onSuccess: () => {
        const isUnknown = guessName === '__unknown__';
        setHasVoted(true);
        const votedImages = JSON.parse(localStorage.getItem('voted_images') || '{}');
        // Store 'named' or 'unknown' so we can decide whether to allow re-voting
        votedImages[selectedImage.key] = isUnknown ? 'unknown' : 'named';
        localStorage.setItem('voted_images', JSON.stringify(votedImages));
      }
    });
  };

  const voted = hasVoted || isSuccess;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={closeModal}
    >
      <div
        className="relative bg-zinc-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Image Section */}
        <div className="md:w-1/2 bg-black flex items-center justify-center p-2 min-h-[300px]">
          <img
            src={selectedImage.imageUrl}
            alt="AI Portrait"
            className="max-h-[70vh] w-full object-contain rounded-2xl"
          />
        </div>

        {/* Content Section */}
        <div className="md:w-1/2 p-6 md:p-10 flex flex-col overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-black mb-2">Who is this?</h2>
            {/* Show a nudge if they previously voted 'I don't know' */}
            {(() => {
              const prior = JSON.parse(localStorage.getItem('voted_images') || '{}')?.[selectedImage.key];
              return prior === 'unknown' && !voted ? (
                <p className="text-xs text-amber-400/80 font-medium mb-2 flex items-center gap-1">
                  <span>⚡</span> You voted "I don't know" — want to try again?
                </p>
              ) : null;
            })()}
            <p className="text-zinc-500 text-sm">
              Community Consensus:{' '}
              <span className="text-blue-400 font-bold">
                {voteData?.namedVoteCount ?? 0} votes
              </span>
            </p>
          </div>

          {voted ? (
            /* ── Post-vote state ── */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-2xl border border-white/5">
              <CheckCircle2 className="text-green-500 mb-4" size={64} />
              <h3 className="text-xl font-bold mb-2">Vote Recorded!</h3>
              <p className="text-zinc-400 mb-8">
                Thanks for helping the community identify this AI portrait.
              </p>

              {voteData?.topGuesses?.length > 0 && (
                <div className="w-full space-y-3 text-left">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">
                    Current Standings
                  </p>
                  {voteData.topGuesses.map((guess, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-zinc-800 rounded-xl"
                    >
                      <span className="font-medium">{guess.name}</span>
                      <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">
                        {guess.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setHasVoted(false)}
                className="mt-4 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <span>↺</span> Change your vote
              </button>
            </div>
          ) : (
            /* ── Voting form ── */
            <div className="flex-1 flex flex-col">
              <div className="space-y-3 mb-8">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">
                  Top Community Guesses
                </p>

                {isLoadingVotes ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-zinc-500" />
                  </div>
                ) : (
                  <>
                    {voteData?.topGuesses?.map((guess, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedGuess(guess.name); setNewName(''); }}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          selectedGuess === guess.name
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-bold">{guess.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            selectedGuess === guess.name
                              ? 'bg-blue-500 text-white'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {guess.count}
                        </span>
                      </button>
                    ))}

                    {/* Always show "I don't know" */}
                    <button
                      onClick={() => { setSelectedGuess('__unknown__'); setNewName(''); }}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                        selectedGuess === '__unknown__'
                          ? 'border-zinc-500 bg-zinc-500/10 text-white'
                          : 'border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-bold">I don't know</span>
                    </button>
                  </>
                )}
              </div>

              {/* New name input */}
              <div className="mb-8">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2 mb-3">
                  Suggest a new name
                </p>
                <input
                  type="text"
                  placeholder="Type a name..."
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (e.target.value) setSelectedGuess('');
                  }}
                  className="w-full bg-white/5 border-2 border-white/5 focus:border-purple-500 focus:bg-white/10 rounded-2xl p-4 text-white placeholder:text-zinc-600 outline-none transition-all"
                />
              </div>

              {/* Error message */}
              {submitError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">
                    {submitError.response?.data?.error || submitError.message}
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                disabled={(!selectedGuess && !newName.trim()) || isSubmitting}
                onClick={handleVote}
                className="w-full bg-white disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Submit Vote'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoteModal;
