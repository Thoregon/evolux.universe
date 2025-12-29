/**
 * Uload handler to close resurces
 *
 * @author: blukassen
 */

/**
 * The Shutdown Handler
 */
let isShuttingDown = false;

let exitfn;
let uncaughtfn;

class Unload {

    add(shutdownfn) {
        if (exitfn) console.warn('>> shutdownfn was already set, will be overridden');
        // call fn only once
        exitfn = shutdownfn;
    }

    uncaught(fn) {
        if (uncaughtfn) console.warn('>> uncaughtfn was already set, will be overridden');
        uncaughtfn = fn;
    }
}

const unload = new Unload();

/**
 *
 * @param signal
 * @returns {Promise<void>}
 */
async function gracefulShutdown(signal) {
    if (isShuttingDown) return; // Prevent multiple triggers
    isShuttingDown = true;

    console.log(`\n**** SHUTDOWN: Received ${signal}. Starting graceful shutdown...`);

    // 1. Set a forced timeout (fail-safe)
    // If cleanup takes too long (e.g., 10s), force exit.
    const timeout = setTimeout(() => {
        console.error('>> shutdown: Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, thoregon.isDev ? 25000 : 3000);

    try {
        // 2. Close Database Handles
        console.log('-- shutdown: B4 exit hook');
        await exitfn?.(0);
        console.log('>> shutdown: exit hook DONE');
        clearTimeout(timeout);
        process.exit(0);
    } catch (err) {
        console.error('>> shutdown: Error during shutdown:', err, err.stack);
        process.exit(1);
    }
}

/**
 * Signal Listeners
 */

// SIGINT: Triggered by Ctrl+C in the terminal
process.on('SIGINT', async () => await gracefulShutdown('SIGINT'));

// SIGTERM: Triggered by process managers like Docker, Kubernetes, or PM2
process.on('SIGTERM', async () => await gracefulShutdown('SIGTERM'));

// SIGQUIT: often used for core dumps.
process.on('SIGQUIT', async () => await gracefulShutdown('SIGQUIT'));

// don't do anything in this handler, it will called just before the process ends. any async functions will not be called!
process.on('exit', (code) => {
    console.log(`\n**** SHUTDOWN: Exiting ${code}`);
});

//
// error handlers
//

// Optional: Handle uncaught errors to ensure cleanup
process.on('uncaughtException', async (err) => {
    console.error('>> Uncaught Exception:', err, err.stack);
    await uncaughtfn?.();
    await global.universe?.MailSender?.sen
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('>> Unhandled Rejection at:', promise, 'reason:', reason);
    await uncaughtfn?.();
});

export default unload;
