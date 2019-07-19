/**
 * config
 **/

protouniverse.shouldBeA = "A";
protouniverse.register("shouldBeB", "B");

protouniverse.signs = {
    dead: "☠",
    settings: "⚙",
    ok: "😎",
    angry: "😡",
    others: "💥🔥✨⚡💦❌♛💵💰🏄⚠️🚨🚀🐛🎉🎁🗃⚓⏳⏰🏺⛏⛱🎪💣👀🏊🖍🦄🌿⚽🎓🍹👾👽🐉🍁🔧🔍🚚🔗📃🎰🖖 👉👏💪👋☝️✌️"
};
protouniverse.oops = "¯\\_(ツ)_/¯";

protouniverse.atDawn(() => { protouniverse.logger.debug("universe-dev: dawn hook invoke; got light"); });

protouniverse.atDusk(() => { protouniverse.logger.debug("universe-dev: dusk hook invoke; get dark"); });

/*
protouniverse.atDawn(() => {
    protouniverse.logger.debug("universe-dev: async dawn hook invoke");
    return new Promise((fulfill, reject) => {
        setTimeout(() => {
            protouniverse.logger.debug("universe-dev: async dawn hook process");
            fulfill();
        }, 3000);
    });
});

protouniverse.atDusk(() => {
    protouniverse.logger.debug("protouniverse-dev: async dusk hook invoke");
    return new Promise((fulfill, reject) => {
        setTimeout(() => {
            protouniverse.logger.debug("protouniverse-dev: async dusk hook process");
            fulfill();
        }, 3000);
    });
});
*/

