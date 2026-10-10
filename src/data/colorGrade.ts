import {defaultGrade,type Grade} from '../scenes/ColorGradePass';
/** Approved visual settings; exposure is measured in EV. */
export const FIXED_GRADE:Grade={
 ...defaultGrade(),
 exposure:0,brightness:0,contrast:1.14,saturation:1.07,vibrance:.1,temperature:.14,tint:0,
 shadows:.74,highlights:-.24,gamma:1.14,
 shadowHue:0,shadowAmount:0,highlightHue:0,highlightAmount:0,vignette:.09,
 hsl:[[-6,0,.03],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
 curves:{master:[0,.37,.52,.73,1],red:[0,.25,.5,.75,1],green:[0,.25,.5,.75,1],blue:[0,.25,.5,.75,1]}
};
/** A fresh, editable copy of the approved grade. */
export const approvedGrade=():Grade=>JSON.parse(JSON.stringify(FIXED_GRADE));
