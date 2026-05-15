# Face detection model

`face_detection_yunet_2023mar.onnx` — OpenCV YuNet face detector, March 2023 release.

Source: https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet

License: Apache-2.0 (per opencv_zoo).

Used by `server/faces.py` to detect faces in indexed photos. Bundled
in-repo because the 340 KB file is small and avoiding a network call on
first launch makes dev setup deterministic.

## `face_recognition_sface_2021dec.onnx`

OpenCV SFace face recognizer, December 2021 release. Produces 128-dim
L2-normalized embeddings per face crop.

Source: https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface

License: Apache-2.0.

Used by `server/face_embed.py` to compute per-face embeddings for
clustering. Bundled in-repo for the same deterministic-setup reasons as
YuNet.
