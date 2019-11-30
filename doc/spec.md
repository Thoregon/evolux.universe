##Universe

Write once run everywhere. The universe enables writing software which run on 'node' as well as in any browser as is. 

Provides rudimentary modules to complete the startup process. These can (will) then be replaced by specialized modules.
- bootlogger
- bootloader
- browserloader
- component repository

A loader and a repository hierarchy can be setup. (see ...) 

Handle routes like '/products/:id' everywhere the same

Allows to add event listeners to listen to changes of settings.

Listens itself to changes of the config

##Kindes of Peers/Nodes  
- full peers     --> sovereign node : can act standalone and connect to other peers
- browser peers  --> reliant node   : needs a service to load the app and maybe some communication facilities which 
are supplied by the service. Different initial setup/config and loaders are used to boot the app/system. 

Full nodes are divided into 'headless' and 'headed'. 
- 'sovereign headless' do not provide a user interface, they just do processing. Typically this is a nodeJS installation.
- 'sovereign headed' combines the full functionallity with a user interface. Typically it is a packaged Electron or mobile app.

Browser nodes are also divided into 'lite' and 'rich'.
- 'reliant lite' nodes represents basically a client with a user interface just with very little caching. 
Typically this is an app accessing 'localhost'
- 'reliant rich' nodes takls to services on the web, but can act offline, it maintains snapshots locally to have access to entities. 
There is only a sction of the snapshots available, not the whole 'universe'. 
Typically this is an app, loaded from web but runs locally. (or 'installed' --> progressive web app)    

This is called the nature and the density:
- nature: sovereign
    - density: headless
    - density: headed
- nature: reliant
    - density: lite
    - density: rich 

Reliant nodes must be as safe as sourvereign nodes. They are intended to run my apps on foreign devices without having
to install the apps fully and are accessible via a (web) service. Allows 'temporary' login if the device belongs to someone else.
Then the reliant node cleans up all data stored in the meantime, even if it is encoded anyways. There is the possibility to
define a date range, e.g. if I am using a device from the hotel when I am on vaction, or a device from a foreign company where
I am working.

However, there are no real logins. The UI the user is working with, act on behalf a of a verified identity, and is stateless 
in relation to the bounded context (Service/API) and the app.

##Comprehensive status query
A universe needs an extensive observation facility. There is an API for querying also for listening on status and status changes.
Works using pub/sub, doesn't replay events, starts with the current status. History can be queried.

