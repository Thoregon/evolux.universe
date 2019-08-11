##Universe

Write once run everywhere.

Handle routes like '/products/:id' everywhere the same

Allows to add event listeners to listen to changes of settings.

Listens itself to changes of the config

Supports 
    - full peers     --> sovereign node : can act standalone and connect to other peers
    - browser peers  --> reliant node   : needs a service to load the app and maybe some communication facilities which are supplied by the service 
Different initial setup/config and loaders are used to boot the app/system. 

Reliant nodes must be as safe as sourvereign nodes. They are intended to run my apps on foreign devices without having
to install the apps fully and are accessible via a (web) service.
