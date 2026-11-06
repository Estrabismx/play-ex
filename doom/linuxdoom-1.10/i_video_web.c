// Emacs style mode select   -*- C++ -*-
//-----------------------------------------------------------------------------
//
// DESCRIPTION:
//	DOOM graphics and input for the web (Emscripten).
//	Replaces the X11 code in i_video.c: the 8-bit framebuffer is
//	expanded through the palette into RGBA and blitted to a <canvas>,
//	keyboard and mouse come from the browser's DOM events.
//
//-----------------------------------------------------------------------------

#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#include "doomstat.h"
#include "i_system.h"
#include "v_video.h"
#include "m_argv.h"
#include "d_main.h"

#include "doomdef.h"

#include <emscripten.h>
#include <emscripten/html5.h>

#define CANVAS	"#canvas"

static unsigned int	palette32[256];
static unsigned int	rgbabuffer[SCREENWIDTH*SCREENHEIGHT];
static int		mousebuttons;

extern int		usemouse;


//
// Translate a DOM KeyboardEvent.code (physical key) into a DOOM key.
// Using the physical key keeps keydown/keyup pairs consistent even
// when Shift changes the produced character.
//
static int xlatekey (const EmscriptenKeyboardEvent* e)
{
    const char*	code = e->code;

    if (!strcmp(code, "ArrowLeft"))	return KEY_LEFTARROW;
    if (!strcmp(code, "ArrowRight"))	return KEY_RIGHTARROW;
    if (!strcmp(code, "ArrowDown"))	return KEY_DOWNARROW;
    if (!strcmp(code, "ArrowUp"))	return KEY_UPARROW;
    if (!strcmp(code, "Escape"))	return KEY_ESCAPE;
    if (!strcmp(code, "Enter")
	|| !strcmp(code, "NumpadEnter"))	return KEY_ENTER;
    if (!strcmp(code, "Tab"))		return KEY_TAB;
    if (!strcmp(code, "Backspace")
	|| !strcmp(code, "Delete"))	return KEY_BACKSPACE;
    if (!strcmp(code, "Pause"))		return KEY_PAUSE;
    if (!strcmp(code, "Equal")
	|| !strcmp(code, "NumpadAdd"))	return KEY_EQUALS;
    if (!strcmp(code, "Minus")
	|| !strcmp(code, "NumpadSubtract"))	return KEY_MINUS;
    if (!strncmp(code, "Shift", 5))	return KEY_RSHIFT;
    if (!strncmp(code, "Control", 7))	return KEY_RCTRL;
    if (!strncmp(code, "Alt", 3)
	|| !strncmp(code, "Meta", 4))	return KEY_RALT;
    if (!strcmp(code, "Space"))		return ' ';
    if (!strcmp(code, "Comma"))		return ',';
    if (!strcmp(code, "Period"))	return '.';
    if (!strcmp(code, "Slash"))		return '/';
    if (!strcmp(code, "Semicolon"))	return ';';
    if (!strcmp(code, "Quote"))		return '\'';
    if (!strcmp(code, "BracketLeft"))	return '[';
    if (!strcmp(code, "BracketRight"))	return ']';
    if (!strcmp(code, "Backslash"))	return '\\';
    if (!strcmp(code, "Backquote"))	return '`';

    if (code[0] == 'F' && isdigit((unsigned char)code[1]))
    {
	switch (atoi(code+1))
	{
	  case 1:	return KEY_F1;
	  case 2:	return KEY_F2;
	  case 3:	return KEY_F3;
	  case 4:	return KEY_F4;
	  case 5:	return KEY_F5;
	  case 6:	return KEY_F6;
	  case 7:	return KEY_F7;
	  case 8:	return KEY_F8;
	  case 9:	return KEY_F9;
	  case 10:	return KEY_F10;
	  case 11:	return KEY_F11;
	  case 12:	return KEY_F12;
	}
	return 0;
    }

    if (!strncmp(code, "Key", 3) && code[3] && !code[4])
	return tolower((unsigned char)code[3]);
    if (!strncmp(code, "Digit", 5) && code[5] && !code[6])
	return code[5];
    if (!strncmp(code, "Numpad", 6) && isdigit((unsigned char)code[6]))
	return code[6];

    // Unknown physical key: fall back to the produced character.
    if (e->key[0] && !e->key[1] && e->key[0] >= ' ' && e->key[0] <= '~')
	return tolower((unsigned char)e->key[0]);

    return 0;
}


static EM_BOOL onkey (int type, const EmscriptenKeyboardEvent* e, void* user)
{
    event_t	event;

    event.data1 = xlatekey(e);
    if (!event.data1)
	return EM_FALSE;

    // Let the browser keep its own shortcuts for reload / devtools.
    if (e->ctrlKey && (!strcmp(e->code, "KeyR") || !strcmp(e->code, "F5")))
	return EM_FALSE;

    if (e->repeat && type == EMSCRIPTEN_EVENT_KEYDOWN)
	return EM_TRUE;

    event.type = (type == EMSCRIPTEN_EVENT_KEYDOWN) ? ev_keydown : ev_keyup;
    D_PostEvent(&event);
    return EM_TRUE;
}


