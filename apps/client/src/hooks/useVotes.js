import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVotes, submitVote as submitVoteApi } from '../services/api';

export const useVotes = (imageKey) => {
  return useQuery({
    queryKey: ['votes', imageKey],
    queryFn: () => getVotes(imageKey),
    enabled: !!imageKey,
  });
};

export const useSubmitVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitVoteApi,
    onSuccess: (data, variables) => {
      // Invalidate the specific image votes query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['votes', variables.imageKey] });
      // Also invalidate images to update the card overlay
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });
};
