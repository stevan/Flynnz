# Execution Model

## Phase-Based Execution

The runtime executes programs in discrete phases, where each phase contains one or more routines that can run concurrently.

```typescript
enum VMStatus {
  RUNNING = 0,
  BLOCKED = 1,
  YIELDED = 2,
  HALTED = 3,
}

class GPUVMRuntime {
  async executeProgram(executable: VMExecutable): Promise<void> {
    await this.initializeBuffers(executable);
    
    for (const phase of executable.executionPlan.phases) {
      await this.executePhase(phase);
      await this.waitForPhaseCompletion(phase);
    }
    
    return await this.readResults(executable.bufferLayout.outputRegion);
  }
  
  async executePhase(phase: Phase): Promise<void> {
    const vmBatches: VMBatch[] = [];
    
    for (const phaseRoutine of phase.routines) {
      const routine = this.executable.routines[phaseRoutine.routineIndex];
      
      const vmBatch = await this.launchVMs({
        count: phaseRoutine.vmCount,
        entryPoint: routine.entryPoint,
        inputBuffers: phaseRoutine.inputBuffers,
        outputBuffers: phaseRoutine.outputBuffers,
      });
      
      vmBatches.push(vmBatch);
    }
    
    while (this.hasActiveVMs(vmBatches)) {
      await this.executeEpoch();
      await this.updateVMStatuses();
    }
  }
  
  async executeEpoch(): Promise<void> {
    // 1. Classification
    await this.dispatchClassificationKernel();
    
    // 2. Read classification results
    const counts = await this.readClassificationCounts();
    
    // 3. Dispatch execution kernels
    const kernelPromises: Promise<void>[] = [];
    
    if (counts.linear > 0) {
      kernelPromises.push(
        this.dispatchLinearKernel(counts.linear)
      );
    }
    
    if (counts.oracle > 0) {
      kernelPromises.push(
        this.dispatchOracleKernel(counts.oracle)
      );
    }
    
    if (counts.branch > 0) {
      kernelPromises.push(
        this.dispatchBranchKernel(counts.branch)
      );
    }
    
    if (counts.io > 0) {
      kernelPromises.push(
        this.dispatchIOKernel(counts.io)
      );
    }
    
    await Promise.all(kernelPromises);
  }
}
```

---
