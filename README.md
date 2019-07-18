# evolux.universe

The 'universe' abstracts the notion of a distinct global environment, with its own global object.
It is a realm representing the universe of the distributed system making all peers and networks transparent.

Inflates the universe; Bootloader for Thore͛gon system, components and apps on the peer/node 

Usage:

    const letThereBeLight = require('universe').letThereBeLight;     
    letThereBeLight().then( universe => { } );
    
or ES6 style

    import letThereBeLight from 'universe'; 
    const universe = await letTheBeLight();

Depending on the STAGE setting - which can be free defined - the relevant config script will be loaded.

Config scripts will be search from the current workig directory, if not found starting from the modules
directory up to the working directory.

Name convention for the config script:
- universe.config.mjs       ... standard config, will be loaded if found as first script
- universe.<STAGE>.mjs      ... script for the stage, if found will be loaded afer standard config

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
    
Function hooks for dawn (inflation) and dusk (freeze) are available. The functions can be async.

      protouniverse.atDawn(() => { universe.logger.debug("universe-dev: dawn hook invoke; got light"); });
      
      protouniverse.atDusk(() => { universe.logger.debug("universe-dev: dusk hook invoke; get dark"); });

There is no timeout, it is up to you to do proper initialization in time. 
If you wish a timeout for the inflation phase (dawn), set it with

    protouniverse.timeout4dawn(seconds)
    
For dusk, before the universe freezes, the is a predefined timeout of max 15 seconds. This cannot
be changed, the universe will freeze always.
  
