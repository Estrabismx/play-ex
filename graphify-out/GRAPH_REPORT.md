# Graph Report - play-ex  (2026-11-08)

## Corpus Check
- 139 files · ~159,947 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 9, .WAD 1, .data 1)

## Summary
- 1475 nodes · 3999 edges · 76 communities (57 shown, 19 thin omitted)
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 1042 edges (avg confidence: 0.85)
- Token cost: 88,659 input · 0 output

## Community Hubs (Navigation)
- Screen Display & Finale
- Sector Specials (Doors, Ceilings)
- Phone Controller (control.js)
- Monster AI & Map Objects
- Menu, Save & WAD
- PC Host Page (main.js)
- HUD Text Library
- Player Weapon Actions
- Finale & HUD Ticker
- Moving Sector Thinkers
- Sound Lookup & Level Loading
- Spawning & Randomness
- Enemy Hitscan Attacks
- Status Bar Widgets
- Native Sound Driver
- Network Packet Layer
- Input Responders & Cheats
- Map Traversal & Use
- Net & Player State Headers
- Engine Startup & Args
- Automap Drawing
- Demo & Title Loop
- Native Video Driver
- Save Files & Screenshots
- Web Sound Driver
- BSP Rendering
- Level & Game Lifecycle
- Renderer Init & Tables
- Automap Scaling
- Doomy Web Engine Hooks
- Sprite & Masked Rendering
- Main Loop & Tic Commands
- Shared Definitions (comun.js)
- Emscripten Virtual FS
- Web Keyboard & Mouse Input
- Status Bar Lifecycle
- Phone Touch Controls Docs
- Lobby & Calibration UI
- DOOM Licensing & History
- Automap Lifecycle
- Demo Recording & Quit
- Damage & Level Exit
- Texture Columns & Planes
- Sound Channels
- Zone Memory Allocator
- PC Game View & Pause
- MQTT Broker & Topics
- Line of Sight
- Sensor Mapping & Conflicts
- X11 Window Setup
- Palette & Screen Read
- Wasm Run Lifecycle
- Music & Level Transitions
- Bounding Boxes
- Super Shotgun Actions
- Player View Setup
- Wasm Memory Exports
- WebSocket Peer Events
- IDBFS Persistence
- FS Sync Callback
- Monster Sound Alert
- Teleporters
- Web Build Script
- Deferred Calls
- Exit Status
- Wasm Binary Locator
- Socket Listen
- FS Assertions
- SFX Lump Lookup
- FS Readdir
- Control Correr
- Control Lateral

