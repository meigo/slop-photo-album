<!--
  Checkerboard background indicator for empty slots (and as the
  under-photo background during in-place crop adjustment). Two-tone
  16px squares using CSS gradients — no images.
-->
<div
  class="absolute inset-0"
  style="
    background-color: #e5e5e5;
    background-image:
      linear-gradient(45deg, #cccccc 25%, transparent 25%),
      linear-gradient(-45deg, #cccccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #cccccc 75%),
      linear-gradient(-45deg, transparent 75%, #cccccc 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  "
></div>
