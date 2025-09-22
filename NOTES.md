<!----------------------------------------------------------------------------->
# NOTES
<!----------------------------------------------------------------------------->

<!----------------------------------------------------------------------------->
## Misc. Cleanup
<!----------------------------------------------------------------------------->

- clean up the output log format
    - a lot of it can be inferred now from the machine state
    - we can pass the value, the old state and new state
        - this means making the state immutable
            - which is a good thing

- make the binop and unop methods in the stack do more
    - pass in a bin or un function and it can lift it

<!----------------------------------------------------------------------------->
## I/O 
<!----------------------------------------------------------------------------->

- make a new COMM state
    - for when communicating with I/O and other things
    - add PUT, GET operations for I/O
    - this COMM state can be async as well
    
- PUT
    - this will mark the output log to retain things 
- GET 
    - this will grab the next item from the input queue

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


<!----------------------------------------------------------------------------->
