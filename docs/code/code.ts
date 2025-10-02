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



class MatrixCompiler {
  compileLinearInstruction(inst: Instruction): CompiledMatrix {
    // 1. Generate dense representation first
    const denseMatrix = this.generateDenseMatrix(inst);
    
    // 2. Analyze sparsity
    const analysis = this.analyzeSparsity(denseMatrix);
    
    // 3. Select format based on threshold
    if (analysis.sparsityRatio >= this.SPARSITY_THRESHOLD) {
      return this.compileDense(denseMatrix, analysis);
    } else {
      return this.compileSparse(denseMatrix, analysis);
    }
  }
  
  private analyzeSparsity(matrix: number[][]): SparsityAnalysis {
    let nonZeroCount = 0;
    const nonZeroPositions: [number, number][] = [];
    
    for (let row = 0; row < 22; row++) {
      for (let col = 0; col < 22; col++) {
        if (Math.abs(matrix[row][col]) > 1e-9) {
          nonZeroCount++;
          nonZeroPositions.push([row, col]);
        }
      }
    }
    
    const sparsityRatio = nonZeroCount / 484;
    const denseSize = 484 * 4;  // bytes
    const sparseSize = nonZeroCount * 4 +  // values
                       nonZeroCount * 4 +  // col_indices
                       23 * 4;             // row_pointers
    
    return {
      nonZeroCount,
      sparsityRatio,
      nonZeroPositions,
      denseSize,
      sparseSize,
      savingsIfSparse: denseSize - sparseSize,
      computeSavingsIfSparse: 484 - nonZeroCount,
    };
  }
  
  private compileDense(
    matrix: number[][],
    analysis: SparsityAnalysis
  ): CompiledMatrix {
    // Flatten to row-major order
    const data = new Float32Array(484);
    let idx = 0;
    for (let row = 0; row < 22; row++) {
      for (let col = 0; col < 22; col++) {
        data[idx++] = matrix[row][col];
      }
    }
    
    return {
      format: MatrixFormat.Dense,
      data: data.buffer,
      metadata: {
        format: 1,  // FORMAT_DENSE
        size: 1936,  // 484 * 4 bytes
        nonZeroCount: analysis.nonZeroCount,
      },
      analysis,
    };
  }
  
  private compileSparse(
    matrix: number[][],
    analysis: SparsityAnalysis
  ): CompiledMatrix {
    const values: number[] = [];
    const colIndices: number[] = [];
    const rowPointers: number[] = [0];
    
    // Convert to CSR format
    for (let row = 0; row < 22; row++) {
      for (let col = 0; col < 22; col++) {
        const value = matrix[row][col];
        if (Math.abs(value) > 1e-9) {
          values.push(value);
          colIndices.push(col);
        }
      }
      rowPointers.push(values.length);
    }
    
    // Pack into buffers
    const valuesBuffer = new Float32Array(values);
    const colIndicesBuffer = new Uint32Array(colIndices);
    const rowPointersBuffer = new Uint32Array(rowPointers);
    
    // Concatenate buffers
    const totalSize = valuesBuffer.byteLength +
                      colIndicesBuffer.byteLength +
                      rowPointersBuffer.byteLength;
    
    const combined = new ArrayBuffer(totalSize);
    const view = new Uint8Array(combined);
    
    let offset = 0;
    view.set(new Uint8Array(valuesBuffer.buffer), offset);
    offset += valuesBuffer.byteLength;
    view.set(new Uint8Array(colIndicesBuffer.buffer), offset);
    offset += colIndicesBuffer.byteLength;
    view.set(new Uint8Array(rowPointersBuffer.buffer), offset);
    
    return {
      format: MatrixFormat.Sparse,
      data: combined,
      metadata: {
        format: 0,  // FORMAT_SPARSE
        size: totalSize,
        nonZeroCount: values.length,
      },
      analysis,
    };
  }
  
  // Configurable threshold (default 15%)
  private SPARSITY_THRESHOLD = 0.15;
}



class CompilationStats {
  private stats = {
    totalLinearInstructions: 0,
    sparseCount: 0,
    denseCount: 0,
    totalDenseSize: 0,
    totalSparseSize: 0,
    totalNonZeros: 0,
  };
  
  recordMatrix(compiled: CompiledMatrix): void {
    this.stats.totalLinearInstructions++;
    
    if (compiled.format === MatrixFormat.Sparse) {
      this.stats.sparseCount++;
      this.stats.totalSparseSize += compiled.metadata.size;
    } else {
      this.stats.denseCount++;
      this.stats.totalDenseSize += compiled.metadata.size;
    }
    
    this.stats.totalNonZeros += compiled.metadata.nonZeroCount;
  }
  
