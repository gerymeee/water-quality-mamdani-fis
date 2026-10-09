/* Mamdani Fuzzy Inference Engine: educational water-source monitoring priority.
 * No external dependencies. Implements min implication, max aggregation,
 * discrete centroid defuzzification at 0.1 priority-score resolution.
 * This is not a potability certification or a health-risk estimator.
 */
(function(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  root.WaterFIS = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const variables = {
    ph: { label: 'pH', unit: '', min: 0, max: 14, terms: [
      { name: 'Acidic', shape: 'trap', p: [0, 0, 5.9, 6.8] },
      { name: 'Acceptable', shape: 'trap', p: [6.3, 6.8, 8.2, 8.8] },
      { name: 'Alkaline', shape: 'trap', p: [8.3, 9.2, 14, 14] }
    ]},
    turbidity: { label: 'Turbidity', unit: 'NTU', min: 0, max: 50, terms: [
      { name: 'Clear', shape: 'trap', p: [0, 0, 1, 5] },
      { name: 'Borderline', shape: 'tri', p: [2, 5, 8] },
      { name: 'Turbid', shape: 'trap', p: [6, 10, 50, 50] }
    ]},
    tds: { label: 'Total Dissolved Solids', unit: 'mg/L', min: 0, max: 2000, terms: [
      { name: 'Typical', shape: 'trap', p: [0, 0, 350, 650] },
      { name: 'Elevated', shape: 'tri', p: [450, 800, 1200] },
      { name: 'Very High', shape: 'trap', p: [950, 1400, 2000, 2000] }
    ]},
    priority: { label: 'Monitoring Priority', unit: '/ 100', min: 0, max: 100, terms: [
      { name: 'Low', shape: 'trap', p: [0, 0, 15, 40] },
      { name: 'Moderate', shape: 'tri', p: [25, 50, 75] },
      { name: 'High', shape: 'trap', p: [60, 85, 100, 100] }
    ]}
  };
  // These are illustrative, literature-informed design choices, NOT validated regulatory thresholds.
  function membership(term, x) {
    const p = term.p;
    if (term.shape === 'tri') {
      const [a,b,c] = p;
      if (x <= a || x >= c) return 0;
      if (x === b) return 1;
      return x < b ? (x-a)/(b-a) : (c-x)/(c-b);
    }
    const [a,b,c,d] = p;
    if (x < a || x > d) return 0;
    if (a === b && x <= b) return 1;
    if (c === d && x >= c) return 1;
    if (x < b) return (x-a)/(b-a);
    if (x <= c) return 1;
    return (d-x)/(d-c);
  }
  function classifyRule(ph, turb, tds) {
    const unusualPh = ph !== 'Acceptable';
    if (turb === 'Turbid') return 'High';
    if (unusualPh && (turb !== 'Clear' || tds !== 'Typical')) return 'High';
    if (turb === 'Borderline' && tds === 'Very High') return 'High';
    if (unusualPh || turb !== 'Clear' || tds !== 'Typical') return 'Moderate';
    return 'Low';
  }
  const rules = [];
  variables.ph.terms.forEach(p => variables.turbidity.terms.forEach(t => variables.tds.terms.forEach(d => {
    rules.push({id: rules.length+1, ph: p.name, turbidity: t.name, tds: d.name,
      output: classifyRule(p.name,t.name,d.name)});
  })));
  function validate(inputs) {
    for (const key of ['ph','turbidity','tds']) {
      const n = Number(inputs[key]);
      if (inputs[key] === '' || inputs[key] === null || !Number.isFinite(n) || n < variables[key].min || n > variables[key].max)
        throw new Error(`${variables[key].label} must be a number from ${variables[key].min} to ${variables[key].max}.`);
    }
  }
  function calculate(inputs) {
    validate(inputs);
    const x = {ph: Number(inputs.ph),turbidity:Number(inputs.turbidity),tds:Number(inputs.tds)};
    const fuzzy = {};
    for (const key of ['ph','turbidity','tds']) {
      fuzzy[key] = {};
      variables[key].terms.forEach(term => fuzzy[key][term.name] = membership(term, x[key]));
    }
    const fired = rules.map(rule => ({...rule,
      strength: Math.min(fuzzy.ph[rule.ph],fuzzy.turbidity[rule.turbidity],fuzzy.tds[rule.tds])
    })).filter(r => r.strength > 1e-12);
    const steps = 1000, curve = [];
    let numerator = 0, denominator = 0;
    for (let i=0;i<=steps;i++) {
      const y = i * 0.1;
      let agg = 0;
      for (const rule of fired) {
        const outTerm = variables.priority.terms.find(t => t.name === rule.output);
        agg = Math.max(agg, Math.min(rule.strength, membership(outTerm,y)));
      }
      curve.push({y, mu:agg});
      numerator += y*agg; denominator += agg;
    }
    if (denominator <= 1e-12) throw new Error('No rules fired; check the membership-function coverage.');
    const score = numerator/denominator;
    const outputMemberships = variables.priority.terms.map(t=>({term:t.name,degree:membership(t,score)}));
    const label = outputMemberships.reduce((best,item)=>item.degree>best.degree?item:best,outputMemberships[0]).term;
    return {inputs:x, fuzzy, fired, curve, numerator, denominator, score, label, outputMemberships};
  }
  return { variables, rules, membership, classifyRule, calculate };
});
