export class Rules {

  public firstTurnDrawCard = true;

  public firstTurnUseSupporter = true;

  public attackFirstTurn = false;

  // If true, supporters remain in the play zone until end-turn cleanup.
  public supporterCleanupAtEndTurn = false;

  public unlimitedEnergyAttachments = false;

  public alternativeSetup = false;

  // If true, retreating a Confused Pokémon requires a coin flip; on tails the retreat fails.
  public confusedRetreatFlip = false;

  // If false, a player may retreat more than once per turn.
  public oneRetreatPerTurn = true;

  // If false, a player may play more than one Stadium card per turn.
  public oneStadiumPerTurn = true;

  // If true, a Stadium card may be played even if a Stadium with the same name is in play.
  public allowSameNameStadium = false;

  // If true, Fossil Trainer cards may be chosen as starting Pokémon during setup.
  public canStartWithFossil = false;

  // Old burn rule (2002-2017): flip a coin between turns. Heads: no damage, stays Burned.
  // Tails: burn damage, stays Burned. Burned is never removed automatically.
  public oldBurnRule = false;

  constructor(init: Partial<Rules> = {}) {
    Object.assign(this, init);
  }

}
