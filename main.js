Hooks.once("ready", () => {
  if (game.system.id !== "ptr1e") return;

  console.log("PTU Old Stats | Aguardando PTU finalizar");

  // espera o PTU terminar completamente
  setTimeout(() => {
    const ActorPTR = CONFIG.Actor.documentClass;

    if (!ActorPTR) {
      console.error("PTU Old Stats | ActorPTR não encontrado");
      return;
    }

    console.log("PTU Old Stats | Patchando Actor AGORA");

    const originalPrepareDerivedData = ActorPTR.prototype.prepareDerivedData;

    ActorPTR.prototype.prepareDerivedData = function () {
      originalPrepareDerivedData.call(this);

      if (!this.system?.stats) return;

      const result = calculateOldStatTotal(
        this.system.levelUpPoints?.value ?? 0,
        this.system.stats,
        {
          twistedPower: this.system.twistedPower,
          ignoreStages: false
        }
      );

      this.system.stats = result.stats;
      this.system.levelUpPoints.value = result.levelUpPoints;
    };

    console.log("PTU Old Stats | Patch aplicado com sucesso");
  }, 0);
});


/*function calculateOldStatTotal(levelUpPoints, stats, { twistedPower, ignoreStages }) {
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
*/