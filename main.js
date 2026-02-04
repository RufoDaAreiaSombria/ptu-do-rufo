console.log("PTU Old Stats | Patchando Actor");
alert("PTU DO RUFO: main.js carregou");

Hooks.once("ready", () => {
  if (game.system.id !== "ptr1e") return;

  const ActorPTR = CONFIG.Actor.documentClass;

  const originalPrepareDerivedData = ActorPTR.prototype.prepareDerivedData;

  ActorPTR.prototype.prepareDerivedData = function () {
    originalPrepareDerivedData.call(this);

    const system = this.system;
    if (!system?.stats) return;

    const result = calculateOldStatTotal(
      system.levelUpPoints?.value ?? 0,
      system.stats,
      {
        twistedPower: system.twistedPower,
        ignoreStages: false
      }
    );

    system.stats = result.stats;
    system.levelUpPoints.value = result.levelUpPoints;
  };

  console.log("PTU Old Stats | Fórmula antiga aplicada no Actor");
});

function calculateOldStatTotal(levelUpPoints, stats, { twistedPower, ignoreStages }) {
  for (const [key, value] of Object.entries(stats)) {
    const sub =
      value.value +
      value.mod.value +
      value.mod.mod +
      value.levelUp;

    levelUpPoints -= value.levelUp;

    if (ignoreStages) {
      value.total = sub;
      continue;
    }

    const stage = (value.stage?.value ?? 0) + (value.stage?.mod ?? 0);

    if (stage > 0) {
      value.total = Math.floor(sub * stage * 0.2 + sub);
    } else {
      value.total = key === "hp"
        ? sub
        : Math.ceil(sub * stage * 0.1 + sub);
    }
  }

  if (twistedPower) {
    const atk = stats.atk.total;
    const spatk = stats.spatk.total;
    stats.atk.total += Math.floor(spatk / 2);
    stats.spatk.total += Math.floor(atk / 2);
  }

  return { levelUpPoints, stats };
}
