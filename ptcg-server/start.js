require('./config');

const { App } = require('./output/backend/app');
const { BotManager } = require('./output/game/bots/bot-manager');
const { SimpleBot } = require('./output/simple-bot/simple-bot');
const { AdvancedBot } = require('./output/advanced-bot/advanced-bot');
const { CardManager } = require('./output/game/cards/card-manager');
const { StateSerializer } = require('./output/game/serializer/state-serializer');
const { config } = require('./output/config');
const { Format } = require('./output/game/store/card/card-types');
const sets = require('./output/sets');
const process = require('process');

require('dotenv').config({ path: require('find-config')('.env') })

const cardManager = CardManager.getInstance();

const allSets = Object.keys(sets)
  .filter(key => key.startsWith('set') && Array.isArray(sets[key]))
  .map(key => ({ key: 'sets.' + key, cards: sets[key] }));

const validationErrors = CardManager.validateAllSets(allSets);
if (validationErrors.length > 0) {
  console.error('Card manager validation failed:');
  validationErrors.forEach(err => console.error(err));
  console.log('Application not started.');
  process.exit(1);
}

// Base set era
cardManager.defineSet(sets.setBaseSetEnergy);
cardManager.defineSet(sets.setWOTCPromos);
cardManager.defineSet(sets.setVendingSeries);

cardManager.defineSet(sets.setBaseSet);
cardManager.defineSet(sets.setJungle);
cardManager.defineSet(sets.setFossil);
cardManager.defineSet(sets.setTeamRocket);
cardManager.defineSet(sets.setGymHeros);
cardManager.defineSet(sets.setGymChallenge);

cardManager.defineSet(sets.setGameBoyExclusives);

// Neo era
cardManager.defineSet(sets.setNeoGenesis);
cardManager.defineSet(sets.setNeoDiscovery);
cardManager.defineSet(sets.setNeoRevelation);
cardManager.defineSet(sets.setNeoDestiny);

cardManager.defineSet(sets.setSouthernIslands);

// e-Card era
cardManager.defineSet(sets.setExpedition);
cardManager.defineSet(sets.setAquapolis);
cardManager.defineSet(sets.setSkyridge);

cardManager.defineSet(sets.setBestOfGame);

// ex era
cardManager.defineSet(sets.setNintendoPromos);
cardManager.defineSet(sets.setUnnumberedPromos);

cardManager.defineSet(sets.setEXRubyAndSapphire);
cardManager.defineSet(sets.setEXSandstorm);
cardManager.defineSet(sets.setEXDragon);
cardManager.defineSet(sets.setEXTeamMagmaVsTeamAqua);
cardManager.defineSet(sets.setEXHiddenLegends)
cardManager.defineSet(sets.setEXFireRedLeafGreen);
cardManager.defineSet(sets.setEXTeamRocketReturns);
cardManager.defineSet(sets.setEXDeoxys);
cardManager.defineSet(sets.setEXEmerald);
cardManager.defineSet(sets.setEXUnseenForces);
cardManager.defineSet(sets.setEXDeltaSpecies);
cardManager.defineSet(sets.setEXLegendMaker);
cardManager.defineSet(sets.setEXHolonPhantoms);
cardManager.defineSet(sets.setEXCrystalGuardians);
cardManager.defineSet(sets.setEXDragonFrontiers);
cardManager.defineSet(sets.setEXPowerKeepers);

cardManager.defineSet(sets.setPOPSeries2);
cardManager.defineSet(sets.setPOPSeries3);
cardManager.defineSet(sets.setPOPSeries4);
cardManager.defineSet(sets.setPOPSeries5);
cardManager.defineSet(sets.setPOPSeries8);

cardManager.defineSet(sets.setPCGLPromotionalCards);
cardManager.defineSet(sets.setPCGPPromotionalCards);
cardManager.defineSet(sets.setPokeParkPremiumFiles);
cardManager.defineSet(sets.setGiftBoxMewLucario);

// VS Packs
cardManager.defineSet(sets.setVSPackAurasLucario);

cardManager.defineSet(sets.setDiamondAndPearlPromos);
cardManager.defineSet(sets.setLPPromos);
cardManager.defineSet(sets.setBattleRoadPromos);
cardManager.defineSet(sets.setDiamondAndPearl);
cardManager.defineSet(sets.setMysteriousTreasures);
cardManager.defineSet(sets.setSecretWonders);
// cardManager.defineSet(sets.setOP9);
cardManager.defineSet(sets.setGreatEncounters);
cardManager.defineSet(sets.setLegendsAwakened);
cardManager.defineSet(sets.setStormfront);
cardManager.defineSet(sets.setMajesticDawn);

cardManager.defineSet(sets.setPlatinum);
cardManager.defineSet(sets.setRisingRivals);
cardManager.defineSet(sets.setSupremeVictors);
cardManager.defineSet(sets.setArceus);

