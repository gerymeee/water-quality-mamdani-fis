# WaterSource FIS

A web-based **Mamdani Fuzzy Inference System** for preliminary water-source monitoring prioritization using **pH, turbidity, and Total Dissolved Solids (TDS)**.

Developed for **CSci 141 – Intelligent Systems, Laboratory Activity #3: Fuzzy Expert System**.

## Overview

The application evaluates user-provided water-quality parameters using fuzzy logic and produces a monitoring priority score. It demonstrates the four stages of Mamdani fuzzy inference:

1. **Fuzzification** – Converts numerical inputs into fuzzy membership degrees.
2. **Rule Evaluation** – Evaluates a complete set of 27 IF–THEN rules using the minimum (AND) operator.
3. **Aggregation** – Combines activated output membership functions using the maximum operator.
4. **Defuzzification** – Computes the final crisp monitoring priority score using the centroid method.

## Running the Application

No installation or additional dependencies are required.

1. Download or clone this repository.
2. Open `index.html` in a modern web browser.
3. Enter values for pH, turbidity (NTU), and TDS (mg/L).
4. Click **Evaluate water source**.
5. Examine the displayed fuzzy inference results.

The application also provides sample input scenarios for demonstration.

## Application Features

- Interactive web interface for entering crisp input values.
- Fuzzification results showing membership degrees.
- Complete 27-rule fuzzy knowledge base.
- Identification of activated rules and their firing strengths.
- Graphical visualization of input and output membership functions.
- Aggregated fuzzy output visualization.
- Final defuzzified monitoring priority score and linguistic classification.

## Mathematical Implementation

The inference engine uses triangular and trapezoidal membership functions to represent linguistic variables.

**1. Rule Firing Strength (AND / Minimum)**

```math
\alpha_r = \min\left(\mu_{pH},\ \mu_{\text{Turbidity}},\ \mu_{\text{TDS}}\right)
```

**2. Mamdani Implication (Minimum)**

```math
\mu_r(y) = \min\left(\alpha_r,\ \mu_{\text{Consequent}_r}(y)\right)
```

**3. Aggregation (Maximum)**

```math
\mu_{\text{agg}}(y) = \max_r \mu_r(y)
```

**4. Centroid Defuzzification**

```math
y^* = \frac{\sum_y y\,\mu_{\text{agg}}(y)}{\sum_y \mu_{\text{agg}}(y)}
```

The output universe ranges from 0 to 100, evaluated at intervals of 0.1.

## Project Files

| File | Description |
|---|---|
| `index.html` | Web interface, input controls, results, and visualizations |
| `engine.js` | Mamdani fuzzy inference engine and rule base |
| `test_engine.js` | Automated mathematical and boundary tests |
| `screenshots/` | Application screenshots demonstrating system execution |

## Testing

To execute the automated tests, install Node.js and run:

```bash
node test_engine.js
```

## Important Limitations

This application is an educational prototype intended for **preliminary water-source monitoring prioritization only**.

Its membership functions and fuzzy rules are provisional and have not undergone expert or experimental validation. The system does not determine drinking-water safety and must not be used as a substitute for accredited laboratory testing.

A low monitoring priority score **does not indicate that water is safe to drink**.