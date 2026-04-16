import { useQuery } from '@tanstack/react-query';
import { getImages } from '../services/api';

export const useImages = () => {
  return useQuery({
    queryKey: ['images'],
    queryFn: getImages,
  });
};
