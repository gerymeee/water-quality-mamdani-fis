
const assert = require('node:assert/strict');
const fis = require('./engine.js');

/*
Helper function for comparing decimal values.

Floating-point calculations may produce very small differences,
so two values are considered equal if they differ by less than 1e-9.
*/
const approximatelyEqual = (a, b) => Math.abs(a - b) < 1e-9;


/*
TEST 1: RULE BASE COMPLETENESS

The system must contain exactly 27 rules because each of the
three input variables has three linguistic terms (3 x 3 x 3).

The second test ensures that no input combination is repeated.
*/
assert.equal(fis.rules.length, 27);

const uniqueRules = new Set(
    fis.rules.map(rule =>
        `${rule.ph}/${rule.turbidity}/${rule.tds}`
    )
);

assert.equal(uniqueRules.size, 27);


/*
TEST 2: MEMBERSHIP FUNCTION COVERAGE

Check 1,001 evenly spaced values across each variable's range.

Every membership degree must remain between 0 and 1.
At least one fuzzy set must have a positive membership degree
at every tested point, so no part of the domain is uncovered.
*/
for (const key of Object.keys(fis.variables)) {
    const variable = fis.variables[key];

    for (let i = 0; i <= 1000; i++) {
        const x = variable.min +
            (variable.max - variable.min) * i / 1000;

        const memberships = variable.terms.map(term =>
            fis.membership(term, x)
        );

        // Membership degrees must be between 0 and 1.
        memberships.forEach(degree => {
            assert(degree >= -1e-12 && degree <= 1 + 1e-12);
        });

        // At least one term must cover the current value.
        assert(
            memberships.some(degree => degree > 0),
            `${key}: uncovered domain at x=${x}`
        );
    }
}


/*
TEST 3: KNOWN MEMBERSHIP VALUES

Check values that should have full membership (degree = 1)
in their corresponding fuzzy sets.
*/
assert(
    approximatelyEqual(
        fis.membership(fis.variables.ph.terms[1], 7.2),
        1
    )
);

assert(
    approximatelyEqual(
        fis.membership(fis.variables.turbidity.terms[1], 5),
        1
    )
);


/*
TEST 4: SAMPLE INPUT SCENARIOS

Evaluate the three examples provided in the application:
low priority, mixed conditions, and high priority.

The results should follow the expected priority order.
*/
const low = fis.calculate({
    ph: 7.2,
    turbidity: 0.7,
    tds: 280
});

const mixed = fis.calculate({
    ph: 6.6,
    turbidity: 4.5,
    tds: 750
});

const high = fis.calculate({
    ph: 5.7,
    turbidity: 16,
    tds: 1600
});

assert.equal(low.label, 'Low');
assert.equal(high.label, 'High');

assert(
    low.score < mixed.score &&
    mixed.score < high.score
);


/*
TEST 5: RULE FIRING AND CENTROID CALCULATION

For each sample scenario, verify that:
- The final score is a valid number between 0 and 100.
- Recalculating the centroid from the output curve
  produces the same score.
- Every fired rule uses the minimum membership degree
  of its three input conditions.
*/
for (const result of [low, mixed, high]) {
    assert(
        Number.isFinite(result.score) &&
        result.score >= 0 &&
        result.score <= 100
    );

    // Independently recalculate the centroid using the output curve.
    const numerator = result.curve.reduce(
        (sum, point) => sum + point.y * point.mu,
        0
    );

    const denominator = result.curve.reduce(
        (sum, point) => sum + point.mu,
        0
    );

    const recalculatedCentroid = numerator / denominator;

    assert(
        Math.abs(recalculatedCentroid - result.score) < 1e-8
    );

    // Check the firing strength of every activated rule.
    for (const rule of result.fired) {
        const expectedStrength = Math.min(
            result.fuzzy.ph[rule.ph],
            result.fuzzy.turbidity[rule.turbidity],
            result.fuzzy.tds[rule.tds]
        );

        assert(
            approximatelyEqual(rule.strength, expectedStrength)
        );
    }
}


/*
TEST 6: INVALID INPUT HANDLING

The engine should reject inputs that are outside their allowed
ranges or cannot be converted into valid numbers.
*/
const invalidInputs = [
    { ph: -1, turbidity: 1, tds: 1 },
    { ph: 7, turbidity: 51, tds: 1 },
    { ph: 7, turbidity: 1, tds: 'abc' }
];

for (const inputs of invalidInputs) {
    assert.throws(() => fis.calculate(inputs));
}


/*
TEST 7: CENTROID PRECISION

The engine calculates the centroid using a step size of 0.1.

Recalculate it using a smaller step size of 0.01 and compare
the results. The difference should be less than 0.05.
*/
function fineCentroid(result) {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i <= 10000; i++) {
        const x = i * 0.01;
        let aggregatedMembership = 0;

        for (const rule of result.fired) {
            const outputTerm = fis.variables.priority.terms.find(
                term => term.name === rule.output
            );

            const clippedMembership = Math.min(
                rule.strength,
                fis.membership(outputTerm, x)
            );

            aggregatedMembership = Math.max(
                aggregatedMembership,
                clippedMembership
            );
        }

        numerator += x * aggregatedMembership;
        denominator += aggregatedMembership;
    }

    return numerator / denominator;
}

for (const result of [low, mixed, high]) {
    assert(
        Math.abs(fineCentroid(result) - result.score) < 0.05
    );
}


/*
TEST RESULTS

These messages are displayed after all assertions pass.
They summarize the checks and show the results of the three
sample scenarios.
*/
console.log(
    'PASSED: 27 unique complete rules, all domain coverage, ' +
    'membership bounds, crisp validation, rule strengths, ' +
    'centroid recomputation, 0.01 fine-grid comparison.'
);

console.log(
    `Example cases: ` +
    `low=${low.score.toFixed(4)} (${low.label}, ${low.fired.length} rules); ` +
    `mixed=${mixed.score.toFixed(4)} (${mixed.label}, ${mixed.fired.length} rules); ` +
    `high=${high.score.toFixed(4)} (${high.label}, ${high.fired.length} rules).`
);

console.log(
    `Mixed fuzzification: ${JSON.stringify(mixed.fuzzy)}`
);

console.log(
    `Mixed fired rules: ${JSON.stringify(
        mixed.fired.map(({ id, strength, output }) => ({
            id,
            strength,
            output
        }))
    )}`
);
