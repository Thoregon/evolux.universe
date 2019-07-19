# evolux.universe

The 'universe' abstracts the notion of a distinct global environment with its own global object.
It is a realm representing the universe of the distributed system and making all peers and networks transparent.
The whole network with all its peers looks like one single computer.

Usage:

    const letThereBeLight = require('universe').letThereBeLight;     
    letThereBeLight().then( universe => { } );
    
or ES6 style

    import letThereBeLight from 'universe'; 
    const universe = await letTheBeLight();

Inflates the universe  
Bootloader from Thoregon system, components and apps on the peer/node 

##Command line params

    -s  ... stage, 'DEV' if omitted, the default config script and the script for DEV will be loaded if exists 
    -c  ... config script, overrides all other and is loaded alone 
    -b  ... basedir to search for config scripts
    -l  ... let: a list of variable declarations, overrides vars from config. Form: -l var1=val1 var2=val2 
    
see below the naming convention for config scripts

##Environment variables
- THOREGON_STAGE    ... name of the STAGE for this installation, same as option -s
- THOREGON_BASEDIR  ... basedir to find the config scripts, same as option -b
Command line param winns!

Depending on the STAGE setting - which can be free defined - the relevant config script will be loaded.

##Config scripts 
will be seeked in the current workig directory, if not specified with option -b.

Name convention for the config script:
- universe.config.mjs       ... standard config, will be loaded if found as first script
- universe.<STAGE>.mjs      ... script for the stage, if found will be loaded after standard config. <STAGE> will always be lowercase!

It is a module script (.mjs) not a definition (.json), means you can do whatever you want, e.g. doing
initializations of tunnels etc. But be carefull, if the script fails, processing will be stopped 
which circumvents the inflation of the universe. The config may also do async initializations,
inflation will wait until all async operations did finish. 

To define your settings setting it on the protouniverse:
        
    protouniverse.mydef = "MyDef";

The 'protouniverse' will only be available in the inflation scripts, after inflation (letThereBeLight) the golbal
variable '' is available where all your definitions can be found. 
Later in your app your settings this can be referenced by:

    universe.mydef

If you have settngs which are equal for all stages, just create a 'config.js' and require it in every 'universe' config.
    
Function hooks for dawn (after inflation) and dusk (before freeze) are available. The functions can be async.

      protouniverse.atDawn( () => universe.logger.debug("dawn hook invoke; got light") );
      
      protouniverse.atDusk( () => universe.logger.debug("dusk hook invoke; get dark") );

There is no timeout, it is up to you to do proper initialization in time. 
If you wish a timeout for the inflation phase (dawn), set it with

    protouniverse.timeout4dawn(seconds)
    
For dusk, before the universe freezes, the is a predefined timeout of max 15 seconds. This cannot
be changed, the universe will freeze always.
  