cardManager.defineSet(sets.setHeartGoldAndSoulSilver);
cardManager.defineSet(sets.setHeartGoldAndSoulSilverPromos);
cardManager.defineSet(sets.setUnleashed);
cardManager.defineSet(sets.setUndaunted);
cardManager.defineSet(sets.setTriumphant);
cardManager.defineSet(sets.setCallOfLegends);

// BW era
cardManager.defineSet(sets.setBlackAndWhitePromos);
cardManager.defineSet(sets.setBlackAndWhite);
cardManager.defineSet(sets.setEmergingPowers);
cardManager.defineSet(sets.setNobleVictories);
cardManager.defineSet(sets.setNextDestinies);
cardManager.defineSet(sets.setDarkExplorers);
cardManager.defineSet(sets.setDragonsExalted);
cardManager.defineSet(sets.setDragonsMajesty);
cardManager.defineSet(sets.setDragonVault);
cardManager.defineSet(sets.setBoundariesCrossed);
cardManager.defineSet(sets.setPlasmaStorm);
cardManager.defineSet(sets.setPlasmaFreeze);
cardManager.defineSet(sets.setPlasmaBlast);
cardManager.defineSet(sets.setLegendaryTreasures);

// XY era
cardManager.defineSet(sets.setXYPromos);
cardManager.defineSet(sets.setXY);
cardManager.defineSet(sets.setFlashfire);
cardManager.defineSet(sets.setFuriousFists);
cardManager.defineSet(sets.setPhantomForces);
cardManager.defineSet(sets.setPrimalClash);
cardManager.defineSet(sets.setRoaringSkies);
cardManager.defineSet(sets.setDoubleCrisis);
cardManager.defineSet(sets.setAncientOrigins);
cardManager.defineSet(sets.setBreakpoint);
cardManager.defineSet(sets.setBreakthrough);
cardManager.defineSet(sets.setFatesCollide);
cardManager.defineSet(sets.setGenerations);
cardManager.defineSet(sets.setSteamSiege);
cardManager.defineSet(sets.setEvolutions);

// SuMo era
cardManager.defineSet(sets.setSunAndMoonPromos);
cardManager.defineSet(sets.setSunAndMoon);
cardManager.defineSet(sets.setGuardiansRising);
cardManager.defineSet(sets.setBurningShadows);
cardManager.defineSet(sets.setShiningLegends);
cardManager.defineSet(sets.setCrimsonInvasion);
cardManager.defineSet(sets.setUltraPrism);
cardManager.defineSet(sets.setForbiddenLight);
cardManager.defineSet(sets.setCelestialStorm);
cardManager.defineSet(sets.setLostThunder);
cardManager.defineSet(sets.setTeamUp);
cardManager.defineSet(sets.setDetectivePikachu);
cardManager.defineSet(sets.setUnbrokenBonds);
cardManager.defineSet(sets.setUnifiedMinds);
cardManager.defineSet(sets.setHiddenFates);
cardManager.defineSet(sets.setCosmicEclipse);

// SwSh era
cardManager.defineSet(sets.setSwordAndShieldPromos);
cardManager.defineSet(sets.setSwordAndShield);
cardManager.defineSet(sets.setRebelClash);
cardManager.defineSet(sets.setDarknessAblaze);
cardManager.defineSet(sets.setChampionsPath);
cardManager.defineSet(sets.setVividVoltage);
cardManager.defineSet(sets.setShiningFates);
cardManager.defineSet(sets.setBattleStyles);
cardManager.defineSet(sets.setChillingReign);
cardManager.defineSet(sets.setEvolvingSkies);
cardManager.defineSet(sets.setCelebrations);
cardManager.defineSet(sets.setFusionStrike);
cardManager.defineSet(sets.setBrilliantStars);
cardManager.defineSet(sets.setAstralRadiance);
cardManager.defineSet(sets.setPokemonGO);
cardManager.defineSet(sets.setLostOrigin);
cardManager.defineSet(sets.setSilverTempest);
cardManager.defineSet(sets.setCrownZenith);

// SV era
cardManager.defineSet(sets.setScarletAndVioletEnergy);
cardManager.defineSet(sets.setScarletAndVioletPromos);
cardManager.defineSet(sets.setScarletAndViolet);
cardManager.defineSet(sets.setPaldeaEvolved);
cardManager.defineSet(sets.setObsidianFlames);
cardManager.defineSet(sets.setPokemon151);
cardManager.defineSet(sets.setParadoxRift);
cardManager.defineSet(sets.setPaldeanFates);
cardManager.defineSet(sets.setTemporalForces);
cardManager.defineSet(sets.setTwilightMasquerade);
cardManager.defineSet(sets.setShroudedFable);
cardManager.defineSet(sets.setStellarCrown);
cardManager.defineSet(sets.setSurgingSparks);
cardManager.defineSet(sets.setPrismaticEvolution);
cardManager.defineSet(sets.setJourneyTogether);
cardManager.defineSet(sets.setDestinedRivals);
cardManager.defineSet(sets.setSV11);

