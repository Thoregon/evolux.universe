# evolux.universe

Inflates the universe; Bootloader for Thore͛gon system, components and apps on the peer/node 

Usage:

    require('universe').letThereBeLight().then( universe => { } );

Depending on the STAGE, the relevant config script will be loaded.

It is a script (.js) not a definition (.json), means you can do whatever you want, e.g. doing
initializations of tunnels etc. But be carefull, if the script fails, processing will be stopped 
which circumvents the inflation of the universe. The config may also do async initializations,
inflation will wait until all async operations did finish. 

There is no timeout, it is up to you to do proper initialization in time. 
If you wish a timeout for the inflation phase (dawn), set it with

    universe.timeout4dawn(seconds)
    
For dusk, before the universe freezes, the is a predefined timeout of max 15 seconds. This cannot
be changed, the universe will freeze always.
  
