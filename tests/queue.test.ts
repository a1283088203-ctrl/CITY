import assert from 'node:assert/strict';
import {BuildingQueue,rollBuildingLevel} from '../src/data/progression';
import {seeded} from '../src/utils/math';
const queue=new BuildingQueue(),rng=seeded(427),baselineRng=seeded(427);
let repeats=0,baselineRepeats=0,previous=0,baselinePrevious=0,ones=0,triples=0,run=0;
for(let i=0;i<100000;i++){
 const level=queue.roll(2,2,rng),baseline=rollBuildingLevel(2,2,baselineRng);
 assert.ok(level===1||level===2);if(level===1)ones++;
 if(level===previous)repeats++;if(baseline===baselinePrevious)baselineRepeats++;
 run=level===previous?run+1:1;if(run>=3)triples++;
 previous=level;baselinePrevious=baseline;
}
assert.ok(repeats<baselineRepeats*.8,'same-level neighbors reduced');
assert.ok(repeats>25000&&triples>1000,'queue remains random rather than forced alternation');
assert.ok(ones>50000&&ones<65000,'both starter levels remain common');
queue.reset();assert.equal(queue.roll(2,2,()=>.55),1);
queue.reset();assert.equal(queue.roll(2,2,()=>.65),2);
assert.equal(queue.roll(3,5,()=>.99),3,'late-game tier remains available');
console.log('PASS: queue reset, level limits, random repeats and reduced consecutive matches.',{repeats,baselineRepeats,ones});
