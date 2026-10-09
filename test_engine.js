const assert = require('node:assert/strict');
const f = require('./engine.js');
const eps = (a,b) => Math.abs(a-b) < 1e-9;
assert.equal(f.rules.length,27);
assert.equal(new Set(f.rules.map(r=>`${r.ph}/${r.turbidity}/${r.tds}`)).size,27);
for (const key of Object.keys(f.variables)) {
  const v=f.variables[key];for(let i=0;i<=1000;i++) {
    const x=v.min+(v.max-v.min)*i/1000;
    const mus=v.terms.map(t=>f.membership(t,x));
    mus.forEach(m=>assert(m>=-1e-12 && m<=1+1e-12));
    assert(mus.some(m=>m>0), `${key}: uncovered domain at x=${x}`);
  }
}
assert(eps(f.membership(f.variables.ph.terms[1],7.2),1));
assert(eps(f.membership(f.variables.turbidity.terms[1],5),1));
const low=f.calculate({ph:7.2,turbidity:.7,tds:280});
const mixed=f.calculate({ph:6.6,turbidity:4.5,tds:750});
const high=f.calculate({ph:5.7,turbidity:16,tds:1600});
assert.equal(low.label,'Low');
assert.equal(high.label,'High');
assert(low.score < mixed.score && mixed.score < high.score);
for (const r of [low,mixed,high]) {
  assert(Number.isFinite(r.score) && r.score>=0 && r.score<=100);
  const independently = r.curve.reduce((s,x)=>s+x.y*x.mu,0) / r.curve.reduce((s,x)=>s+x.mu,0);
  assert(Math.abs(independently-r.score)<1e-8);
  for (const a of r.fired) assert(eps(a.strength,Math.min(r.fuzzy.ph[a.ph],r.fuzzy.turbidity[a.turbidity],r.fuzzy.tds[a.tds])));
}
for (const x of [{ph:-1,turbidity:1,tds:1},{ph:7,turbidity:51,tds:1},{ph:7,turbidity:1,tds:'abc'}]) assert.throws(()=>f.calculate(x));
// Check 0.1 is near an analytically finer output integration resolution.
function fineCentroid(r){let numerator=0,denom=0;for(let i=0;i<=10000;i++){const x=i*.01;let y=0;for(const rule of r.fired){const t=f.variables.priority.terms.find(t=>t.name===rule.output);y=Math.max(y,Math.min(rule.strength,f.membership(t,x)));}numerator+=x*y;denom+=y;}return numerator/denom;}
for(const r of [low,mixed,high]) assert(Math.abs(fineCentroid(r)-r.score)<0.05);
console.log(`PASSED: 27 unique complete rules, all domain coverage, membership bounds, crisp validation, rule strengths, centroid recomputation, 0.01 fine-grid comparison.`);
console.log(`Example cases: low=${low.score.toFixed(4)} (${low.label}, ${low.fired.length} rules); mixed=${mixed.score.toFixed(4)} (${mixed.label}, ${mixed.fired.length} rules); high=${high.score.toFixed(4)} (${high.label}, ${high.fired.length} rules).`);
console.log(`Mixed fuzzification: ${JSON.stringify(mixed.fuzzy)}`);
console.log(`Mixed fired rules: ${JSON.stringify(mixed.fired.map(({id,strength,output})=>({id,strength,output})))}`);
