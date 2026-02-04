Hooks.once("ready", () => {
  if (game.system.id !== "ptr1e") return;

  console.log("PTU Old Stats | Módulo ativo");

  // pega o prototype real do sistema PTR
  const ActorPTR = CONFIG.Actor.documentClass;

  if (!ActorPTR?.prototype?.prepareData) {
    console.error("PTU Old Stats | prepareData não encontrado");
    return;
  }

  const originalPrepareData = ActorPTR.prototype.prepareData;

  ActorPTR.prototype.prepareData = function () {
    // deixa o PTU fazer TUDO primeiro
    originalPrepareData.call(this);

    // agora sim, ajusta apenas os totais
    if (!this.system?.stats) return;

    applyOldStatTotals(this.system);
  };

  console.log("PTU Old Stats | Patch aplicado com sucesso");
});

function applyOldStatTotals(system) {
  const stats = system.stats;
  let levelUpPoints = system.levelUpPoints?.value ?? 0;

  for (const [key, value] of Object.entries(stats)) {
    const sub =
      value.value +
      value.mod.value +
      value.mod.mod +
      value.levelUp;

    levelUpPoints -= value.levelUp;

    const stage =
      (value.stage?.value ?? 0) +
      (value.stage?.mod ?? 0);

    let total;
    if (stage > 0) {
      total = Math.floor(sub * stage * 0.2 + sub);
    } else {
      total = key === "hp"
        ? sub
        : Math.ceil(sub * stage * 0.1 + sub);
    }

    // ⚠️ MUITO IMPORTANTE:
    // só muda o campo total, não o objeto inteiro
    value.total = total;
  }

  system.levelUpPoints.value = levelUpPoints;
}



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