## God Nodes (most connected - your core abstractions)
1. `I_Error()` - 92 edges
2. `S_StartSound()` - 77 edges
3. `P_Random()` - 47 edges
4. `Z_Malloc()` - 46 edges
5. `FixedMul()` - 42 edges
6. `W_CacheLumpName()` - 33 edges
7. `P_SetMobjState()` - 30 edges
8. `V_DrawPatch()` - 29 edges
9. `W_CacheLumpNum()` - 29 edges
10. `D_DoomMain()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `doomy_web.c engine functions (menu state, pause, autosave)` --conceptually_related_to--> `DOOM source code release (1997)`  [INFERRED]
  INSTRUCCIONES.md → doom/README.TXT
- `Estrabismx/DOOM browser repo (reference)` --conceptually_related_to--> `DOOM source code release (1997)`  [INFERRED]
  README.md → doom/README.TXT
- `wipe_exitMelt()` --calls--> `Z_Free()`  [INFERRED]
  doom/linuxdoom-1.10/f_wipe.c → doom/linuxdoom-1.10/z_zone.c
- `G_InitNew()` --calls--> `M_ClearRandom()`  [INFERRED]
  doom/linuxdoom-1.10/g_game.c → doom/linuxdoom-1.10/m_random.c
- `PacketGet()` --calls--> `I_Error()`  [INFERRED]
  doom/linuxdoom-1.10/i_net.c → doom/linuxdoom-1.10/i_system.c

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MQTT room protocol between PC and phones** — instrucciones_topic_estado, instrucciones_topic_host, instrucciones_topic_input, instrucciones_topic_jugador, index_page, control_page [INFERRED 0.85]
- **Phone input sensors** — instrucciones_sensor_giroscopio, instrucciones_sensor_acelerometro, instrucciones_sensor_tactil, instrucciones_sensor_microfono [EXTRACTED 1.00]
- **Seven assignable DOOM controls** — instrucciones_control_moverse, instrucciones_control_lateral, instrucciones_control_disparar, instrucciones_control_usar, instrucciones_control_correr, instrucciones_control_cambiar_arma, instrucciones_control_mapa [EXTRACTED 1.00]

## Communities (76 total, 19 thin omitted)

### Community 1 - "Screen Display & Finale"
Cohesion: 0.06
Nodes (59): D_Display(), D_PageDrawer(), F_BunnyScroll(), F_CastDrawer(), F_CastPrint(), F_Drawer(), F_DrawPatchCol(), F_TextWrite() (+51 more)

### Community 2 - "Sector Specials (Doors, Ceilings)"
Cohesion: 0.06
Nodes (46): G_SecretExitLevel(), EV_CeilingCrushStop(), EV_DoCeiling(), P_ActivateInStasisCeiling(), EV_DoDoor(), EV_DoLockedDoor(), EV_SlidingDoor(), EV_VerticalDoor() (+38 more)

### Community 3 - "Phone Controller (control.js)"
Cohesion: 0.09
Nodes (61): actualizarLecturasVisibles(), adelanteAcelerometro(), adelanteGiroscopio(), ajuste(), alApoyar(), alLevantar(), alMover(), alPresionarListo() (+53 more)

### Community 4 - "Monster AI & Map Objects"
Cohesion: 0.12
Nodes (55): A_BabyMetal(), A_BrainAwake(), A_BrainPain(), A_BrainSpit(), A_BruisAttack(), A_BspiAttack(), A_Chase(), A_CPosRefire() (+47 more)

### Community 5 - "Menu, Save & WAD"
Cohesion: 0.08
Nodes (52): G_DeferedInitNew(), G_LoadGame(), G_SaveGame(), G_ScreenShot(), M_ChangeDetail(), M_ChangeMessages(), M_ChooseSkill(), M_ClearMenus() (+44 more)

### Community 6 - "PC Host Page (main.js)"
Cohesion: 0.12
Nodes (43): alTeclado(), alternarPausa(), asignacionesDe(), borrarPartidas(), cargarMotor(), conectarBroker(), controlesDe(), crearCodigoSala() (+35 more)

### Community 7 - "HUD Text Library"
Cohesion: 0.12
Nodes (27): HUlib_addCharToTextLine(), HUlib_addLineToSText(), HUlib_addMessageToSText(), HUlib_addPrefixToIText(), HUlib_clearTextLine(), HUlib_delCharFromIText(), HUlib_delCharFromTextLine(), HUlib_drawIText() (+19 more)

### Community 8 - "Player Weapon Actions"
Cohesion: 0.18
Nodes (29): A_BFGsound(), A_CheckReload(), A_FireBFG(), A_FireCGun(), A_FireMissile(), A_FirePistol(), A_FirePlasma(), A_FireShotgun() (+21 more)

### Community 9 - "Finale & HUD Ticker"
Cohesion: 0.13
Nodes (3): F_CastTicker(), F_StartCast(), F_Ticker()

### Community 10 - "Moving Sector Thinkers"
Cohesion: 0.09
Nodes (18): P_AddActiveCeiling(), P_RemoveActiveCeiling(), T_MoveCeiling(), T_SlidingDoor(), T_VerticalDoor(), T_MoveFloor(), T_MovePlane(), P_RemoveActivePlat() (+10 more)

### Community 11 - "Sound Lookup & Level Loading"
Cohesion: 0.19
Nodes (30): getsfx(), I_GetSfxLumpNum(), I_InitSound(), P_LoadBlockMap(), P_LoadLineDefs(), P_LoadNodes(), P_LoadSectors(), P_LoadSegs() (+22 more)

### Community 12 - "Spawning & Randomness"
Cohesion: 0.18
Nodes (24): G_CheckSpot(), G_DeathMatchSpawnPlayer(), G_DoReborn(), P_Random(), A_BrainExplode(), A_BrainScream(), A_SpawnFly(), A_Tracer() (+16 more)

### Community 13 - "Enemy Hitscan Attacks"
Cohesion: 0.15
Nodes (22): A_CPosAttack(), A_PosAttack(), A_SPosAttack(), P_AimLineAttack(), P_ChangeSector(), P_CheckPosition(), P_HitSlideLine(), P_LineAttack() (+14 more)

### Community 14 - "Status Bar Widgets"
Cohesion: 0.14
Nodes (21): STlib_drawNum(), STlib_init(), STlib_initBinIcon(), STlib_initMultIcon(), STlib_initNum(), STlib_initPercent(), STlib_updateBinIcon(), STlib_updateMultIcon() (+13 more)

### Community 15 - "Native Sound Driver"
Cohesion: 0.08
Nodes (7): addsfx(), I_InitSound(), I_ShutdownSound(), I_SoundDelTimer(), I_SoundSetTimer(), I_StartSound(), myioctl()

### Community 16 - "Network Packet Layer"
Cohesion: 0.14
Nodes (25): D_ArbitrateNetStart(), D_CheckNetGame(), ExpandTics(), GetPackets(), HGetPacket(), HSendPacket(), NetbufferChecksum(), NetbufferSize() (+17 more)

### Community 17 - "Input Responders & Cheats"
Cohesion: 0.13
Nodes (13): F_CastResponder(), F_Responder(), G_Responder(), cht_CheckCheat(), cht_GetParam(), P_GiveAmmo(), P_GiveArmor(), P_GiveBody() (+5 more)

### Community 18 - "Map Traversal & Use"
Cohesion: 0.19
Nodes (17): FixedMul(), P_UseLines(), PTR_AimTraverse(), PTR_ShootTraverse(), PTR_SlideTraverse(), PTR_UseTraverse(), P_BlockLinesIterator(), P_BoxOnLineSide() (+9 more)

### Community 21 - "Engine Startup & Args"
Cohesion: 0.11
Nodes (21): D_AddFile(), D_DoomMain(), FindResponseFile(), IdentifyVersion(), G_RecordDemo(), G_TimeDemo(), HU_Init(), main() (+13 more)

### Community 22 - "Automap Drawing"
Cohesion: 0.18
Nodes (14): AM_clearFB(), AM_clipMline(), AM_drawCrosshair(), AM_Drawer(), AM_drawFline(), AM_drawGrid(), AM_drawLineCharacter(), AM_drawMarks() (+6 more)

### Community 23 - "Demo & Title Loop"
Cohesion: 0.16
Nodes (5): D_AdvanceDemo(), D_PageTicker(), D_StartTitle(), G_InitPlayer(), G_PlayerReborn()

### Community 24 - "Native Video Driver"
Cohesion: 0.12
Nodes (7): Expand4(), I_FinishUpdate(), I_GetEvent(), I_ShutdownGraphics(), I_StartTic(), InitExpand2(), xlatekey()

### Community 25 - "Save Files & Screenshots"
Cohesion: 0.14
Nodes (17): G_DoLoadGame(), G_DoSaveGame(), M_DrawText(), M_ReadFile(), M_ScreenShot(), M_WriteFile(), WritePCXfile(), P_AddActivePlat() (+9 more)

### Community 27 - "BSP Rendering"
Cohesion: 0.14
Nodes (12): R_AddLine(), R_CheckBBox(), R_ClearClipSegs(), R_ClearDrawSegs(), R_ClipPassWallSegment(), R_ClipSolidWallSegment(), R_RenderBSPNode(), R_Subsector() (+4 more)

### Community 29 - "Level & Game Lifecycle"
Cohesion: 0.16
Nodes (17): G_DoLoadLevel(), G_DoNewGame(), G_DoPlayDemo(), G_DoWorldDone(), G_InitNew(), G_Ticker(), P_InitSlidingDoorFrames(), P_Init() (+9 more)

### Community 30 - "Renderer Init & Tables"
Cohesion: 0.16
Nodes (13): R_AddPointToBox(), R_Init(), R_InitLightTables(), R_InitPointToAngle(), R_InitTables(), R_PointOnSegSide(), R_PointToAngle(), R_PointToDist() (+5 more)

### Community 31 - "Automap Scaling"
Cohesion: 0.17
Nodes (16): AM_activateNewScale(), AM_addMark(), AM_changeWindowScale(), AM_clearMarks(), AM_findMinMaxBoundaries(), AM_LevelInit(), AM_maxOutWindowScale(), AM_minOutWindowScale() (+8 more)

### Community 32 - "Doomy Web Engine Hooks"
Cohesion: 0.14
Nodes (7): doomy_autoguardar(), doomy_estado(), doomy_pausar(), enpartida(), I_ReadScreen(), I_SetPalette(), S_PauseSound()

### Community 33 - "Sprite & Masked Rendering"
Cohesion: 0.20
Nodes (11): R_RenderMaskedSegRange(), R_AddSprites(), R_DrawMasked(), R_DrawMaskedColumn(), R_DrawPlayerSprites(), R_DrawPSprite(), R_DrawSprite(), R_DrawVisSprite() (+3 more)

### Community 34 - "Main Loop & Tic Commands"
Cohesion: 0.17
Nodes (15): D_DoAdvanceDemo(), D_DoomLoop(), D_ProcessEvents(), CheckAbort(), NetUpdate(), TryRunTics(), G_BeginRecording(), G_BuildTiccmd() (+7 more)

### Community 35 - "Shared Definitions (comun.js)"
Cohesion: 0.19
Nodes (5): conflicto(), conflictoAlSoltar(), control(), faltaJoystick(), tieneTactil()

### Community 36 - "Emscripten Virtual FS"
Cohesion: 0.15
Nodes (11): abort(), createLazyFile(), stream_ops, forceLoadFile(), getBinarySync(), getWasmBinary(), handleSleep(), instantiateArrayBuffer() (+3 more)

### Community 37 - "Web Keyboard & Mouse Input"
Cohesion: 0.23
Nodes (7): D_PostEvent(), onkey(), onmouse(), onpointerlockchange(), pointerlocked(), xlatebuttons(), xlatekey()

### Community 38 - "Status Bar Lifecycle"
Cohesion: 0.26
Nodes (9): ST_calcPainOffset(), ST_Init(), ST_loadData(), ST_loadGraphics(), ST_Ticker(), ST_unloadData(), ST_unloadGraphics(), ST_updateFaceWidget() (+1 more)

### Community 39 - "Phone Touch Controls Docs"
Cohesion: 0.20
Nodes (10): boton-mapa, Weapon carousel (arma-anterior/siguiente), Virtual joystick (joystick-base/perilla), vista-juego (touch-only elements), Control Cambiar arma (1-7), Control Mapa (Tab), Control Moverse (Up/Down), Sensor Acelerometro (+2 more)

### Community 40 - "Lobby & Calibration UI"
Cohesion: 0.24
Nodes (8): control.html (phone controller), vista-lobby (controls/ajustes tabs, Estoy listo), vista-unirse (join room form), PC lobby (sala, QR, jugadores, tabla-controles), QR join code (qrcodejs), Lobby (Controles / Ajustes tabs), PC keyboard menu control (Esc, arrows/WASD, Enter), Comentarios Claude (v01-v03 improvements)

### Community 41 - "DOOM Licensing & History"
Cohesion: 0.20
Nodes (10): Free Software Foundation, GNU General Public License v2, Bernd Kreimeier, BSP tree rendering / environment testing, DOOM source code release (1997), John Carmack, ZeniMax Media Inc., Proyecto Doomy plays DOOM (README) (+2 more)

### Community 42 - "Automap Lifecycle"
Cohesion: 0.20
Nodes (10): AM_changeWindowLoc(), AM_doFollowPlayer(), AM_initVariables(), AM_loadPics(), AM_Start(), AM_Stop(), AM_Ticker(), AM_unloadPics() (+2 more)

### Community 43 - "Demo Recording & Quit"
Cohesion: 0.27
Nodes (9): D_QuitNetGame(), G_CheckDemoStatus(), G_CmdChecksum(), G_ReadDemoTiccmd(), G_WriteDemoTiccmd(), I_Quit(), I_WaitVBL(), M_QuitResponse() (+1 more)

### Community 44 - "Damage & Level Exit"
Cohesion: 0.22
Nodes (8): G_ExitLevel(), I_Tactile(), A_BossDeath(), A_BrainDie(), P_DamageMobj(), P_KillMobj(), P_PlayerInSpecialSector(), P_UpdateSpecials()

### Community 45 - "Texture Columns & Planes"
Cohesion: 0.25
Nodes (7): R_DrawColumnInCache(), R_GenerateComposite(), R_GetColumn(), R_DrawPlanes(), R_MakeSpans(), R_MapPlane(), R_RenderSegLoop()

### Community 46 - "Sound Channels"
Cohesion: 0.42
Nodes (6): S_AdjustSoundParams(), S_getChannel(), S_StartSoundAtVolume(), S_StopChannel(), S_StopSound(), S_UpdateSounds()

### Community 47 - "Zone Memory Allocator"
Cohesion: 0.22
Nodes (4): Z_ChangeTag2(), Z_CheckHeap(), Z_ClearZone(), Z_FileDumpHeap()

### Community 48 - "PC Game View & Pause"
Cohesion: 0.31
Nodes (7): acciones (per-player columns), DOOM canvas 320x200, index.html (PC screen), PC pausa overlay (reanudar, volver-lobby), doomy_web.c engine functions (menu state, pause, autosave), Emscripten build (build-web.sh -> doom.js/wasm/data), Topic estado (PC to phones, retained)

### Community 49 - "MQTT Broker & Topics"
Cohesion: 0.22
Nodes (7): Doomy plays DOOM (Instrucciones), EMQX Broker (wss 8084, user dommy), GitHub Pages hosting (https required for sensors), MQTT topics tacto/doomy/<SALA>/, Topic host (phones to PC: unir, elegir, soltar, listo, ping, salir LWT), Topic input ({id, c, k, d}), Topic jugador/<id> (rechazo, bienvenida, reunir)

### Community 50 - "Line of Sight"
Cohesion: 0.50
Nodes (4): P_CrossBSPNode(), P_CrossSubsector(), P_DivlineSide(), P_InterceptVector2()

### Community 51 - "Sensor Mapping & Conflicts"
Cohesion: 0.25
Nodes (5): Control Disparar (Ctrl), Control Abrir puertas / Usar (Space), Sensor Microfono (relative dB, Hz), Sensor de luz (removed), Tabla de mapeo de sensores (v03)

### Community 52 - "X11 Window Setup"
Cohesion: 0.33
Nodes (3): createnullcursor(), grabsharedmemory(), I_InitGraphics()

### Community 53 - "Palette & Screen Read"
Cohesion: 0.50
Nodes (3): I_ReadScreen(), I_SetPalette(), UploadNewPalette()

### Community 54 - "Wasm Run Lifecycle"
Cohesion: 0.40
Nodes (5): callMain(), initRuntime(), postRun(), preRun(), run()

### Community 55 - "Music & Level Transitions"
Cohesion: 0.40
Nodes (5): F_StartFinale(), G_WorldDone(), S_ChangeMusic(), S_Start(), S_StopMusic()

### Community 56 - "Bounding Boxes"
Cohesion: 0.60
Nodes (3): M_AddToBox(), M_ClearBox(), P_GroupLines()

### Community 57 - "Super Shotgun Actions"
Cohesion: 0.60
Nodes (3): A_CloseShotgun2(), A_LoadShotgun2(), A_OpenShotgun2()

### Community 58 - "Player View Setup"
Cohesion: 0.50
Nodes (4): R_RenderPlayerView(), R_SetupFrame(), R_ClearPlanes(), R_ClearSprites()

### Community 59 - "Wasm Memory Exports"
Cohesion: 0.50
Nodes (4): assignWasmExports(), getMemoryBuffer(), receiveInstance(), updateMemoryViews()

### Community 61 - "IDBFS Persistence"
Cohesion: 0.67
Nodes (3): mount(), onPersistComplete(), startPersist()

### Community 62 - "FS Sync Callback"
Cohesion: 1.00
Nodes (3): syncfs(), doCallback(), done()

## Knowledge Gaps
- **20 isolated node(s):** `Doomy plays DOOM (Instrucciones)`, `Topic host (phones to PC: unir, elegir, soltar, listo, ping, salir LWT)`, `Topic jugador/<id> (rechazo, bienvenida, reunir)`, `GitHub Pages hosting (https required for sensors)`, `Control Moverse lateralmente (turns, Left/Right)` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 372 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `I_Error()` connect `Network Packet Layer` to `Screen Display & Finale`, `Sector Specials (Doors, Ceilings)`, `Monster AI & Map Objects`, `Moving Sector Thinkers`, `Sound Lookup & Level Loading`, `Spawning & Randomness`, `Status Bar Widgets`, `Native Sound Driver`, `Input Responders & Cheats`, `Map Traversal & Use`, `Net & Player State Headers`, `Engine Startup & Args`, `Native Video Driver`, `Save Files & Screenshots`, `BSP Rendering`, `Level & Game Lifecycle`, `Automap Scaling`, `Sprite & Masked Rendering`, `Main Loop & Tic Commands`, `Demo Recording & Quit`, `Damage & Level Exit`, `Texture Columns & Planes`, `Sound Channels`, `Zone Memory Allocator`, `Line of Sight`, `X11 Window Setup`, `Music & Level Transitions`, `Bounding Boxes`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 91 inferred relationships involving `I_Error()` (e.g. with `D_DoomMain()` and `IdentifyVersion()`) actually correct?**
  _`I_Error()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Doomy plays DOOM (Instrucciones)`, `Topic host (phones to PC: unir, elegir, soltar, listo, ping, salir LWT)`, `Topic jugador/<id> (rechazo, bienvenida, reunir)` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Emscripten Runtime (doom.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.012195121951219513 - nodes in this community are weakly interconnected._
- **Why does `S_StartSound()` connect `Monster AI & Map Objects` to `Teleporters`, `Screen Display & Finale`, `Sector Specials (Doors, Ceilings)`, `Menu, Save & WAD`, `HUD Text Library`, `Player Weapon Actions`, `Finale & HUD Ticker`, `Moving Sector Thinkers`, `Demo Recording & Quit`, `Spawning & Randomness`, `Enemy Hitscan Attacks`, `Damage & Level Exit`, `Sound Channels`, `Input Responders & Cheats`, `Map Traversal & Use`, `Super Shotgun Actions`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 75 inferred relationships involving `S_StartSound()` (e.g. with `F_BunnyScroll()` and `F_CastResponder()`) actually correct?**
  _`S_StartSound()` has 75 INFERRED edges - model-reasoned connections that need verification._
- **Should `Screen Display & Finale` be split into smaller, more focused modules?**
  _Cohesion score 0.05997778600518327 - nodes in this community are weakly interconnected._