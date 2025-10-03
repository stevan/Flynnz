# Control Flow

## Loops

Loops are implemented as backward jumps:

```assembly
# Count from 0 to 9
SETI r0, 0          # r0 = counter
SETI r1, 10         # r1 = limit

LOOP_START:         # Address 2
  LOAD r2, 5
  ADD r2, r2, r0
  STORE r2, 5
  
  SETI r3, 1
  ADD r0, r0, r3    # counter++
  SUB r3, r1, r0    # r3 = limit - counter
  BRANCH_GT r3, 2   # if r3 > 0, goto LOOP_START
  
HALT
```

## Function Calls

```assembly
# Main routine
SETI r0, 5
SETI r1, 7
CALL 10             # Call function at address 10
STORE r0, 15
HALT

# Function at address 10
MULTIPLY_FUNC:
  MUL r0, r0, r1
  RETURN
```

---
