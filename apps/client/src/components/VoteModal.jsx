import { useState, useEffect } from 'react';
import { useVotes, useSubmitVote } from '../hooks/useVotes';
import { X, CheckCircle2, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import useModalStore from '../store/modalStore';

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'voted_images';

/** Returns { guessName, voteId } or null */
const getStoredVote = (imageKey) => {
  try {
    const store = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return store[imageKey] || null;
  } catch {
    return null;
  }
};

/** Saves { guessName, voteId } for an imageKey */
const setStoredVote = (imageKey, guessName, voteId) => {
  try {
    const store = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    store[imageKey] = { guessName, voteId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore storage errors */ }
};

// ─── Component ────────────────────────────────────────────────────────────────

const VoteModal = () => {
  const { isOpen, selectedImage, closeModal } = useModalStore();

  /**
   * view:
   *   'form'    – voting form (new voter, or user clicked "Change your vote")
   *   'results' – post-vote success screen (just submitted in this session)
   *   'prior'   – returning visitor who already voted; shows their vote + standings
   */
  const [view, setView]               = useState('form');
  const [priorVote, setPriorVote]     = useState(null);   // { guessName, voteId }
  const [justVoted, setJustVoted]     = useState(false);
  const [selectedGuess, setSelectedGuess] = useState('');
  const [newName, setNewName]         = useState('');

  const { data: voteData, isLoading: isLoadingVotes } = useVotes(selectedImage?.key);
  const {
    mutate: submitVote,
    isPending: isSubmitting,
    error: submitError,
    reset,
  } = useSubmitVote();

  // ── Reset every time the modal opens on a new image ──────────────────────
  useEffect(() => {
    if (isOpen && selectedImage) {
      reset();
      setJustVoted(false);
      setSelectedGuess('');
      setNewName('');

      const stored = getStoredVote(selectedImage.key);
      setPriorVote(stored);
      // If they've voted before, land on the "prior" view; otherwise the form
      setView(stored ? 'prior' : 'form');
    }
  }, [isOpen, selectedImage?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closeModal]);

  if (!isOpen || !selectedImage) return null;

  // ── Handle vote submission ────────────────────────────────────────────────
  const handleVote = () => {
    const guessName = newName.trim() || selectedGuess;
    if (!guessName) return;

    const payload = {
      imageKey: selectedImage.key,
      guessName,
      // If changing a vote, send the old row ID so the server can swap it
      ...(priorVote?.voteId ? { previousVoteId: priorVote.voteId } : {}),
    };

    submitVote(payload, {
      onSuccess: (data) => {
        const { voteId } = data;
        const displayName = newName.trim() || selectedGuess;
        // Persist to localStorage so this browser remembers the vote
        setStoredVote(selectedImage.key, displayName, voteId);
        setPriorVote({ guessName: displayName, voteId });
        setJustVoted(true);
        setView('results');
      },
    });
  };

  // ── Handle "Change your vote" ─────────────────────────────────────────────
  const handleChangeVote = () => {
    reset();
    setJustVoted(false);
    // Pre-select their previous choice in the form
    setSelectedGuess(priorVote?.guessName || '');
    setNewName('');
    setView('form');
  };

  // ── Shared standings block ────────────────────────────────────────────────
  const Standings = () => (
    <div className="w-full space-y-3 text-left mt-2">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">
        Current Standings
      </p>

      {voteData?.topGuesses?.length > 0
        ? voteData.topGuesses.slice(0, 3).map((guess, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-zinc-800 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-zinc-500 w-4">#{i + 1}</span>
                <span className="font-medium">{guess.name}</span>
              </div>
              <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {guess.count} {guess.count === 1 ? 'vote' : 'votes'}
              </span>
            </div>
          ))
        : <p className="text-sm text-zinc-500 px-2">No named guesses yet — be the first!</p>
      }

      {/* "I don't know" is always slot #4 */}
      <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-zinc-500 w-4">#4</span>
          <span className="font-medium text-zinc-400">I don't know</span>
        </div>
        <span className="bg-zinc-700/50 text-zinc-500 px-2 py-0.5 rounded-full text-xs font-bold">
          always here
        </span>
      </div>
    </div>
  );

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

        {/* Image */}
        <div className="md:w-1/2 bg-black flex items-center justify-center p-2 min-h-[300px]">
          <img
            src={selectedImage.imageUrl}
            alt="AI Portrait"
            className="max-h-[70vh] w-full object-contain rounded-2xl"
          />
        </div>

        {/* Content */}
        <div className="md:w-1/2 p-6 md:p-10 flex flex-col overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-black mb-2">Who is this?</h2>
            <p className="text-zinc-500 text-sm">
              Community Consensus:{' '}
              <span className="text-blue-400 font-bold">
                {voteData?.namedVoteCount ?? 0} votes
              </span>
            </p>
          </div>

          {/* ── VIEW: just voted (success screen) ── */}
          {view === 'results' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-2xl border border-white/5">
              <CheckCircle2 className="text-green-500 mb-3" size={56} />
              <h3 className="text-xl font-bold mb-1">Vote Recorded!</h3>
              <p className="text-zinc-400 text-sm mb-2">
                You voted:{' '}
                <span className="text-white font-bold">
                  {priorVote?.guessName === '__unknown__' ? "I don't know" : priorVote?.guessName}
                </span>
              </p>

              <Standings />

              <button
                onClick={handleChangeVote}
                className="mt-6 flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <RotateCcw size={13} /> Change your vote
              </button>
            </div>
          )}

          {/* ── VIEW: returning visitor who already voted ── */}
          {view === 'prior' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                <CheckCircle2 className="text-blue-400" size={30} />
              </div>
              <h3 className="text-xl font-bold mb-1">You Already Voted</h3>
              <p className="text-zinc-400 text-sm mb-2">
                Your vote:{' '}
                <span className="text-white font-bold">
                  {priorVote?.guessName === '__unknown__' ? "I don't know" : priorVote?.guessName}
                </span>
              </p>

              <Standings />

              <button
                onClick={handleChangeVote}
                className="mt-6 flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <RotateCcw size={13} /> Change your vote
              </button>
            </div>
          )}

          {/* ── VIEW: voting form (new voter or changing vote) ── */}
          {view === 'form' && (
            <div className="flex-1 flex flex-col">
              {/* Banner shown only when actively changing a prior vote */}
              {priorVote && (
                <div className="mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-medium flex items-center gap-2">
                  <RotateCcw size={12} />
                  Changing your vote from{' '}
                  <span className="font-bold">
                    {priorVote.guessName === '__unknown__' ? "I don't know" : priorVote.guessName}
                  </span>
                  — your previous vote will be replaced.
                </div>
              )}

              <div className="space-y-3 mb-6">
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          selectedGuess === guess.name ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {guess.count}
                        </span>
                      </button>
                    ))}

                    {/* "I don't know" always 4th */}
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
              <div className="mb-6">
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

              {/* Error */}
              {submitError && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">
                    {submitError.response?.data?.error || submitError.message}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                disabled={(!selectedGuess && !newName.trim()) || isSubmitting}
                onClick={handleVote}
                className="w-full bg-white disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting
                  ? <Loader2 className="animate-spin" size={20} />
                  : (priorVote ? 'Update Vote' : 'Submit Vote')
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoteModal;