// Mega era
cardManager.defineSet(sets.setMegaEvolutionEnergy);
cardManager.defineSet(sets.setMegaEvolutionPromos);
cardManager.defineSet(sets.setMegaEvolution);
cardManager.defineSet(sets.setPhantasmalFlames);
cardManager.defineSet(sets.setAscendedHeroes);
cardManager.defineSet(sets.setPerfectOrder);
cardManager.defineSet(sets.setChaosRising);
cardManager.defineSet(sets.setPitchBlack);
cardManager.defineSet(sets.setDeltaReign);
cardManager.defineSet(sets.set30thCelebration);
cardManager.defineSet(sets.setMegaStarterDeck);
cardManager.defineSet(sets.setMegaXMegaParade);
cardManager.defineSet(sets.setAuraSeeker);

cardManager.defineSet(sets.setTest);

StateSerializer.setKnownCards(cardManager.getAllCards());

if (process.argv.includes('--backfill')) {
  require('./scripts/backfill-deck-formats').run()
    .then(() => {
      console.log('Deck formats backfill complete.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Backfill failed:', err.message);
      process.exit(1);
    });
  return;
}

const botManager = BotManager.getInstance();
// Hedrick Worlds 2026 Crushing Hammer Dragapult (Standard)
// botManager.registerBot(new AdvancedBot('Hedrick Dragapult'));
// botManager.registerBot(new SimpleBot('Gardevoir'));
// botManager.registerBot(new SimpleBot('Charizard'));
// botManager.registerBot(new SimpleBot('LostBox'));
// const lugiaBot = new SimpleBot('Lugia');
// lugiaBot.setDeck(Format.STANDARD_NIGHTLY, ["Lillie's Clefairy ex JTG", "Team Rocket's Articuno DRI", "Team Rocket's Mewtwo ex DRI", "Team Rocket's Mewtwo ex DRI", "Team Rocket's Mimikyu DRI", "Team Rocket's Tarountula DRI", "Team Rocket's Tarountula DRI", "Team Rocket's Tarountula DRI", "Team Rocket's Tarountula DRI", "Team Rocket's Spidops DRI", "Team Rocket's Spidops DRI", "Team Rocket's Spidops DRI", "Team Rocket's Spidops DRI", "Team Rocket's Archer DRI", "Team Rocket's Ariana DRI", "Team Rocket's Ariana DRI", "Team Rocket's Ariana DRI", "Team Rocket's Ariana DRI", "Team Rocket's Giovanni DRI", "Team Rocket's Giovanni DRI", "Team Rocket's Giovanni DRI", "Team Rocket's Petrel DRI", "Team Rocket's Proton DRI", "Team Rocket's Proton DRI", "Earthen Vessel PAR", "Earthen Vessel PAR", "Earthen Vessel PAR", "Energy Switch SVI", "Energy Switch SVI", "Energy Switch SVI", "Energy Switch SVI", "Night Stretcher SFA", "Night Stretcher SFA", "Team Rocket's Great Ball DRI", "Team Rocket's Great Ball DRI", "Team Rocket's Receiver DRI", "Team Rocket's Receiver DRI", "Team Rocket's Receiver DRI", "Team Rocket's Receiver DRI", "Ultra Ball PAF", "Ultra Ball PAF", "Ultra Ball PAF", "Ultra Ball PAF", "Bravery Charm PAL", "Bravery Charm PAL", "Lucky Helmet TWM", "Lucky Helmet TWM", "Maximum Belt TEF", "Team Rocket's Factory DRI", "Team Rocket's Factory DRI", "Team Rocket's Factory DRI", "Grass Energy SVE", "Grass Energy SVE", "Grass Energy SVE", "Psychic Energy SVE", "Psychic Energy SVE", "Team Rocket Energy DRI", "Team Rocket Energy DRI", "Team Rocket Energy DRI", "Team Rocket Energy DRI"]);
// botManager.registerBot(lugiaBot);
// botManager.registerBot(new SimpleBot('Dragapult'));
// botManager.registerBot(new SimpleBot('Standard', {}, [Format.STANDARD]));
// botManager.registerBot(new SimpleBot('Standard Nightly', {}, [Format.STANDARD_NIGHTLY]));
// botManager.registerBot(new SimpleBot('Expanded', {}, [Format.EXPANDED]));
// botManager.registerBot(new SimpleBot('GLC', {}, [Format.GLC]));
// botManager.registerBot(new SimpleBot('Retro', {}, [Format.RETRO]));
// botManager.registerBot(new SimpleBot('Theme', {}, [Format.THEME]));

const app = new App();

app.connectToDatabase()
  .catch(error => {
    console.log('Unable to connect to database.');
    console.error(error.message);
    process.exit(1);
  })
  .then(() => app.configureBotManager(botManager))
  .then(() => app.start())
  .then(() => {
    const address = config.backend.address;
    const port = config.backend.port;
    console.log('Application started on ' + address + ':' + port + '.');
  })
  .catch(error => {
    console.error(error.message);
    console.log('Application not started.');
    process.exit(1);
  });
