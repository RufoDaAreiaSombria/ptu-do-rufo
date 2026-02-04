Hooks.once("ready", () => {
  console.log("PTU Old Stats | Ativo");

  // segurança: só roda se o sistema for PTU
  if (game.system.id !== "ptr1e") return;

  // guarda referência da função nova (caso queira restaurar depois)
  const originalCalc = CONFIG.PTU.helpers?.calculateStatTotal;

  // substitui pela versão antiga
  CONFIG.PTU.helpers.calculateStatTotal = function (
    levelUpPoints,
    stats,
    options = {}
  ) {
    return calculateOldStatTotal(levelUpPoints, stats, options);
  };

  console.log("PTU Old Stats | Fórmula antiga aplicada");
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
