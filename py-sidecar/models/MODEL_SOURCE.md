# Face detection model

`face_detection_yunet_2023mar.onnx` — OpenCV YuNet face detector, March 2023 release.

Source: https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet

License: Apache-2.0 (per opencv_zoo).

Used by `server/faces.py` to detect faces in indexed photos. Bundled
in-repo because the 340 KB file is small and avoiding a network call on
first launch makes dev setup deterministic.
