
import { KPI_FORMULAS } from './../Components/Config/kpiFormulaConfig';
export const calculateKPI = ({
    FormulaId,
    Target,
    Actual,
    Weightage
}) => {

    const formula = KPI_FORMULAS[FormulaId];

    if (!formula) {
        throw new Error(`Formula ${FormulaId} not found.`);
    }

    const calculatedScore = Number(
        formula.calculate(
            Number(Actual),
            Number(Target)
        ).toFixed(2)
    );

    const weightedScore = Number(
        ((calculatedScore * Number(Weightage)) / 100).toFixed(2)
    );

    return {
        calculatedScore,
        weightedScore
    };
};