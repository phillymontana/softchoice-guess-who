import { useImages } from '../hooks/useImages';
import ImageCard from '../components/ImageCard';

const GalleryPage = ({ onImageClick }) => {
  const { data: images, isLoading, isError, error } = useImages();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Oops! Something went wrong.</h2>
        <p className="text-zinc-400 mb-6">{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
          Guess <span className="gradient-text">Who?</span>
        </h1>
        <p className="text-zinc-400 max-w-xl">
          Browse through hundreds of AI-generated portraits and help the community identify who they might be. Tallying guesses in real-time.
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {images?.map((image) => (
          <ImageCard 
            key={image.key} 
            imageData={image} 
            onClick={onImageClick}
          />
        ))}
      </div>
    </div>
  );
};

export default GalleryPage;
