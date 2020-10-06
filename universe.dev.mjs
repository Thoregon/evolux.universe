/**
 * config
 **/

universe.shouldBeA = "A";
universe.register("shouldBeB", "B");

universe.signs = {
    dead: "☠",
    settings: "⚙",
    ok: "😎",
    angry: "😡",
    others: "💥🔥✨⚡💦❌♛💵💰🏄⚠️🚨🚀🐛🎉🎁🗃⚓⏳⏰🏺⛏⛱🎪💣👀🏊🖍🦄🌿⚽🎓🍹👾👽🐉🍁🔧🔍🚚🔗📃🎰🖖 👉👏💪👋☝️✌️"
};
universe.oops = "¯\\_(ツ)_/¯";

universe.atDawn(() => { universe.logger.debug("universe-dev: dawn hook invoke; got light"); });

universe.atDusk(() => { universe.logger.debug("universe-dev: dusk hook invoke; get dark"); });

/*
universe.atDawn(() => {
    universe.logger.debug("universe-dev: async dawn hook invoke");
    return new Promise((fulfill, reject) => {
        setTimeout(() => {
            universe.logger.debug("universe-dev: async dawn hook process");
            fulfill();
        }, 3000);
    });
});

universe.atDusk(() => {
    universe.logger.debug("universe-dev: async dusk hook invoke");
    return new Promise((fulfill, reject) => {
        setTimeout(() => {
            universe.logger.debug("universe-dev: async dusk hook process");
            fulfill();
        }, 3000);
    });
});
*/

