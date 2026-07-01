import { useMemo } from 'react';
import { getPlatformCapabilities } from '../../platform/platformCapabilities';

export function usePlatformCapabilities(isWideLayout: boolean) {
  return useMemo(() => getPlatformCapabilities(isWideLayout), [isWideLayout]);
}
