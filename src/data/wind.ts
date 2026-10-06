/** Gameplay wind, in world units rather than meteorological units. */
export const WIND={startHeight:7,fullHeight:26,pressure:110,lineCount:72,ceiling:38,transitionSeconds:4,settleSeconds:.8,nightStrongWeight:1.25,rainCount:420,rainWeight:.32};
export const WEATHER={
 CALM:{label:'无风',strength:0,minDuration:18,maxDuration:35},
 BREEZE:{label:'微风',strength:.28,minDuration:16,maxDuration:28},
 STRONG_WIND:{label:'强风',strength:1,minDuration:12,maxDuration:20},
 RAIN:{label:'降雨',strength:.14,minDuration:10,maxDuration:18}
};
export type WindState=keyof typeof WEATHER;
