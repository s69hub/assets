#!/usr/bin/env bash
# Checks on the final reel: format, loudness, the loop cut, and frames exactly on the big cues
# (a frame just before and the frame on each hit), plus a one-frame-per-second contact sheet.
#   bash tools/qa.sh
set -euo pipefail
cd "$(dirname "$0")/.."
F=out/appito-teaser-reel.mp4
Q=out/probe/qa; mkdir -p $Q
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_read_frames,pix_fmt,profile -of compact $F
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of compact $F
ffprobe -v error -show_entries format=duration,size,bit_rate -of compact $F
echo "loudness (EBU R128) of the muxed audio:"
ffmpeg -nostats -hide_banner -i $F -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:|LRA:" | tail -3
# frames on the hits (60 fps: frame n shows t = n/60)
for t in 0 3.75 4.0 5.983 6.0 11.983 12.0 12.5 20.983 21.0 33.983 34.0 34.983 35.0 49.983 50.0 51.0 55.983; do
  n=$(python3 -c "print(round($t*60))")
  ffmpeg -v error -y -i $F -vf "select=eq(n\,$n)" -vframes 1 $Q/f-$t.png
done
montage $Q/f-5.983.png $Q/f-6.0.png $Q/f-11.983.png $Q/f-12.0.png $Q/f-20.983.png $Q/f-21.0.png $Q/f-33.983.png $Q/f-34.0.png $Q/f-49.983.png $Q/f-50.0.png \
  -tile 10x1 -geometry 216x384+2+2 $Q/hits.png
ffmpeg -v error -y -i $F -vf "fps=1,scale=216:384,tile=14x4" -frames:v 1 $Q/sheet.png
echo "wrote $Q/hits.png and $Q/sheet.png"
