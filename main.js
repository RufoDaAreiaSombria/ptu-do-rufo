Hooks.once("ready", () => {
  if (game.system.id !== "ptu") return;

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

  let levelUpPoints =
    typeof system.levelUpPoints === "number"
      ? system.levelUpPoints
      : system.levelUpPoints?.value ?? 0;

  for (const [key, value] of Object.entries(stats)) {
    // -------------------
    // SUBTOTAL BASE
    // -------------------
    const natureMod = getNatureModifier(key, system.nature);

    let sub =
      value.value +
      value.mod.value +
      value.mod.mod +
      value.levelUp +
      natureMod;

    levelUpPoints -= value.levelUp;

    // -------------------
    // COMBAT STAGES
    // -------------------
    const stage =
      (value.stage?.value ?? 0) +
      (value.stage?.mod ?? 0);

    let total;
    if (stage > 0) {
      total = Math.floor(sub * stage * 0.2 + sub);
    } else if (stage < 0) {
      total = Math.ceil(sub * stage * 0.1 + sub);
    } else {
      total = sub;
    }

    value.total = total;
  }

  // -------------------
  // LEVEL UP POINTS (safe)
  // -------------------
  if (typeof system.levelUpPoints === "number") {
    system.levelUpPoints = levelUpPoints;
  } else if (system.levelUpPoints?.value !== undefined) {
    system.levelUpPoints.value = levelUpPoints;
  }
}