//
// DOM buttons bitmask is left=1, right=2, middle=4;
// DOOM expects left=1, middle=2, right=4 (as the X11 driver did).
//
static int xlatebuttons (unsigned short buttons)
{
    return (buttons & 1)
	| ((buttons & 4) ? 2 : 0)
	| ((buttons & 2) ? 4 : 0);
}


static EM_BOOL pointerlocked (void)
{
    EmscriptenPointerlockChangeEvent	status;

    if (emscripten_get_pointerlock_status(&status) != EMSCRIPTEN_RESULT_SUCCESS)
	return EM_FALSE;
    return status.isActive;
}


static EM_BOOL onmouse (int type, const EmscriptenMouseEvent* e, void* user)
{
    event_t	event;

    if (!usemouse || !pointerlocked())
	return EM_FALSE;

    event.type = ev_mouse;
    event.data1 = mousebuttons = xlatebuttons(e->buttons);
    event.data2 = event.data3 = 0;

    if (type == EMSCRIPTEN_EVENT_MOUSEMOVE)
    {
	event.data2 = e->movementX << 2;
	event.data3 = -e->movementY << 2;
	if (!event.data2 && !event.data3)
	    return EM_TRUE;
    }

    D_PostEvent(&event);
    return EM_TRUE;
}


static EM_BOOL onpointerlockchange (int type,
				    const EmscriptenPointerlockChangeEvent* e,
				    void* user)
{
    event_t	event;

    // Release any buttons held when the pointer is unlocked.
    if (!e->isActive && mousebuttons)
    {
	mousebuttons = 0;
	event.type = ev_mouse;
	event.data1 = event.data2 = event.data3 = 0;
	D_PostEvent(&event);
    }
    return EM_FALSE;
}


void I_ShutdownGraphics(void)
{
}


//
// I_StartFrame
//
void I_StartFrame (void)
{
}


//
// I_StartTic
// Events are posted directly from the DOM callbacks.
//
void I_StartTic (void)
{
}


//
// I_UpdateNoBlit
//
void I_UpdateNoBlit (void)
{
}


//
// I_FinishUpdate
//
void I_FinishUpdate (void)
{
    static int	lasttic;
    int		tics;
    int		i;

    // draws little dots on the bottom of the screen
    if (devparm)
    {
	i = I_GetTime();
	tics = i - lasttic;
	lasttic = i;
	if (tics > 20) tics = 20;

	for (i=0 ; i<tics*2 ; i+=2)
	    screens[0][ (SCREENHEIGHT-1)*SCREENWIDTH + i] = 0xff;
	for ( ; i<20*2 ; i+=2)
	    screens[0][ (SCREENHEIGHT-1)*SCREENWIDTH + i] = 0x0;
    }

    for (i=0 ; i<SCREENWIDTH*SCREENHEIGHT ; i++)
	rgbabuffer[i] = palette32[screens[0][i]];

    EM_ASM({
	var ctx = Module.doomContext;
	if (!ctx)
	{
	    ctx = Module.doomContext = Module.canvas.getContext('2d');
	    Module.doomImage = ctx.createImageData($1, $2);
	}
	Module.doomImage.data.set(HEAPU8.subarray($0, $0 + $1*$2*4));
	ctx.putImageData(Module.doomImage, 0, 0);
    }, rgbabuffer, SCREENWIDTH, SCREENHEIGHT);

    // Hand control back to the browser so the frame is shown
    // and input events are delivered.
    emscripten_sleep(0);
}


//
// I_ReadScreen
//
void I_ReadScreen (byte* scr)
{
    memcpy (scr, screens[0], SCREENWIDTH*SCREENHEIGHT);
}


//
// I_SetPalette
// Pixels are stored as little-endian RGBA, as ImageData expects.
//
void I_SetPalette (byte* palette)
{
    int		i;
    int		r, g, b;

    for (i=0 ; i<256 ; i++)
    {
	r = gammatable[usegamma][*palette++];
	g = gammatable[usegamma][*palette++];
	b = gammatable[usegamma][*palette++];
	palette32[i] = 0xff000000 | (b<<16) | (g<<8) | r;
    }
}


void I_InitGraphics(void)
{
    static int	firsttime=1;

    if (!firsttime)
	return;
    firsttime = 0;

    emscripten_set_canvas_element_size(CANVAS, SCREENWIDTH, SCREENHEIGHT);

    emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, 0, 1, onkey);
    emscripten_set_keyup_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, 0, 1, onkey);

    emscripten_set_mousemove_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, 0, 1, onmouse);
    emscripten_set_mousedown_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, 0, 1, onmouse);
    emscripten_set_mouseup_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, 0, 1, onmouse);
    emscripten_set_pointerlockchange_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, 0, 1,
					      onpointerlockchange);
}
