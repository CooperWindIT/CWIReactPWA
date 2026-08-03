export const KPI_FORMULAS = {
    1: {
        name: "Higher is Better",
        calculate: (actual, target) =>
            actual > 0
                ? Math.min((actual / target) * 100, 100)
                : 0
            // target > 0 ? (actual / target) * 100 : 0
    },

    2: {
        name: "Direct Score",
        calculate: (actual) => actual
    },

    3: {
        name: "Lower is Better",
        calculate: (actual, target) =>
            actual > 0
                ? Math.min((target / actual) * 100, 100)
                : 0
    },

    4: {
        name: "Custom Formula",
        calculate: () => {
            throw new Error("Formula 4 not implemented.");
        }
    }
};