  generateReport(): string {
    const totalSize = this.stats.totalDenseSize + this.stats.totalSparseSize;
    const wouldBeAllDense = this.stats.totalLinearInstructions * 1936;
    const savings = wouldBeAllDense - totalSize;
    const savingsPercent = (savings / wouldBeAllDense) * 100;
    
    const avgNonZeros = this.stats.totalNonZeros / this.stats.totalLinearInstructions;
    const avgSparsity = avgNonZeros / 484;
    
    return `
Matrix Compilation Statistics:
==============================
Total linear instructions: ${this.stats.totalLinearInstructions}
Sparse matrices: ${this.stats.sparseCount} (${(this.stats.sparseCount / this.stats.totalLinearInstructions * 100).toFixed(1)}%)
Dense matrices: ${this.stats.denseCount} (${(this.stats.denseCount / this.stats.totalLinearInstructions * 100).toFixed(1)}%)

Storage:
  Sparse: ${(this.stats.totalSparseSize / 1024).toFixed(1)} KB
  Dense: ${(this.stats.totalDenseSize / 1024).toFixed(1)} KB
  Total: ${(totalSize / 1024).toFixed(1)} KB
  
  Would be (all dense): ${(wouldBeAllDense / 1024).toFixed(1)} KB
  Savings: ${(savings / 1024).toFixed(1)} KB (${savingsPercent.toFixed(1)}%)

Sparsity:
  Average non-zeros per matrix: ${avgNonZeros.toFixed(1)}
  Average sparsity ratio: ${(avgSparsity * 100).toFixed(1)}%
    `;
  }
}



class VMCompiler {
  compile(source: string): VMExecutable {
    const ast = this.parse(source);
    this.typeCheck(ast);
    
    const dependencyGraph = this.buildDependencyGraph(ast);
    
    let optimizedAST = ast;
    if (this.config.enableFusion) {
      optimizedAST = this.fuseOperations(optimizedAST);
    }
    if (this.config.enableSpecialization) {
      optimizedAST = this.partialEvaluate(optimizedAST);
    }
    if (this.config.enableUnrolling) {
      optimizedAST = this.unrollLoops(optimizedAST);
    }
    
    const phases = this.generatePhases(dependencyGraph);
    
    const routines: RoutineInfo[] = [];
    const instructions: Instruction[] = [];
    const matrixCompiler = new MatrixCompiler();
    const compilationStats = new CompilationStats();
    
    for (const phase of phases) {
      for (const operation of phase.operations) {
        const routine = this.compileRoutine(operation);
        
        routines.push({
          name: operation.name,
          entryPoint: instructions.length,
          instructionCount: routine.instructions.length,
          estimatedEpochs: this.estimateEpochs(routine),
          memoryUsage: this.analyzeMemoryUsage(routine),
        });
        
        instructions.push(...routine.instructions);
        
        // Compile matrices for linear operations
        for (const inst of routine.instructions) {
          if (inst.opcode < 10) {
            const compiled = matrixCompiler.compileLinearInstruction(inst);
            compilationStats.recordMatrix(compiled);
          }
        }
      }
    }
    
    const bufferLayout = this.allocateBuffers(phases, routines);
    const executionPlan = this.generateExecutionPlan(phases, routines, bufferLayout);
    
    console.log(compilationStats.generateReport());
    
    return {
      metadata: {
        version: '4.0',
        totalInstructions: instructions.length,
        linearInstructionCount: instructions.filter(i => i.opcode < 10).length,
        routineCount: routines.length,
        phaseCount: phases.length,
        estimatedEpochs: this.estimateTotalEpochs(executionPlan),
        resourceRequirements: {
          maxVMs: this.calculateMaxVMs(executionPlan),
          sharedMemoryBytes: bufferLayout.totalSize,
          callStackDepth: this.calculateMaxCallDepth(routines),
        },
        matrixStats: compilationStats.getStats(),
      },
      instructions,
      matrixData: matrixCompiler.getCompiledMatrices(),
      routines,
      executionPlan,
      bufferLayout,
    };
  }
}



class GPUVMRuntime {
  private device: GPUDevice;
  private buffers: GPUBuffers;
  private pipelines: GPUPipelines;
  private bindGroups: GPUBindGroups;
  private executable: VMExecutable;
  
