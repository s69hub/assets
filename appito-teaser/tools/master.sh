#!/usr/bin/env bash
# Final encode: the rendered picture (out/picture.mp4, near-lossless) + the score (music/score.wav)
# → out/appito-teaser-reel.mp4, an Instagram-ready 1080×1920 / 60 fps H.264 + AAC file.
# Also writes the score as a standalone MP3 for sharing.
#   bash tools/master.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error -i out/picture.mp4 -i music/score.wav \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -profile:v high -level 4.2 -preset slow -crf 15 -maxrate 14M -bufsize 28M \
  -pix_fmt yuv420p -r 60 -g 120 -keyint_min 60 -sc_threshold 0 -tune animation \
  -c:a aac -b:a 256k -ar 48000 -ac 2 \
  -movflags +faststart -shortest \
  -metadata title="Appito — تو فقط بگو، اپیتو می‌سازدش" \
  out/appito-teaser-reel.mp4
ffmpeg -y -loglevel error -i music/score.wav -c:a libmp3lame -b:a 320k \
  -metadata title="Appito teaser score" -metadata artist="Appito" out/appito-teaser-music.mp3
ls -la out/appito-teaser-reel.mp4 out/appito-teaser-music.mp3
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,bit_rate,sample_rate,channels -show_entries format=duration,size,bit_rate -of compact out/appito-teaser-reel.mp4
