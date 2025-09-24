<!----------------------------------------------------------------------------->
# NOTES
<!----------------------------------------------------------------------------->

<!----------------------------------------------------------------------------->
## Async & I/O
<!----------------------------------------------------------------------------->

- add a WAIT state for the machine (WAIT, IO, ... etc)
    - it will not progress until woken up
        - NOTE: generator will go into a loop, so stop using it
    - every loop on a WAIT machine
        - checks to see if the channel has anything
            - if yes, it wakes the machine up and puts it the queue
            
- different WAIT stuff
    - [ WAIT, IO ]
        - for waiting on GET
    - [ WAIT, SLEEP, $timeout ]
        - for implementing timeouts

- GET then can be async
    - if the channel is not exhausted
        - put machine into WAIT state

<!----------------------------------------------------------------------------->
## Machine Wrappers
<!----------------------------------------------------------------------------->

- add wrappers around the Machine, for example:
    - processes and compacts the output to just be the retained values
    - takes output and sends it to another Machine as input
        - either at the very end, or streams it as it goes
    - threads several machines together into a single one
    - etc. 

- These wrappers can handle any kind of I/O stuff actually
    - if they can work with GET/PUT

- These wrappers can be used to create patterns such as:
    - a grid pattern of machines for matrix/image processing
        - assign machines in patterns or random, whatever works
    - a cell pattern of machines for cellular automata/simulations
        - machine state can be condensed to a single value 
            - if managed carefully
        - similiar to the grid pattern, but ..
            - a sum/join/reduce machine processes the results
    - a map/reduce pattern of machines
        - divides the input to batches
        - creates reduce rendevous points
            - use a reduction machine here
    
- we can get a lot from here as well ...
    - https://puzzles.modular.com/introduction.html
    - specifically the Warp/Block/Etc. level ideas
        - which can be mapped into wrappers


<!----------------------------------------------------------------------------->
## Misc. Cleanup
<!----------------------------------------------------------------------------->

- make datatypes abstract/polymophic
    - ADD, SUB, etc. should work for scalar, vectors and matrices
    - similarly for other operations when possible
    - the actual ADD, SUB, etc. functions can be "microcode" 
        - if pure, they should be easily resused
            - on simple scalars
            - mapped across two lists of values
            - elementwise over two matrices
            - whatever 

- clean up the output log format
    - we can pass the value, the old state and new state
        - this means making the state immutable
            - which is a good thing

- the various ERR states are not handled correctly
    - specifically the `op` is not being used at all
        - come up with a better approach overall
        - but probably fix this in the output log format cleanup
        
<!----------------------------------------------------------------------------->
