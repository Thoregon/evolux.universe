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

Supports 
- full peers     --> sovereign node : can act standalone and connect to other peers
- browser peers  --> reliant node   : needs a service to load the app and maybe some communication facilities which 
are supplied by the service. Different initial setup/config and loaders are used to boot the app/system. 

There will be also distinguished betwwen 'lite' browser peers, which talks to a sovereign node on localhost, and 
'heavy' browser peers, which will also store snapshots localy. The 'lite' peers works with localhost as remote.

Reliant nodes must be as safe as sourvereign nodes. They are intended to run my apps on foreign devices without having
to install the apps fully and are accessible via a (web) service. Allows 'temporarty' login if the device belongs to someone else.
Then the reliant node cleans up all data stored in the meantime, even if it is encoded anyways. There is the possibility to
define a date range, e.g. if I am using a device from the hotel when I am on vaction, or a device from a foreign company where
I am working.
