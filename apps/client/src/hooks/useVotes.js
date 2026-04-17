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
      // Immediately update the cache with the fresh tallies returned by the server.
      // This makes the vote count & standings update instantly without waiting for a refetch.
      if (data?.updatedTallies) {
        queryClient.setQueryData(
          ['votes', variables.imageKey],
          data.updatedTallies
        );
      }
      // Background sync: also invalidate to ensure eventual consistency
      queryClient.invalidateQueries({ queryKey: ['votes', variables.imageKey] });
      // Also invalidate images to update the card overlay
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });
};
