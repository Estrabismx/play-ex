// Emacs style mode select   -*- C++ -*-
//-----------------------------------------------------------------------------
//
// DESCRIPTION:
//	System interface for sound, for the web (Emscripten).
//	Replaces i_sound.c and the separate sndserver process:
//	sound effects are played through the browser's WebAudio API.
//	Music is not implemented yet.
//
//-----------------------------------------------------------------------------

#include <stdio.h>

#include "z_zone.h"
#include "i_system.h"
#include "i_sound.h"
#include "m_argv.h"
#include "w_wad.h"

#include "doomdef.h"

#include <emscripten.h>

// Still referenced by the defaults table in m_misc.c.
char*	sndserver_filename = "sndserver";


//
// JavaScript side. Sound lumps are DMX format: a 8 byte header
// (format, samplerate, number of samples) followed by unsigned
// 8-bit mono samples.
//
EM_JS(void, JS_InitSound, (void), {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass)
	return;
    var audio = Module.doomAudio = {
	context: new AudioContextClass(),
	buffers: {},
	playing: {},
	nexthandle: 1
    };
    // Browsers only start audio after a user gesture.
    var resume = function () {
	if (audio.context.state === 'suspended')
	    audio.context.resume();
    };
    window.addEventListener('keydown', resume);
    window.addEventListener('mousedown', resume);
    window.addEventListener('touchstart', resume);
});

EM_JS(int, JS_StartSound, (int id, const unsigned char* data, int length,
			   int vol, int sep, int pitch), {
    var audio = Module.doomAudio;
    if (!audio || length <= 8)
	return 0;

    var buffer = audio.buffers[id];
    if (!buffer)
    {
	var rate = HEAPU8[data+2] | (HEAPU8[data+3] << 8);
	var count = Math.min(HEAPU32[(data+4) >> 2], length - 8);
	buffer = audio.context.createBuffer(1, count, rate || 11025);
	var samples = buffer.getChannelData(0);
	for (var i = 0; i < count; i++)
	    samples[i] = (HEAPU8[data + 8 + i] - 128) / 128;
	audio.buffers[id] = buffer;
    }

    var source = audio.context.createBufferSource();
    var gain = audio.context.createGain();
    var panner = audio.context.createStereoPanner
	? audio.context.createStereoPanner() : null;

    source.buffer = buffer;
    source.connect(gain);
    if (panner)
    {
	gain.connect(panner);
	panner.connect(audio.context.destination);
    }
    else
	gain.connect(audio.context.destination);

    var handle = audio.nexthandle++;
    var channel = { source: source, gain: gain, panner: panner };
    audio.playing[handle] = channel;
    Module.doomSetSoundParams(channel, vol, sep, pitch);

    source.onended = function () { delete audio.playing[handle]; };
    source.start();
    return handle;
});

EM_JS(void, JS_UpdateSoundParams, (int handle, int vol, int sep, int pitch), {
    var audio = Module.doomAudio;
    var channel = audio && audio.playing[handle];
    if (channel)
	Module.doomSetSoundParams(channel, vol, sep, pitch);
});

EM_JS(void, JS_DefineSoundParams, (void), {
    // vol: 0..127, sep: 0 (left) .. 128 (center) .. 255 (right),
    // pitch: 128 is normal, same scale as the steptable in i_sound.c.
    Module.doomSetSoundParams = function (channel, vol, sep, pitch) {
	channel.gain.gain.value = Math.max(0, Math.min(vol, 127)) / 127;
	if (channel.panner)
	    channel.panner.pan.value = Math.max(-1, Math.min((sep - 128) / 127, 1));
	channel.source.playbackRate.value = Math.pow(2, (pitch - 128) / 64);
    };
});

EM_JS(void, JS_StopSound, (int handle), {
    var audio = Module.doomAudio;
    var channel = audio && audio.playing[handle];
    if (channel)
    {
	channel.source.stop();
	delete audio.playing[handle];
    }
});

EM_JS(int, JS_SoundIsPlaying, (int handle), {
    var audio = Module.doomAudio;
    return audio && audio.playing[handle] ? 1 : 0;
});


//
// Retrieve the raw data lump index
//  for a given SFX name.
// The shareware IWAD lacks some sounds, fall back to the pistol.
//
int I_GetSfxLumpNum (sfxinfo_t* sfx)
{
    char	namebuf[9];
    int		lump;

    sprintf(namebuf, "ds%s", sfx->name);
    lump = W_CheckNumForName(namebuf);
    if (lump == -1)
	lump = W_GetNumForName("dspistol");
    return lump;
}


void I_SetChannels()
{
}


void I_SetSfxVolume(int volume)
{
    snd_SfxVolume = volume;
}


int
I_StartSound
( int		id,
  int		vol,
  int		sep,
  int		pitch,
  int		priority )
{
    sfxinfo_t*	sfx = &S_sfx[id];

    if (sfx->link)
	sfx = sfx->link;
    if (!sfx->data)
	return 0;

    return JS_StartSound(sfx - S_sfx, sfx->data, W_LumpLength(sfx->lumpnum),
			 vol, sep, pitch);
}


void I_StopSound (int handle)
{
    JS_StopSound(handle);
}


int I_SoundIsPlaying(int handle)
{
    return JS_SoundIsPlaying(handle);
}


void
I_UpdateSoundParams
( int	handle,
  int	vol,
  int	sep,
  int	pitch)
{
    JS_UpdateSoundParams(handle, vol, sep, pitch);
}


// Mixing is done by the browser.
void I_UpdateSound( void )
{
}

void I_SubmitSound(void)
{
}


void I_ShutdownSound(void)
{
}


void
I_InitSound()
{
    int		i;

    fprintf(stderr, "I_InitSound: ");

    JS_DefineSoundParams();
    JS_InitSound();

    // Cache all sound data, so I_StartSound never has to load.
    for (i=1 ; i<NUMSFX ; i++)
    {
	if (S_sfx[i].link)
	    continue;
	S_sfx[i].lumpnum = I_GetSfxLumpNum(&S_sfx[i]);
	S_sfx[i].data = W_CacheLumpNum(S_sfx[i].lumpnum, PU_STATIC);
    }
    for (i=1 ; i<NUMSFX ; i++)
	if (S_sfx[i].link)
	    S_sfx[i].data = S_sfx[i].link->data;

    fprintf(stderr, " pre-cached all sound data\n");
}


//
// MUSIC API.
// Not implemented yet: songs are accepted and silently ignored.
//
void I_InitMusic(void)		{ }
void I_ShutdownMusic(void)	{ }

static int	looping=0;
static int	musicdies=-1;

void I_SetMusicVolume(int volume)
{
    snd_MusicVolume = volume;
}

void I_PlaySong(int handle, int looping_)
{
    looping = looping_;
    musicdies = gametic + TICRATE*30;
}

void I_PauseSong (int handle)		{ }
void I_ResumeSong (int handle)		{ }

void I_StopSong(int handle)
{
    looping = 0;
    musicdies = 0;
}

void I_UnRegisterSong(int handle)	{ }

int I_RegisterSong(void* data)
{
    return 1;
}

int I_QrySongPlaying(int handle)
{
    return looping || musicdies > gametic;
}
