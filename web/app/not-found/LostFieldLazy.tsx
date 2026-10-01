'use client';

import dynamic from 'next/dynamic';

// The root not-found boundary is part of every route's tree, so a static
// import would put the 404 backdrop's code (the terminal cards and their
// styles) in every page's bundle. Loaded this way it is still server-rendered
// on a real 404, but its chunk only downloads when that 404 actually renders.
export const LostField = dynamic(() => import('./LostField').then((mod) => mod.LostField));
