
class MatrixFormatSelector {
  selectFormat(inst: Instruction): MatrixFormat {
    // Generate candidate matrix
    const matrix = this.generateMatrix(inst);

    // Count non-zeros
    const nonZeroCount = this.countNonZeros(matrix);
    const sparsityRatio = nonZeroCount / 484;

    // Calculate storage sizes
    const denseSize = 484 * 4;  // 1936 bytes
    const sparseSize = nonZeroCount * 4 +  // values
                       nonZeroCount * 4 +  // col_indices
                       23 * 4;             // row_pointers

    // Threshold-based selection
    const SPARSITY_THRESHOLD = 0.15;  // 15%

    if (sparsityRatio >= SPARSITY_THRESHOLD) {
      return {
        format: MatrixFormat.Dense,
        size: denseSize,
        nonZeroCount: nonZeroCount,
        reasoning: 'Dense: High non-zero ratio maintains bandwidth'
      };
    } else {
      return {
        format: MatrixFormat.Sparse,
        size: sparseSize,
        nonZeroCount: nonZeroCount,
        reasoning: 'Sparse: Low non-zero ratio saves memory & compute'
      };
    }
  }

  private countNonZeros(matrix: number[][]): number {
    let count = 0;
    for (let i = 0; i < 22; i++) {
      for (let j = 0; j < 22; j++) {
        if (Math.abs(matrix[i][j]) > 1e-9) {
          count++;
        }
      }
    }
    return count;
  }
}
