Loaders
=======

!! Require permissions: files system, push messages

## Bootloader


## Component Descriptor

````js
    {
        "componentid": "",
        "uri": "",
    }
````
Dependencies
````js
    {
        "componentid": {
          "version": "",
          "uri": "",
        },
    }
````

## Loader
A generalized interface for component/module/class loading.

## Nodeloader

Translates from Loader to the [hooks](https://nodejs.org/dist/latest-v15.x/docs/api/esm.html#esm_hooks) 
for node.

## Browserloader

Runs in a service worker in the browser. This enables standalone apps w/o a server.



