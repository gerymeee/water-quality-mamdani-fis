
/*
WaterSource FIS - Mamdani Fuzzy Inference Engine

Uses pH, turbidity, and TDS readings to calculate a water source's
monitoring priority through Mamdani fuzzy inference.

The engine performs fuzzification, rule evaluation, aggregation,
and centroid defuzzification.

This is an educational model and does not determine water safety.
*/

(function (root, factory) {
    const exported = factory();

    // Support Node.js for running automated tests.
    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    }

    // Allow the website to access the inference engine.
    root.WaterFIS = exported;

})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    /*
    FUZZY VARIABLES

    Each variable has three linguistic terms. Their membership functions
    are defined by the points in "p".

    "tri" represents a triangular membership function.
    "trap" represents a trapezoidal membership function.

    These ranges are provisional and have not been expert-validated.
    */

    const variables = {
        ph: {
            label: 'pH',
            unit: '',
            min: 0,
            max: 14,
            terms: [
                { name: 'Acidic',     shape: 'trap', p: [0, 0, 5.9, 6.8] },
                { name: 'Acceptable', shape: 'trap', p: [6.3, 6.8, 8.2, 8.8] },
                { name: 'Alkaline',   shape: 'trap', p: [8.3, 9.2, 14, 14] }
            ]
        },

        turbidity: {
            label: 'Turbidity',
            unit: 'NTU',
            min: 0,
            max: 50,
            terms: [
                { name: 'Clear',      shape: 'trap', p: [0, 0, 1, 5] },
                { name: 'Borderline', shape: 'tri',  p: [2, 5, 8] },
                { name: 'Turbid',     shape: 'trap', p: [6, 10, 50, 50] }
            ]
        },

        tds: {
            label: 'Total Dissolved Solids',
            unit: 'mg/L',
            min: 0,
            max: 2000,
            terms: [
                { name: 'Typical',   shape: 'trap', p: [0, 0, 350, 650] },
                { name: 'Elevated',  shape: 'tri',  p: [450, 800, 1200] },
                { name: 'Very High', shape: 'trap', p: [950, 1400, 2000, 2000] }
            ]
        },

        priority: {
            label: 'Monitoring Priority',
            unit: '/ 100',
            min: 0,
            max: 100,
            terms: [
                { name: 'Low',      shape: 'trap', p: [0, 0, 15, 40] },
                { name: 'Moderate', shape: 'tri',  p: [25, 50, 75] },
                { name: 'High',     shape: 'trap', p: [60, 85, 100, 100] }
            ]
        }
    };


    /*
    MEMBERSHIP FUNCTION

    Calculates how strongly a numerical value belongs to a fuzzy set.

    A membership degree ranges from 0 to 1, where 0 means the value
    does not belong to the set and 1 means full membership.
    */

    function membership(term, x) {
        const points = term.p;

        // Triangular membership function
        if (term.shape === 'tri') {
            const [a, b, c] = points;

            if (x <= a || x >= c) {
                return 0;
            }

            if (x === b) {
                return 1;
            }

            // Calculate membership on the rising or falling side.
            return x < b
                ? (x - a) / (b - a)
                : (c - x) / (c - b);
        }

        // Trapezoidal membership function
        const [a, b, c, d] = points;

        if (x < a || x > d) {
            return 0;
        }

        // Handle trapezoids with vertical edges at either end.
        if (a === b && x <= b) {
            return 1;
        }

        if (c === d && x >= c) {
            return 1;
        }

        if (x < b) {
            return (x - a) / (b - a);
        }

        if (x <= c) {
            return 1;
        }

        return (d - x) / (d - c);
    }


    /*
    RULE CLASSIFICATION

    Assigns a monitoring priority based on the linguistic terms
    of pH, turbidity, and TDS.

    These conditions define the initial rule base and have not
    been reviewed or validated by water-quality experts.
    */

    function classifyRule(ph, turb, tds) {
        const unusualPh = ph !== 'Acceptable';

        // Turbid water always receives high monitoring priority.
        if (turb === 'Turbid') {
            return 'High';
        }

        // Unusual pH combined with another non-ideal parameter.
        if (unusualPh && (turb !== 'Clear' || tds !== 'Typical')) {
            return 'High';
        }

        // Borderline turbidity combined with very high TDS.
        if (turb === 'Borderline' && tds === 'Very High') {
            return 'High';
        }

        // At least one input differs from its preferred condition.
        if (unusualPh || turb !== 'Clear' || tds !== 'Typical') {
            return 'Moderate';
        }

        return 'Low';
    }


    /*
    RULE BASE GENERATION

    Each of the three inputs has three linguistic terms.

    This produces 3 x 3 x 3 = 27 IF-THEN rules.
    Every combination receives a unique ID and an output.
    */

    const rules = [];

    variables.ph.terms.forEach(phTerm => {
        variables.turbidity.terms.forEach(turbidityTerm => {
            variables.tds.terms.forEach(tdsTerm => {
                rules.push({
                    id: rules.length + 1,
                    ph: phTerm.name,
                    turbidity: turbidityTerm.name,
                    tds: tdsTerm.name,
                    output: classifyRule(
                        phTerm.name,
                        turbidityTerm.name,
                        tdsTerm.name
                    )
                });
            });
        });
    });


    /*
    INPUT VALIDATION

    Ensures that pH, turbidity, and TDS contain valid numbers
    within the ranges defined in the fuzzy variables.
    */

    function validate(inputs) {
        const inputKeys = ['ph', 'turbidity', 'tds'];

        for (const key of inputKeys) {
            const variable = variables[key];
            const value = Number(inputs[key]);

            const isInvalid =
                inputs[key] === '' ||
                inputs[key] === null ||
                !Number.isFinite(value) ||
                value < variable.min ||
                value > variable.max;

            if (isInvalid) {
                throw new Error(
                    `${variable.label} must be a number from ` +
                    `${variable.min} to ${variable.max}.`
                );
            }
        }
    }


    /*
    FUZZY INFERENCE

    Takes the three numerical inputs and processes them through
    the four stages of Mamdani inference.
    */

    function calculate(inputs) {
        validate(inputs);

        const x = {
            ph: Number(inputs.ph),
            turbidity: Number(inputs.turbidity),
            tds: Number(inputs.tds)
        };


        /*
        STEP 1: FUZZIFICATION

        Calculate the membership degree of each input in its
        three linguistic terms.
        */

        const fuzzy = {};
        const inputKeys = ['ph', 'turbidity', 'tds'];

        for (const key of inputKeys) {
            fuzzy[key] = {};

            variables[key].terms.forEach(term => {
                fuzzy[key][term.name] = membership(term, x[key]);
            });
        }


        /*
        STEP 2: RULE EVALUATION

        The conditions in each rule are connected by AND, so the
        lowest membership degree determines the firing strength.

        Only rules with a nonzero firing strength are retained.
        */

        const fired = rules
            .map(rule => ({
                ...rule,
                strength: Math.min(
                    fuzzy.ph[rule.ph],
                    fuzzy.turbidity[rule.turbidity],
                    fuzzy.tds[rule.tds]
                )
            }))
            .filter(rule => rule.strength > 1e-12);


        /*
        STEP 3: AGGREGATION

        Evaluate the output range from 0 to 100 at intervals of 0.1.

        Each fired rule clips its output membership function at
        its firing strength. The maximum value among the clipped
        functions becomes the aggregated membership at that point.
        */

        const steps = 1000;
        const curve = [];

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i <= steps; i++) {
            const y = i * 0.1;
            let aggregatedMembership = 0;

            for (const rule of fired) {
                const outputTerm = variables.priority.terms.find(
                    term => term.name === rule.output
                );

                // Limit the output membership to the rule's strength.
                const clippedMembership = Math.min(
                    rule.strength,
                    membership(outputTerm, y)
                );

                // Combine rule outputs using the maximum operator.
                aggregatedMembership = Math.max(
                    aggregatedMembership,
                    clippedMembership
                );
            }

            // Store the aggregated values for the output graph.
            curve.push({
                y: y,
                mu: aggregatedMembership
            });

            // Collect the weighted values for centroid calculation.
            numerator += y * aggregatedMembership;
            denominator += aggregatedMembership;
        }


        /*
        STEP 4: DEFUZZIFICATION

        Calculate the centroid of the aggregated output.

        The centroid is the weighted average of all sampled output
        values and produces the final monitoring priority score.
        */

        if (denominator <= 1e-12) {
            throw new Error(
                'No rules fired; check the membership-function coverage.'
            );
        }

        const score = numerator / denominator;


        /*
        FINAL CLASSIFICATION

        Find which output term has the highest membership degree
        at the calculated score.
        */

        const outputMemberships = variables.priority.terms.map(term => ({
            term: term.name,
            degree: membership(term, score)
        }));

        const bestMatch = outputMemberships.reduce(
            (best, item) => item.degree > best.degree ? item : best,
            outputMemberships[0]
        );

        const label = bestMatch.term;

        // Return the results used by the website and automated tests.
        return {
            inputs: x,
            fuzzy,
            fired,
            curve,
            numerator,
            denominator,
            score,
            label,
            outputMemberships
        };
    }


    // Export the engine functions and data.
    return {
        variables,
        rules,
        membership,
        classifyRule,
        calculate
    };
});
