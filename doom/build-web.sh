#!/bin/sh
#
# Builds the web version of DOOM with Emscripten:
#   doom.js, doom.wasm and doom.data (the IWAD), loaded by index.html/main.js.
#
# Requires the Emscripten SDK (emcc) in PATH, e.g.:
#   source ~/emsdk/emsdk_env.sh
#
# Usage: ./build-web.sh [path/to/doom1.wad]

set -e

cd "$(dirname "$0")"

WAD=${1:-doom.WAD}
SRC=linuxdoom-1.10

if [ ! -f "$WAD" ]; then
    echo "IWAD not found: $WAD" >&2
    exit 1
fi

# Same objects as linuxdoom-1.10/Makefile, with the X11 / sndserver
# drivers replaced by the web ones.
FILES="doomdef doomstat dstrings i_system i_sound_web i_video_web i_net
       tables f_finale f_wipe d_main d_net d_items g_game m_menu m_misc
       m_argv m_bbox m_fixed m_swap m_cheat m_random am_map p_ceilng
       p_doors p_enemy p_floor p_inter p_lights p_map p_maputl p_plats
       p_pspr p_setup p_sight p_spec p_switch p_mobj p_telept p_tick
       p_saveg p_user r_bsp r_data r_draw r_main r_plane r_segs r_sky
       r_things w_wad wi_stuff v_video st_lib st_stuff hu_stuff hu_lib
       s_sound z_zone info sounds i_main"

SOURCES=""
for f in $FILES; do
    SOURCES="$SOURCES $SRC/$f.c"
done

# The 1997 sources are K&R-era C: build as gnu89 and silence the
# warnings modern compilers raise about it.
CFLAGS="-O2 -std=gnu89 -DNORMALUNIX -DLINUX -DIPPORT_USERRESERVED=5000
        -Wno-implicit-function-declaration -Wno-int-conversion
        -Wno-incompatible-pointer-types -Wno-pointer-sign
        -Wno-implicit-int -Wno-return-type -Wno-format
        -Wno-dangling-else -Wno-parentheses -Wno-deprecated-non-prototype
        -Wno-incompatible-library-redeclaration -Wno-shift-negative-value
        -Wno-unknown-warning-option"

# ASYNCIFY lets the original blocking game loop (D_DoomLoop) yield to
# the browser with emscripten_sleep().
LDFLAGS="-sASYNCIFY -sASYNCIFY_STACK_SIZE=65536
         -sINITIAL_MEMORY=64MB -sALLOW_MEMORY_GROWTH
         -sEXIT_RUNTIME -sINVOKE_RUN
         -sEXPORTED_RUNTIME_METHODS=UTF8ToString,FS,IDBFS,ENV,addRunDependency,removeRunDependency
         -lidbfs.js
         --preload-file $WAD@/doom1.wad"

emcc $CFLAGS $SOURCES $LDFLAGS -o doom.js

echo "Built doom.js, doom.wasm and doom.data"
echo "Serve this folder over HTTP, e.g.: python -m http.server 8000"
