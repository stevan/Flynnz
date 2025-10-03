
# Flynn's Taxonomy Arcade

## See Also

- https://en.wikipedia.org/wiki/Flynn%27s_taxonomy
- https://en.wikipedia.org/wiki/Tron



So the plan for the language is still evolving. 

I plan to keep it high level, similar to Perl/Python/JS. This allows me to 
handle the "SYSCALL" elements on the CPU side, and push relevant data to 
the GPU while scheduling the next block. 

The language will be multi-paradigm, to allow for concisely expressing some 
of the different parallelism constructions. For instance, ...

- Imperative
    - things such as for/foreach loops can be transformed 
        - we will have plenty of information to make the best choice
            - loop unrolling, etc. 
    - sequential statements are good because straight line code is one of our sweet spots
        - we optionally enforce single assignment semantics within a block using Perl 5 style "pragmas"
        
- Functional
    - we can benefit a lot from things like immutability and pure functions
        - the former allows us to re-use memory effectively
            - something which will be important inside the GPU
        - the later allows us to inline small functions for speed
            - this gives us even more control/possibilies when building blocks
            - it also meshes quite well with lambda calculus function composition `(f.g) = f(g())`
            
- Dataflow
    - we plan to incorporate streams as a core construct of the language
        - they would be syncronous and modeled after the Java 8 Stream concept (not the API exactly)
            - possibley async in the future, but that's too complex for now
            
- Concurrent
    - the CPU side of the language would have Actors as their main organizing construct
        - these actors would be made up mostly of the Functional and Imperative code 
        - the Dataflow code would be used to express the ways in which the actors interoperate
        
