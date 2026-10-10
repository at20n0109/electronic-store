// The canonical Public/PublicGuard pair lives in common/. This re-export keeps
// existing imports working while removing the duplicated implementation that
// was silently dead because nothing registered it globally.
export { PublicGuard } from '../../common/guards/public.guard.js';
export { Public, IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
