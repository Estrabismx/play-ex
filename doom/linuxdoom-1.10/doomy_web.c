// Emacs style mode select   -*- C++ -*-
//-----------------------------------------------------------------------------
//
// DESCRIPTION:
//	Funciones que la página web (main.js) llama directamente para
//	"Doomy plays DOOM":
//	  - saber si el menú de DOOM está abierto (para que solo el PC lo use),
//	  - pausar / reanudar el juego durante la pausa general,
//	  - hacer el guardado automático al volver al lobby.
//
//	Desde JavaScript: Module._doomy_estado(), Module._doomy_pausar(1),
//	Module._doomy_autoguardar().
//
//-----------------------------------------------------------------------------

#include <string.h>
#include <emscripten.h>

#include "doomdef.h"
#include "doomstat.h"
#include "s_sound.h"

// Definidos en m_menu.c y g_game.c.
extern boolean	menuactive;
extern int	saveStringEnter;
extern int	savegameslot;
extern char	savedescription[32];
void		G_DoSaveGame (void);

#define DOOMY_MENU_ABIERTO	1	// el menú (o un mensaje Sí/No) está en pantalla
#define DOOMY_ESCRIBIENDO	2	// se está escribiendo el nombre de una partida
#define DOOMY_PAUSADO		4	// el juego está en pausa
#define DOOMY_EN_NIVEL		8	// hay una partida en curso que se puede guardar

#define DOOMY_RANURA_AUTOGUARDADO	5	// la última ranura del menú (la 6ª)


static int enpartida (void)
{
    return gamestate == GS_LEVEL && usergame && !demoplayback && !netgame;
}


EMSCRIPTEN_KEEPALIVE int doomy_estado (void)
{
    int	estado = 0;

    if (menuactive)		estado |= DOOMY_MENU_ABIERTO;
    if (saveStringEnter)	estado |= DOOMY_ESCRIBIENDO;
    if (paused)			estado |= DOOMY_PAUSADO;
    if (enpartida ())		estado |= DOOMY_EN_NIVEL;
    return estado;
}


EMSCRIPTEN_KEEPALIVE void doomy_pausar (int pausar)
{
    if (pausar && !paused)
    {
	paused = true;
	S_PauseSound ();
    }
    else if (!pausar && paused)
    {
	paused = false;
	S_ResumeSound ();
    }
}


// Guarda la partida en la ranura de autoguardado. Devuelve 1 si guardó,
// 0 si no había una partida en curso que guardar.
EMSCRIPTEN_KEEPALIVE int doomy_autoguardar (void)
{
    if (!enpartida ())
	return 0;

    savegameslot = DOOMY_RANURA_AUTOGUARDADO;
    strcpy (savedescription, "AUTOGUARDADO");
    G_DoSaveGame ();	// escribe el archivo y llama a Module.doomSyncSaves
    return 1;
}
