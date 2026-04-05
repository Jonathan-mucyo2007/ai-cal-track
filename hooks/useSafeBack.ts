import { Href, useRouter } from 'expo-router';

export const useSafeBack = (fallback: Href = '/') => {
  const router = useRouter();

  return () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallback);
  };
};