  async initialize(executable: VMExecutable): Promise<void> {
    this.executable = executable;
    
    const adapter = await navigator.gpu.requestAdapter();
    this.device = await adapter.requestDevice();
    
    await this.allocateGPUBuffers(executable);
    await this.createComputePipelines();
    await this.createBindGroups();
    await this.uploadProgramData(executable);
  }
  
  private async allocateGPUBuffers(executable: VMExecutable): Promise<void> {
    const maxVMs = executable.metadata.resourceRequirements.maxVMs;
    
    // VM states
    this.buffers.vmStates = this.device.createBuffer({
      size: maxVMs * 128,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    
    // Instructions
    this.buffers.instructions = this.device.createBuffer({
      size: executable.instructions.length * 20,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Matrix metadata
    this.buffers.matrixMetadata = this.device.createBuffer({
      size: executable.metadata.linearInstructionCount * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Dense matrices
    const denseSize = executable.matrixData.denseMatrices.byteLength;
    this.buffers.denseMatrices = this.device.createBuffer({
      size: Math.max(denseSize, 4), // At least 4 bytes
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Sparse matrices (separate buffers for values, indices, pointers)
    const sparseData = executable.matrixData.sparseMatrices;
    this.buffers.sparseValues = this.device.createBuffer({
      size: Math.max(sparseData.values.byteLength, 4),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.buffers.sparseColIndices = this.device.createBuffer({
      size: Math.max(sparseData.colIndices.byteLength, 4),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.buffers.sparseRowPointers = this.device.createBuffer({
      size: Math.max(sparseData.rowPointers.byteLength, 4),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Shared memory
    this.buffers.sharedMemory = this.device.createBuffer({
      size: executable.bufferLayout.totalSize * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    
    // Call stack
    const maxCallFrames = maxVMs * executable.metadata.resourceRequirements.callStackDepth;
    this.buffers.callStack = this.device.createBuffer({
      size: maxCallFrames * 32,
      usage: GPUBufferUsage.STORAGE,
    });
    
    // Classification buffers
    const classificationSize = maxVMs * 4;
    this.buffers.classification = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    this.buffers.linearIndices = this.createBuffer(classificationSize);
    this.buffers.oracleIndices = this.createBuffer(classificationSize);
    this.buffers.branchIndices = this.createBuffer(classificationSize);
    this.buffers.ioIndices = this.createBuffer(classificationSize);
  }
  
  async executeProgram(): Promise<ArrayBuffer> {
    for (const phase of this.executable.executionPlan.phases) {
      await this.executePhase(phase);
    }
    
    return await this.readResults();
  }
  
  private async executeEpoch(): Promise<void> {
    await this.resetClassification();
    
    // Classification
    const commandEncoder = this.device.createCommandEncoder();
    const classifyPass = commandEncoder.beginComputePass();
    classifyPass.setPipeline(this.pipelines.classification);
    classifyPass.setBindGroup(0, this.bindGroups.classification);
    classifyPass.dispatchWorkgroups(Math.ceil(this.currentVMCount / 256));
    classifyPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
    
    await this.device.queue.onSubmittedWorkDone();
    
    // Read counts
    const counts = await this.readClassificationCounts();
    
    // Execute kernels
    const executionEncoder = this.device.createCommandEncoder();
    const executionPass = executionEncoder.beginComputePass();
    
    if (counts.linear > 0) {
      executionPass.setPipeline(this.pipelines.linear);
      executionPass.setBindGroup(0, this.bindGroups.linear);
      executionPass.dispatchWorkgroups(Math.ceil(counts.linear / 256));
    }
    
    if (counts.oracle > 0) {
      executionPass.setPipeline(this.pipelines.oracle);
      executionPass.setBindGroup(0, this.bindGroups.oracle);
      executionPass.dispatchWorkgroups(Math.ceil(counts.oracle / 256));
    }
    
    if (counts.branch > 0) {
      executionPass.setPipeline(this.pipelines.branch);
      executionPass.setBindGroup(0, this.bindGroups.branch);
      executionPass.dispatchWorkgroups(Math.ceil(counts.branch / 256));
    }
    
    if (counts.io > 0) {
      executionPass.setPipeline(this.pipelines.io);
      executionPass.setBindGroup(0, this.bindGroups.io);
      executionPass.dispatchWorkgroups(Math.ceil(counts.io / 256));
    }
    
    executionPass.end();
    this.device.queue.submit([executionEncoder.finish()]);
    
    await this.device.queue.onSubmittedWorkDone();
  }
}
